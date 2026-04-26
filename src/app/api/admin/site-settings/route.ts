import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';
import { getSiteSettings, invalidateSiteSettingsCache } from '@/lib/site-settings';
import { encrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SENTINEL = '__unchanged__';
const ENCRYPTED_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

const schema = z.object({
  siteName: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  supportEmail: z.string().nullable().optional(),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPass: z.string().nullable().optional(),
  smtpFrom: z.string().nullable().optional(),
  content: z.record(z.any()).nullable().optional(),
});

export async function GET() {
  await requireSuperAdmin();
  const s = await getSiteSettings({ fresh: true });
  // Mask the password — client just sees a sentinel and only sends it back
  // when the user actually types a new one.
  return NextResponse.json({
    ...s,
    smtpPass: s.smtpPass ? SENTINEL : '',
  });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const data: any = {};
  if (body.siteName !== undefined) data.siteName = body.siteName;
  if (body.tagline !== undefined) data.tagline = body.tagline;
  if (body.supportEmail !== undefined) data.supportEmail = body.supportEmail;
  if (body.smtpHost !== undefined) data.smtpHost = body.smtpHost;
  if (body.smtpPort !== undefined) data.smtpPort = body.smtpPort;
  if (body.smtpUser !== undefined) data.smtpUser = body.smtpUser;
  if (body.smtpFrom !== undefined) data.smtpFrom = body.smtpFrom;
  if (body.content !== undefined) data.content = body.content;

  // SMTP password — encrypt on write, leave alone when SENTINEL.
  if (body.smtpPass !== undefined) {
    if (body.smtpPass === SENTINEL) {
      // no-op
    } else if (body.smtpPass === null || body.smtpPass === '') {
      data.smtpPass = null;
    } else if (ENCRYPTED_RE.test(body.smtpPass)) {
      data.smtpPass = body.smtpPass; // already encrypted (round-trip)
    } else {
      data.smtpPass = encrypt(body.smtpPass);
    }
  }

  data.updatedBy = session.user.email;

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', siteName: 'CafeQR Pro', ...data },
  });
  invalidateSiteSettingsCache();

  return NextResponse.json({ ok: true });
}
