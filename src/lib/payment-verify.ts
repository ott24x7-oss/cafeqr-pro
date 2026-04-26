/**
 * Auto-verify UPI payments by reading bank credit-alert emails from a Gmail
 * mailbox over IMAP.
 *
 * The exported `verifyFromGmail()` is safe to call from a serverless API route
 * (one-shot) and from a long-running worker. It opens INBOX, fetches recent
 * messages matching the configured filters, parses amount + UTR/UPI ref, and
 * attempts to match each against pending Payment rows for the cafe.
 */
import 'server-only';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './prisma';
import { decrypt } from './crypto';

export interface VerifyResult {
  scanned: number;
  parsed: number;
  matched: number;
  matches: { orderId: string; orderNumber: string; amount: number; ref: string; emailDate: string }[];
  errors: string[];
}

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9]+(?:[,0-9]{0,3})*(?:\.[0-9]{1,2})?)/i;
const UTR_LABELED_RE = /\b(?:utr|upi\s*ref(?:erence)?(?:\s*(?:no|number))?|ref(?:erence)?\s*(?:no|number)|txn\s*id|transaction\s*id)[^\w]{0,5}([A-Za-z0-9-]{9,})/i;
const UTR_LOOSE_RE  = /\b([0-9]{12,18})\b/;            // pure-numeric UTRs from many banks
const UPI_REF_RE    = /\b([A-Z]{3,5}[0-9]{6,14})\b/;   // alphanumeric IMPS refs

function parseAmount(text: string): number | null {
  const m = text.match(AMOUNT_RE);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

function parseRef(text: string): string | null {
  const labeled = text.match(UTR_LABELED_RE);
  if (labeled) return labeled[1];
  const loose = text.match(UTR_LOOSE_RE);
  if (loose) return loose[1];
  const upi = text.match(UPI_REF_RE);
  if (upi) return upi[1];
  return null;
}

function maybeDecrypt(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v)) {
    const d = decrypt(v);
    return d || undefined;
  }
  return v;
}

export async function verifyFromGmail(cafeId: string): Promise<VerifyResult> {
  const result: VerifyResult = { scanned: 0, parsed: 0, matched: 0, matches: [], errors: [] };

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, include: { settings: true } });
  if (!cafe?.settings) {
    result.errors.push('Cafe has no settings');
    return result;
  }

  const user = cafe.settings.gmailUser;
  const pass = maybeDecrypt(cafe.settings.gmailAppPassword);
  if (!user || !pass) {
    result.errors.push('Gmail user / app password not configured');
    return result;
  }

  const senderFilter = cafe.settings.gmailSenderFilter?.trim();
  const subjectFilter = cafe.settings.gmailSubjectFilter?.trim();
  const windowMin = Math.max(5, cafe.settings.paymentMatchWindowMinutes ?? 30);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h of email

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });

    const search: any = { since };
    if (senderFilter) search.from = senderFilter;
    if (subjectFilter) search.subject = subjectFilter;
    const uids = (await client.search(search)) || [];
    result.scanned = uids.length;

    // Pre-load pending payments for the cafe within the matching window.
    const pendingSince = new Date(Date.now() - (windowMin + 60 * 24) * 60 * 1000);
    const pending = await prisma.payment.findMany({
      where: {
        order: { cafeId: cafe.id },
        status: { in: ['UNPAID', 'PENDING_VERIFICATION'] },
        createdAt: { gte: pendingSince },
      },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const uid of uids.slice(-50)) {
      try {
        const msg = await client.fetchOne(uid as any, { source: true, envelope: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source as any);
        const text = `${parsed.subject ?? ''}\n${parsed.text ?? parsed.html ?? ''}`.replace(/<[^>]+>/g, ' ');

        const amount = parseAmount(text);
        const ref = parseRef(text);
        if (amount == null || !ref) continue;
        result.parsed += 1;

        const emailAt = parsed.date ?? msg.envelope?.date ?? new Date();
        const matchPayment = pending.find((p) => {
          if (Math.abs(p.amount - amount) > 0.5) return false;
          // Already matched against this UTR — skip
          if (p.transactionId && p.transactionId.toUpperCase() === ref.toUpperCase()) return true;
          // Within match window
          const diffMin = (emailAt.getTime() - p.createdAt.getTime()) / 60000;
          return diffMin >= -2 && diffMin <= windowMin;
        });

        if (!matchPayment) continue;
        if (matchPayment.status === 'PAID') continue; // race

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: matchPayment.id },
            data: {
              status: 'PAID',
              method: 'upi',
              transactionId: ref,
              paidAt: emailAt,
              verifiedAt: new Date(),
              verifiedBy: 'gmail-auto',
              notes: 'Auto-verified from Gmail',
            },
          }),
          prisma.order.update({
            where: { id: matchPayment.orderId },
            data: { paymentStatus: 'PAID' },
          }),
        ]);

        result.matched += 1;
        result.matches.push({
          orderId: matchPayment.orderId,
          orderNumber: matchPayment.order.orderNumber,
          amount,
          ref,
          emailDate: emailAt.toISOString(),
        });
        // Avoid double-matching this email's pending row.
        const idx = pending.indexOf(matchPayment);
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
