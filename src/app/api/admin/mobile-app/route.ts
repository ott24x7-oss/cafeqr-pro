// Super-admin only read/write of the MobileAppConfig singleton. Mirrors the
// shape used by /api/admin/branding: image fields are accepted as base64
// data URLs (PNG / JPEG / WebP) up to 2 MB encoded, plain string fields are
// length-capped, color fields must be CSS hex, version code must be a
// positive integer.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMG_MAX_BYTES = 2 * 1024 * 1024;            // 2 MB encoded — matches user spec
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/i;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const schema = z.object({
  appName: z.string().max(80).optional(),
  logoData: z.string().max(IMG_MAX_BYTES + 64).optional(),
  splashLogoData: z.string().max(IMG_MAX_BYTES + 64).optional(),
  splashBackgroundColor: z.string().max(9).optional(),
  primaryColor: z.string().max(9).optional(),
  tagline: z.string().max(160).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  forceUpdate: z.boolean().optional(),
  minimumVersionCode: z.number().int().min(1).max(1_000_000).optional(),
  amazonAppstoreUrl: z.string().max(500).optional(),
  playStoreUrl: z.string().max(500).optional(),
});

function validateImage(value: string | undefined, label: string): string | null {
  if (value === undefined) return null;
  if (value === '') return null;
  if (!DATA_URL_RE.test(value)) {
    return `${label} must be a base64 data URL of type png / jpeg / webp.`;
  }
  if (value.length > IMG_MAX_BYTES) {
    return `${label} too large (limit ${Math.round(IMG_MAX_BYTES / 1024)} KB encoded).`;
  }
  return null;
}

export async function GET() {
  await requireSuperAdmin();
  const row = await prisma.mobileAppConfig.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({
    appName: row?.appName ?? 'WatShop Cafe',
    logoData: row?.logoData ?? '',
    splashLogoData: row?.splashLogoData ?? '',
    splashBackgroundColor: row?.splashBackgroundColor ?? '#0B0F14',
    primaryColor: row?.primaryColor ?? '#22C55E',
    tagline: row?.tagline ?? 'QR Ordering for Cafes',
    maintenanceMode: !!row?.maintenanceMode,
    maintenanceMessage: row?.maintenanceMessage ?? 'App is under maintenance. Please try again later.',
    forceUpdate: !!row?.forceUpdate,
    minimumVersionCode: row?.minimumVersionCode ?? 1,
    amazonAppstoreUrl: row?.amazonAppstoreUrl ?? 'https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe',
    playStoreUrl: row?.playStoreUrl ?? 'https://play.google.com/store/apps/details?id=com.watshop.cafe',
  });
}

export async function PUT(req: Request) {
  await requireSuperAdmin();

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const logoErr = validateImage(body.logoData, 'Logo');
  if (logoErr) return NextResponse.json({ error: logoErr }, { status: 400 });
  const splashErr = validateImage(body.splashLogoData, 'Splash logo');
  if (splashErr) return NextResponse.json({ error: splashErr }, { status: 400 });

  if (body.splashBackgroundColor && !COLOR_RE.test(body.splashBackgroundColor)) {
    return NextResponse.json({ error: 'splashBackgroundColor must be a CSS hex like #0B0F14.' }, { status: 400 });
  }
  if (body.primaryColor && !COLOR_RE.test(body.primaryColor)) {
    return NextResponse.json({ error: 'primaryColor must be a CSS hex like #22C55E.' }, { status: 400 });
  }
  if (body.playStoreUrl && body.playStoreUrl.length > 0) {
    try {
      const u = new URL(body.playStoreUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('proto');
    } catch {
      return NextResponse.json({ error: 'playStoreUrl must be a valid URL.' }, { status: 400 });
    }
  }
  if (body.amazonAppstoreUrl && body.amazonAppstoreUrl.length > 0) {
    try {
      const u = new URL(body.amazonAppstoreUrl);
      // Allow both the web URL (amazon.com) and the amzn:// app URI scheme.
      const ok = ['https:', 'http:', 'amzn:'].includes(u.protocol);
      if (!ok) throw new Error('proto');
    } catch {
      return NextResponse.json({ error: 'amazonAppstoreUrl must be a valid URL.' }, { status: 400 });
    }
  }

  // Build update payload, leaving image fields untouched when omitted so the
  // admin can edit text-only fields without re-uploading the logos.
  const data: Record<string, unknown> = {};
  if (body.appName !== undefined) data.appName = body.appName.slice(0, 80);
  if (body.logoData !== undefined) data.logoData = body.logoData;
  if (body.splashLogoData !== undefined) data.splashLogoData = body.splashLogoData;
  if (body.splashBackgroundColor !== undefined) data.splashBackgroundColor = body.splashBackgroundColor || '#0B0F14';
  if (body.primaryColor !== undefined) data.primaryColor = body.primaryColor || '#22C55E';
  if (body.tagline !== undefined) data.tagline = body.tagline.slice(0, 160);
  if (body.maintenanceMode !== undefined) data.maintenanceMode = body.maintenanceMode;
  if (body.maintenanceMessage !== undefined) data.maintenanceMessage = body.maintenanceMessage.slice(0, 500);
  if (body.forceUpdate !== undefined) data.forceUpdate = body.forceUpdate;
  if (body.minimumVersionCode !== undefined) data.minimumVersionCode = body.minimumVersionCode;
  if (body.amazonAppstoreUrl !== undefined) data.amazonAppstoreUrl = body.amazonAppstoreUrl.slice(0, 500);
  if (body.playStoreUrl !== undefined) data.playStoreUrl = body.playStoreUrl.slice(0, 500);

  await prisma.mobileAppConfig.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  return NextResponse.json({ ok: true });
}
