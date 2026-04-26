/**
 * Diagnostic IMAP test for the cafe's Gmail credentials.
 *
 * Returns:
 *   - connection ok / error
 *   - INBOX message count
 *   - count and samples of messages matching the cafe's sender + subject filters
 *   - sample senders + subjects from the last 24h (no filter) so the cafe owner
 *     can see what the bank actually sends from and pick the right filter
 *   - total time taken
 */
import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

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

  const senderFilter = fresh?.settings?.gmailSenderFilter?.trim() || null;
  const subjectFilter = fresh?.settings?.gmailSubjectFilter?.trim() || null;

  const { ImapFlow } = await import('imapflow');
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const t0 = Date.now();
  try {
    await client.connect();
    const mailbox: any = await client.mailboxOpen('INBOX', { readOnly: true });
    const inboxCount = mailbox?.exists ?? 0;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Filtered scan — what the verifier actually sees.
    let filteredCount = 0;
    const filteredSamples: SampleEnvelope[] = [];
    if (senderFilter || subjectFilter) {
      const search: any = { since: since24h };
      if (senderFilter) search.from = senderFilter;
      if (subjectFilter) search.subject = subjectFilter;
      const uids = (await client.search(search)) || [];
      filteredCount = uids.length;
      const lastFew = uids.slice(-5);
      for (const uid of lastFew) {
        try {
          const msg = await client.fetchOne(uid as any, { envelope: true });
          if (!msg?.envelope) continue;
          filteredSamples.push({
            date: msg.envelope.date ? new Date(msg.envelope.date as any).toISOString() : null,
            from: (msg.envelope.from?.[0]?.address ?? '') || '',
            subject: msg.envelope.subject ?? '',
          });
        } catch {/* ignore */}
      }
    }

    // 2. Unfiltered last-24h sample so the owner can see who's sending.
    const allUids = (await client.search({ since: since24h })) || [];
    const recent: SampleEnvelope[] = [];
    for (const uid of allUids.slice(-12)) {
      try {
        const msg = await client.fetchOne(uid as any, { envelope: true });
        if (!msg?.envelope) continue;
        recent.push({
          date: msg.envelope.date ? new Date(msg.envelope.date as any).toISOString() : null,
          from: (msg.envelope.from?.[0]?.address ?? '') || '',
          subject: msg.envelope.subject ?? '',
        });
      } catch {/* ignore */}
    }

    return NextResponse.json({
      ok: true,
      user,
      inboxCount,
      filter: { sender: senderFilter, subject: subjectFilter },
      filteredCount,
      filteredSamples,
      last24hCount: allUids.length,
      recent,
      latencyMs: Date.now() - t0,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      user,
      error: e?.message ?? String(e),
      latencyMs: Date.now() - t0,
    });
  } finally {
    try { await client.logout(); } catch {}
  }
}
