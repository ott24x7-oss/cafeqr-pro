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

  // Lazy import — keeps imapflow out of unrelated bundles.
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
    const exists = mailbox?.exists ?? 0;
    const elapsed = Date.now() - t0;
    return NextResponse.json({
      ok: true,
      user,
      inboxCount: exists,
      latencyMs: elapsed,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      user,
      error: e?.message ?? String(e),
    });
  } finally {
    try { await client.logout(); } catch {}
  }
}
