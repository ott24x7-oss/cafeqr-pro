/**
 * Diagnostic IMAP test for the cafe's Gmail credentials.
 *
 * Tries direct IMAP for full diagnostics (inbox count, filter match count,
 * recent senders). When the direct connect fails with a network-level
 * error (Railway blocking outbound 993, etc.), falls back to the PHP relay
 * for a matched-count check so the cafe still sees something useful.
 */
import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import {
  DEFAULT_SENDERS,
  DEFAULT_SUBJECT_KEYWORDS,
  searchInboxForCreditAlerts,
} from '@/lib/payment-verify';

export const runtime = 'nodejs';
export const maxDuration = 30;

function maybeDecrypt(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v)) {
    const d = decrypt(v);
    return d || undefined;
  }
  return v;
}

interface SampleEnvelope {
  date: string | null;
  from: string;
  subject: string;
}

const RELAY_URL = process.env.IMAP_RELAY_URL || (
  process.env.PHP_MAILER_URL
    ? process.env.PHP_MAILER_URL.replace(/\/send\.php(?:[?#].*)?$/, '/imap.php')
    : 'https://ott24x7.com/mailer/imap.php'
);
const RELAY_KEY = process.env.IMAP_RELAY_KEY || '';

function isNetworkError(msg: string) {
  return /ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|getaddrinfo|self.signed|Connection.*timed/i.test(msg);
}

export async function POST() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fresh = await prisma.cafe.findUnique({
    where: { id: cafe.id },
    include: { settings: true },
  });
  const user = fresh?.settings?.gmailUser;
  const pass = maybeDecrypt(fresh?.settings?.gmailAppPassword);
  if (!user || !pass) {
    return NextResponse.json({ ok: false, error: 'Gmail user / app password not set' }, { status: 400 });
  }

  const customSender = fresh?.settings?.gmailSenderFilter?.trim() || null;
  const customSubject = fresh?.settings?.gmailSubjectFilter?.trim() || null;

  const t0 = Date.now();

  // ── Try direct IMAP for the full diagnostic.
  try {
    const { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });

    try {
      await client.connect();
      const mailbox: any = await client.mailboxOpen('INBOX', { readOnly: true });
      const inboxCount = mailbox?.exists ?? 0;
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const matchedUids = await searchInboxForCreditAlerts(client, {
        since: since24h,
        senders: customSender ? [customSender] : undefined,
        subjects: customSubject ? [customSubject] : undefined,
      });
      const filteredCount = matchedUids.length;
      const filteredSamples: SampleEnvelope[] = [];
      for (const uid of matchedUids.slice(-5)) {
        try {
          const msg = await client.fetchOne(uid as any, { envelope: true });
          if (!msg || !msg.envelope) continue;
          filteredSamples.push({
            date: msg.envelope.date ? new Date(msg.envelope.date as any).toISOString() : null,
            from: (msg.envelope.from?.[0]?.address ?? '') || '',
            subject: msg.envelope.subject ?? '',
          });
        } catch {/* ignore */}
      }

      const allUids = (await client.search({ since: since24h })) || [];
      const recent: SampleEnvelope[] = [];
      for (const uid of allUids.slice(-12)) {
        try {
          const msg = await client.fetchOne(uid as any, { envelope: true });
          if (!msg || !msg.envelope) continue;
          recent.push({
            date: msg.envelope.date ? new Date(msg.envelope.date as any).toISOString() : null,
            from: (msg.envelope.from?.[0]?.address ?? '') || '',
            subject: msg.envelope.subject ?? '',
          });
        } catch {/* ignore */}
      }

      return NextResponse.json({
        ok: true,
        transport: 'direct',
        user,
        inboxCount,
        filter: {
          sender: customSender,
          subject: customSubject,
          usingDefaults: !customSender && !customSubject,
          defaultSenders: DEFAULT_SENDERS,
          defaultSubjects: DEFAULT_SUBJECT_KEYWORDS,
        },
        filteredCount,
        filteredSamples,
        last24hCount: allUids.length,
        recent,
        latencyMs: Date.now() - t0,
      });
    } finally {
      try { await client.logout(); } catch {}
    }
  } catch (e: any) {
    const msg = e?.message ?? String(e);

    // Network error → try the PHP relay for a basic matched-count diagnostic.
    if (isNetworkError(msg)) {
      try {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const res = await fetch(RELAY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(RELAY_KEY ? { 'X-Api-Key': RELAY_KEY } : {}),
          },
          body: JSON.stringify({
            user, pass,
            since: since24h.toISOString(),
            senders: customSender ? [customSender] : undefined,
            subjects: customSubject ? [customSubject] : undefined,
            limit: 50,
          }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (res.ok && data?.ok) {
          return NextResponse.json({
            ok: true,
            transport: 'relay',
            user,
            inboxCount: data.inboxCount ?? null,
            filter: {
              sender: customSender,
              subject: customSubject,
              usingDefaults: !customSender && !customSubject,
              defaultSenders: DEFAULT_SENDERS,
              defaultSubjects: DEFAULT_SUBJECT_KEYWORDS,
            },
            filteredCount: data.matchedCount ?? 0,
            filteredSamples: (data.messages ?? []).slice(-5).map((m: any) => ({
              date: m.date, from: m.from, subject: m.subject,
            })),
            last24hCount: null,
            recent: (data.messages ?? []).slice(-12).map((m: any) => ({
              date: m.date, from: m.from, subject: m.subject,
            })),
            note: `Direct IMAP blocked from this server — used PHP relay at ${RELAY_URL} as fallback.`,
            latencyMs: Date.now() - t0,
          });
        }
        return NextResponse.json({
          ok: false,
          user,
          error: `Direct IMAP failed (${msg}); relay also failed: ${data?.error ?? res.status}`,
          relayUrl: RELAY_URL,
          latencyMs: Date.now() - t0,
        });
      } catch (e2: any) {
        return NextResponse.json({
          ok: false,
          user,
          error: `Direct IMAP failed (${msg}); relay error: ${e2?.message ?? e2}`,
          relayUrl: RELAY_URL,
          latencyMs: Date.now() - t0,
        });
      }
    }

    return NextResponse.json({
      ok: false,
      user,
      error: msg,
      latencyMs: Date.now() - t0,
    });
  }
}
