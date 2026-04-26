import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/guards';
import { getSiteSettings } from '@/lib/site-settings';
import { sendMail, verifySmtp } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  await requireSuperAdmin();

  const body = await req.json().catch(() => ({} as any));
  const action: 'verify' | 'send' = body.action === 'send' ? 'send' : 'verify';

  const s = await getSiteSettings({ fresh: true });
  if (!s.smtpHost || !s.smtpUser || !s.smtpPass) {
    return NextResponse.json({ ok: false, error: 'SMTP not fully configured (host/user/pass).' }, { status: 400 });
  }

  if (action === 'verify') {
    const r = await verifySmtp({
      host: s.smtpHost!,
      port: s.smtpPort ?? 587,
      user: s.smtpUser!,
      pass: s.smtpPass!,
      from: s.smtpFrom ?? undefined,
    });
    return NextResponse.json(r);
  }

  // action === 'send'
  const to = (body.to as string | undefined) || s.supportEmail || s.smtpUser!;
  const result = await sendMail({
    to,
    subject: `${s.siteName} — SMTP test`,
    html: `<p>This is a test email from <b>${s.siteName}</b>.</p><p>Sent at ${new Date().toISOString()}.</p>`,
    text: `Test email from ${s.siteName} at ${new Date().toISOString()}`,
  });
  return NextResponse.json({ ...result, to });
}
