/**
 * Auto-verify UPI payments by reading bank credit-alert emails from a Gmail
 * mailbox over IMAP.
 *
 * Two transports are available; the matcher tries them in this order:
 *   1. Direct IMAP from the Next.js process (`imapflow` over TLS to
 *      imap.gmail.com:993).
 *   2. PHP relay (`IMAP_RELAY_URL`) — used as a fallback when (1) fails to
 *      connect, e.g. because the host blocks outbound 993. The relay is a
 *      small PHP script (see `php/imap-relay.php`) that you can drop on a
 *      shared host that does have IMAP outbound, alongside the existing
 *      send.php mailer.
 */
import 'server-only';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './prisma';
import { decrypt } from './crypto';
import { onPaymentConfirmed } from './post-payment';

// Defaults applied when the cafe hasn't customised the filters. These cover
// the senders that actually deliver UPI credit alerts in India today —
// wallets, neobanks and the major banks. Hidden from the dashboard so the
// owner doesn't have to maintain them.
export const DEFAULT_SENDERS: string[] = [
  'no-reply@paytm.com',
  'noreply@paytm.com',
  'business@paytm.com',
  'no-reply@phonepe.com',
  'noreply@phonepe.com',
  'googlepay-noreply@google.com',
  'alerts@hdfcbank.net',
  'alerts@axisbank.com',
  'donotreply.sbiatm@alerts.sbi.co.in',
  'alerts@icicibank.com',
];

export const DEFAULT_SUBJECT_KEYWORDS: string[] = [
  'paid',
  'received',
  'deposit',
  'credit',
];

const RELAY_URL = process.env.IMAP_RELAY_URL || (
  process.env.PHP_MAILER_URL
    ? process.env.PHP_MAILER_URL.replace(/\/send\.php(?:[?#].*)?$/, '/imap.php')
    : 'https://ott24x7.com/mailer/imap.php'
);
const RELAY_KEY = process.env.IMAP_RELAY_KEY || '';

interface CreditMessage {
  uid?: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
}

interface FetchResult {
  messages: CreditMessage[];
  scanned: number;
  transport: 'direct' | 'relay';
  errors: string[];
}

/** Run senders × subjects matrix searches in parallel and union the UIDs. */
export async function searchInboxForCreditAlerts(
  client: ImapFlow,
  opts: { since: Date; senders?: string[]; subjects?: string[] }
): Promise<number[]> {
  const senders = (opts.senders && opts.senders.length ? opts.senders : DEFAULT_SENDERS);
  const subjects = (opts.subjects && opts.subjects.length ? opts.subjects : DEFAULT_SUBJECT_KEYWORDS);

  const queries: Promise<number[]>[] = [];
  for (const from of senders) {
    for (const subject of subjects) {
      queries.push(
        client.search({ since: opts.since, from, subject } as any).then(
          (r) => (r || []).map((u: any) => Number(u)),
          () => [] as number[]
        )
      );
    }
  }
  const results = await Promise.all(queries);
  const merged = new Set<number>();
  for (const arr of results) for (const u of arr) merged.add(u);
  return [...merged].sort((a, b) => a - b);
}

async function fetchDirect(opts: {
  user: string;
  pass: string;
  since: Date;
  senders?: string[];
  subjects?: string[];
}): Promise<FetchResult> {
  const errors: string[] = [];
  const messages: CreditMessage[] = [];
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
  });
  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });

    const uids = await searchInboxForCreditAlerts(client, {
      since: opts.since,
      senders: opts.senders,
      subjects: opts.subjects,
    });

    for (const uid of uids.slice(-50)) {
      try {
        const msg = await client.fetchOne(uid as any, { source: true, envelope: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source as any);
        const body = `${parsed.subject ?? ''}\n${parsed.text ?? parsed.html ?? ''}`.replace(/<[^>]+>/g, ' ');
        messages.push({
          uid: String(uid),
          from: parsed.from?.value?.[0]?.address ?? '',
          subject: parsed.subject ?? '',
          date: parsed.date ?? msg.envelope?.date ?? new Date(),
          body,
        });
      } catch (e: any) {
        errors.push(e?.message ?? String(e));
      }
    }
    return { messages, scanned: uids.length, transport: 'direct', errors };
  } finally {
    try { await client.logout(); } catch {}
  }
}

async function fetchViaRelay(opts: {
  user: string;
  pass: string;
  since: Date;
  senders?: string[];
  subjects?: string[];
}): Promise<FetchResult> {
  const errors: string[] = [];
  if (!RELAY_URL) {
    errors.push('IMAP_RELAY_URL not configured');
    return { messages: [], scanned: 0, transport: 'relay', errors };
  }

  const res = await fetch(RELAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(RELAY_KEY ? { 'X-Api-Key': RELAY_KEY } : {}),
    },
    body: JSON.stringify({
      user: opts.user,
      pass: opts.pass,
      since: opts.since.toISOString(),
      senders: opts.senders,
      subjects: opts.subjects,
      limit: 50,
    }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data?.ok) {
    errors.push(`relay error ${res.status}: ${data?.error ?? 'unknown'}`);
    return { messages: [], scanned: 0, transport: 'relay', errors };
  }
  const messages: CreditMessage[] = (data.messages ?? []).map((m: any) => ({
    uid: m.uid,
    from: m.from ?? '',
    subject: m.subject ?? '',
    date: m.date ? new Date(m.date) : new Date(),
    body: m.body ?? '',
  }));
  return { messages, scanned: data.matchedCount ?? messages.length, transport: 'relay', errors };
}

/** Direct IMAP first, fall back to PHP relay if the connect fails. */
async function fetchCreditMessages(opts: {
  user: string;
  pass: string;
  since: Date;
  senders?: string[];
  subjects?: string[];
}): Promise<FetchResult> {
  try {
    return await fetchDirect(opts);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    // Connection-level failures only — credential / search errors should
    // surface as-is.
    const looksBlocked = /ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|getaddrinfo|self.signed|Connection.*timed/i.test(msg);
    if (!looksBlocked) {
      return { messages: [], scanned: 0, transport: 'direct', errors: [msg] };
    }
    const relay = await fetchViaRelay(opts);
    relay.errors.unshift(`direct imap failed (${msg}); used relay fallback`);
    return relay;
  }
}

export interface VerifyResult {
  scanned: number;
  parsed: number;
  matched: number;
  matches: { orderId: string; orderNumber: string; amount: number; ref: string; emailDate: string }[];
  errors: string[];
  transport?: 'direct' | 'relay';
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

  const customSender = cafe.settings.gmailSenderFilter?.trim();
  const customSubject = cafe.settings.gmailSubjectFilter?.trim();
  const windowMin = Math.max(5, cafe.settings.paymentMatchWindowMinutes ?? 30);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h of email

  const fetched = await fetchCreditMessages({
    user, pass, since,
    senders: customSender ? [customSender] : undefined,
    subjects: customSubject ? [customSubject] : undefined,
  });
  result.scanned = fetched.scanned;
  result.transport = fetched.transport;
  for (const e of fetched.errors) result.errors.push(e);

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

  for (const m of fetched.messages) {
    try {
      const text = m.body;
      const amount = parseAmount(text);
      const ref = parseRef(text);
      if (amount == null || !ref) continue;
      result.parsed += 1;

      const emailAt = m.date;
      const matchPayment = pending.find((p) => {
        if (Math.abs(p.amount - amount) > 0.5) return false;
        if (p.transactionId && p.transactionId.toUpperCase() === ref.toUpperCase()) return true;
        const diffMin = (emailAt.getTime() - p.createdAt.getTime()) / 60000;
        return diffMin >= -2 && diffMin <= windowMin;
      });

      if (!matchPayment) continue;
      if (matchPayment.status === 'PAID') continue;

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
            notes: `Auto-verified via ${fetched.transport === 'relay' ? 'PHP relay' : 'IMAP'}`,
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

      onPaymentConfirmed(matchPayment.orderId).catch((e) =>
        result.errors.push(`post-payment ${matchPayment.orderId}: ${e?.message ?? e}`)
      );

      const idx = pending.indexOf(matchPayment);
      if (idx >= 0) pending.splice(idx, 1);
    } catch (e: any) {
      result.errors.push(e?.message ?? String(e));
    }
  }

  return result;
}
