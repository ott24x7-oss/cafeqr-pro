/**
 * Auto-verify UPI payments by reading bank credit-alert emails from a Gmail
 * mailbox over IMAP.
 *
 * Strategy:
 *   1. Fetch envelopes for the last `LOOKBACK` messages by sequence (one
 *      cheap IMAP command, ~150ms). Avoids the 40-way SEARCH matrix that
 *      was being silently dropped under Gmail's command serialization.
 *   2. Filter sender + subject in JS using the built-in wallet/bank list.
 *   3. Fetch the full source only for the candidates (~5–10 typically),
 *      parse amount + UTR, and match against pending payments.
 *
 * Falls back to the PHP relay (php/imap-relay.php on ott24x7's host) when
 * the direct connect fails — usually because the host blocks outbound 993.
 */
import 'server-only';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from './prisma';
import { decrypt } from './crypto';
import { onPaymentConfirmed } from './post-payment';

// Senders that actually deliver UPI credit alerts in India today. The cafe
// owner doesn't have to know — defaults always win, no UI override.
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

const LOOKBACK = 80; // messages back from the end of INBOX to scan
// Only consider credit alerts that arrived within the last 10 minutes —
// matches the "customer just clicked 'I have paid'" UX. Anything older is a
// stale event and won't be tied to an active checkout session.
const MAX_AGE_MS = 10 * 60 * 1000;

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

function envelopeIsCandidate(from: string, subject: string): boolean {
  const f = (from || '').toLowerCase();
  const s = (subject || '').toLowerCase();
  const senderHit = DEFAULT_SENDERS.some((d) => f.includes(d.toLowerCase()));
  const subjectHit = DEFAULT_SUBJECT_KEYWORDS.some((k) => s.includes(k));
  // Permissive: a known sender alone is enough; a strong subject keyword
  // alone is also enough. The amount + UTR parser downstream rejects
  // anything that isn't actually a credit alert.
  return senderHit || subjectHit;
}

/** Sequence-based fetch + JS filter — replaces the old SEARCH matrix. */
export async function fetchInboxCreditMessages(
  client: ImapFlow,
  opts?: { lookback?: number }
): Promise<{ messages: CreditMessage[]; scanned: number; recent: { date: Date | null; from: string; subject: string }[] }> {
  const lookback = opts?.lookback ?? LOOKBACK;
  const mailbox = (await client.mailboxOpen('INBOX', { readOnly: true })) as any;
  const total = mailbox?.exists ?? 0;
  if (total === 0) return { messages: [], scanned: 0, recent: [] };

  const startSeq = Math.max(1, total - lookback + 1);
  const range = `${startSeq}:${total}`;

  // Pass 1: lightweight envelope scan.
  type EnvRow = { uid: number; date: Date; from: string; subject: string };
  const envelopes: EnvRow[] = [];
  for await (const msg of client.fetch(range, { envelope: true, uid: true })) {
    envelopes.push({
      uid: msg.uid as number,
      date: msg.envelope?.date ? new Date(msg.envelope.date as any) : new Date(),
      from: msg.envelope?.from?.[0]?.address ?? '',
      subject: msg.envelope?.subject ?? '',
    });
  }

  // Sort newest-first so we hit the freshest credit alert quickly.
  envelopes.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Only consider emails received in the last 6 hours — customers pay
  // instantly, so anything older isn't a match for an active order.
  const cutoff = Date.now() - MAX_AGE_MS;
  const recentEnvs = envelopes.filter((e) => e.date.getTime() >= cutoff);

  const candidates = recentEnvs.filter((e) => envelopeIsCandidate(e.from, e.subject));

  // Pass 2: source fetch for candidates (sequential — IMAP serializes per
  // connection anyway, so Promise.all gives no speed-up here).
  const messages: CreditMessage[] = [];
  for (const c of candidates.slice(0, 30)) {
    try {
      const msg = await client.fetchOne(String(c.uid), { source: true }, { uid: true });
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source as any);
      const text = `${parsed.subject ?? ''}\n${parsed.text ?? parsed.html ?? ''}`.replace(/<[^>]+>/g, ' ');
      messages.push({
        uid: String(c.uid),
        from: c.from,
        subject: c.subject,
        date: parsed.date ?? c.date,
        body: text,
      });
    } catch {/* skip — keep scanning */}
  }

  // Recent senders for diagnostics (top 12 newest-first, within the 6h
  // window). Falls back to the absolute newest 12 if the window is empty
  // so the diagnostic still shows something.
  const diagPool = recentEnvs.length ? recentEnvs : envelopes;
  const recent = diagPool.slice(0, 12).map((e) => ({
    date: e.date, from: e.from, subject: e.subject,
  }));

  return { messages, scanned: candidates.length, recent };
}

async function fetchDirect(opts: { user: string; pass: string }): Promise<FetchResult & { recent: { date: Date | null; from: string; subject: string }[]; inboxCount: number }> {
  const errors: string[] = [];
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
  });
  try {
    await client.connect();
    const mailbox = (await client.mailboxOpen('INBOX', { readOnly: true })) as any;
    const inboxCount = mailbox?.exists ?? 0;
    const { messages, scanned, recent } = await fetchInboxCreditMessages(client);
    return { messages, scanned, transport: 'direct', errors, recent, inboxCount };
  } finally {
    try { await client.logout(); } catch {}
  }
}

async function fetchViaRelay(opts: { user: string; pass: string }): Promise<FetchResult> {
  const errors: string[] = [];
  if (!RELAY_URL) {
    errors.push('IMAP_RELAY_URL not configured');
    return { messages: [], scanned: 0, transport: 'relay', errors };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await fetch(RELAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(RELAY_KEY ? { 'X-Api-Key': RELAY_KEY } : {}),
    },
    body: JSON.stringify({
      user: opts.user,
      pass: opts.pass,
      since: since.toISOString(),
      senders: DEFAULT_SENDERS,
      subjects: DEFAULT_SUBJECT_KEYWORDS,
      limit: 80,
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

/** Direct IMAP first, fall back to PHP relay only on network-level errors. */
async function fetchCreditMessages(opts: {
  user: string;
  pass: string;
}): Promise<FetchResult> {
  try {
    const r = await fetchDirect(opts);
    return { messages: r.messages, scanned: r.scanned, transport: 'direct', errors: r.errors };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
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
const UTR_LABELED_RE = /\b(?:utr|upi\s*ref(?:erence)?(?:\s*(?:no|number))?|ref(?:erence)?\s*(?:no|number)|order\s*id|txn\s*id|transaction\s*id)[^\w]{0,5}([A-Za-z0-9-]{9,})/i;
const UTR_LOOSE_RE  = /\b([0-9]{12,18})\b/;            // pure-numeric UTRs from many banks
const UPI_REF_RE    = /\b([A-Z]{3,5}[0-9]{6,14})\b/;   // alphanumeric IMPS / Paytm refs

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

  const windowMin = Math.max(5, cafe.settings.paymentMatchWindowMinutes ?? 30);

  const fetched = await fetchCreditMessages({ user, pass });
  result.scanned = fetched.scanned;
  result.transport = fetched.transport;
  for (const e of fetched.errors) result.errors.push(e);

  // Pre-load pending ORDERS for the cafe within the matching window. We
  // intentionally query Order rather than Payment — a fresh order has no
  // Payment row yet (one is only created when the customer types a UTR or
  // the owner manually marks paid). Looking at Payment was silently
  // returning an empty list and the matcher gave up with 0 hits even when
  // the bank email was sitting right there.
  const pendingSince = new Date(Date.now() - (windowMin + 60 * 24) * 60 * 1000);
  const pending = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      paymentStatus: { in: ['UNPAID', 'PENDING_VERIFICATION'] },
      createdAt: { gte: pendingSince },
    },
    include: { payment: true },
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
      const matchOrder = pending.find((o) => {
        // Prefer the per-order paise-nonced payable amount; fall back to
        // totalAmount for legacy rows. ±0.5 tolerance covers rare bank
        // rounding.
        const target = o.payableAmount ?? o.totalAmount;
        if (Math.abs(target - amount) > 0.5) return false;
        if (o.payment?.transactionId && o.payment.transactionId.toUpperCase() === ref.toUpperCase()) return true;
        const diffMin = (emailAt.getTime() - o.createdAt.getTime()) / 60000;
        return diffMin >= -2 && diffMin <= windowMin;
      });

      if (!matchOrder) continue;
      if (matchOrder.paymentStatus === 'PAID') continue;

      const paidAmount = matchOrder.payableAmount ?? matchOrder.totalAmount;
      const note = `Auto-verified via ${fetched.transport === 'relay' ? 'PHP relay' : 'IMAP'}`;

      await prisma.$transaction([
        prisma.payment.upsert({
          where: { orderId: matchOrder.id },
          create: {
            orderId: matchOrder.id,
            amount: paidAmount,
            method: 'upi',
            status: 'PAID',
            transactionId: ref,
            paidAt: emailAt,
            verifiedAt: new Date(),
            verifiedBy: 'gmail-auto',
            notes: note,
          },
          update: {
            status: 'PAID',
            method: 'upi',
            transactionId: ref,
            paidAt: emailAt,
            verifiedAt: new Date(),
            verifiedBy: 'gmail-auto',
            notes: note,
          },
        }),
        prisma.order.update({
          where: { id: matchOrder.id },
          data: { paymentStatus: 'PAID' },
        }),
      ]);

      result.matched += 1;
      result.matches.push({
        orderId: matchOrder.id,
        orderNumber: matchOrder.orderNumber,
        amount,
        ref,
        emailDate: emailAt.toISOString(),
      });

      onPaymentConfirmed(matchOrder.id).catch((e) =>
        result.errors.push(`post-payment ${matchOrder.id}: ${e?.message ?? e}`)
      );

      const idx = pending.indexOf(matchOrder);
      if (idx >= 0) pending.splice(idx, 1);
    } catch (e: any) {
      result.errors.push(e?.message ?? String(e));
    }
  }

  return result;
}

/** Backwards-compatible export for callers (test-imap) that imported the old
 *  search helper. The matcher itself no longer uses it. */
export async function searchInboxForCreditAlerts(
  _client: ImapFlow,
  _opts: { since: Date; senders?: string[]; subjects?: string[] }
): Promise<number[]> {
  return [];
}
