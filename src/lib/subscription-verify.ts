/**
 * Auto-verify subscription payments by reading the PLATFORM's Gmail inbox.
 *
 * Mirror of `verifyFromGmail` (which is per-cafe) but scoped to the SaaS
 * owner's Gmail credentials stored in SiteSettings. Matches incoming UPI
 * credit alerts against pending Subscription rows by paise-nonced
 * `payableAmount`, flips the row to `active` and rolls the cafe's plan +
 * planEndsAt forward in a single transaction.
 *
 * Reuses `fetchInboxCreditMessages` so the matcher behaviour stays in lock
 * step with the cafe-side flow (sequence-based fetch, JS sender/subject
 * filter, 10-min freshness window).
 */
import { ImapFlow } from 'imapflow';
import { prisma } from './prisma';
import { fetchInboxCreditMessages } from './payment-verify';
import { getSiteSettings } from './site-settings';

export interface SubVerifyResult {
  scanned: number;
  parsed: number;
  matched: number;
  matches: { subscriptionId: string; cafeId: string; planId: string; amount: number; ref: string }[];
  errors: string[];
  transport: 'direct' | 'relay' | 'skipped';
}

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9]+(?:[,0-9]{0,3})*(?:\.[0-9]{1,2})?)/i;
const UTR_LABELED_RE = /\b(?:utr|upi\s*ref(?:erence)?(?:\s*(?:no|number))?|ref(?:erence)?\s*(?:no|number)|order\s*id|txn\s*id|transaction\s*id)[^\w]{0,5}([A-Za-z0-9-]{9,})/i;
const UTR_LOOSE_RE  = /\b([0-9]{12,18})\b/;
const UPI_REF_RE    = /\b([A-Z]{3,5}[0-9]{6,14})\b/;

function parseAmount(text: string): number | null {
  const m = text.match(AMOUNT_RE);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}
function parseRef(text: string): string | null {
  return text.match(UTR_LABELED_RE)?.[1]
      ?? text.match(UTR_LOOSE_RE)?.[1]
      ?? text.match(UPI_REF_RE)?.[1]
      ?? null;
}

export async function verifyPlatformSubscriptions(): Promise<SubVerifyResult> {
  const result: SubVerifyResult = {
    scanned: 0, parsed: 0, matched: 0, matches: [], errors: [], transport: 'skipped',
  };

  const site = await getSiteSettings({ fresh: true });
  const user = site.platformGmailUser;
  const pass = site.platformGmailAppPassword;
  if (!user || !pass) {
    result.errors.push('Platform Gmail not configured (Super Admin → Site → Platform Payment).');
    return result;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const { messages, scanned } = await fetchInboxCreditMessages(client);
    result.scanned = scanned;
    result.transport = 'direct';

    const pending = await prisma.subscription.findMany({
      where: { status: 'pending', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    for (const m of messages) {
      try {
        const text = m.body;
        const amount = parseAmount(text);
        const ref = parseRef(text);
        if (amount == null || !ref) continue;
        result.parsed += 1;

        const target = pending.find((s) => {
          const want = s.payableAmount ?? s.amount;
          return Math.abs(want - amount) <= 0.5;
        });
        if (!target) continue;
        if (target.status !== 'pending') continue;

        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + (target.billing === 'yearly' ? 365 : 30) * 86400000);

        await prisma.$transaction([
          // Activate this subscription
          prisma.subscription.update({
            where: { id: target.id },
            data: {
              status: 'active',
              paidAt: m.date,
              transactionId: ref,
              startsAt,
              endsAt,
            },
          }),
          // Expire any other active subs for the same cafe so we don't stack
          prisma.subscription.updateMany({
            where: { cafeId: target.cafeId, status: 'active', id: { not: target.id } },
            data: { status: 'expired' },
          }),
          // Roll the cafe's plan + status forward
          prisma.cafe.update({
            where: { id: target.cafeId },
            data: { planId: target.planId, status: 'ACTIVE', planEndsAt: endsAt },
          }),
          // Notification for the cafe owner
          prisma.notification.create({
            data: {
              cafeId: target.cafeId,
              kind: 'PAYMENT',
              title: `Plan upgraded to ${target.plan.name}`,
              body: `Subscription paid (₹${amount.toFixed(2)} · UTR ${ref}). Renews ${endsAt.toDateString()}.`,
              link: '/dashboard/billing',
            },
          }),
        ]);

        result.matched += 1;
        result.matches.push({
          subscriptionId: target.id,
          cafeId: target.cafeId,
          planId: target.planId,
          amount,
          ref,
        });

        // Avoid double-matching against the same email body.
        const idx = pending.indexOf(target);
        if (idx >= 0) pending.splice(idx, 1);
      } catch (e: any) {
        result.errors.push(e?.message ?? String(e));
      }
    }
  } catch (e: any) {
    result.errors.push(e?.message ?? String(e));
  } finally {
    try { await client.logout(); } catch {}
  }

  return result;
}
