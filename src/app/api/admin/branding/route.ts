// Super-admin only read/write of the platform marketing branding singleton.
// Reuses the project's `requireSuperAdmin` guard. The PUT validates that:
//   - logoDataUrl + appIconDataUrl + splashImageDataUrl are either empty
//     or a base64 data URL of an allowed image type (svg, png, jpeg/jpg,
//     webp). Logo + appIcon are capped at 600 KB encoded; splash gets a
//     larger 1.2 MB cap because it's a full-screen mockup.
//   - primaryColor is either empty or a CSS hex (#rgb / #rgba / #rrggbb /
//     #rrggbbaa)
//   - apkUrlGoogle + apkUrlAmazon are URLs (or empty); we accept absolute
//     URLs and same-origin paths starting with `/` so a self-hosted file
//     under public/downloads also works.
// On success the public GET /api/branding will reflect the change after
// its 60s cache window expires.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOGO_MAX_BYTES = 614400;     // 600 KB encoded — for logo + app icon
const SPLASH_MAX_BYTES = 1258291;  // 1.2 MB encoded — splash gets more headroom
const DATA_URL_RE = /^data:image\/(svg\+xml|png|jpeg|jpg|webp);base64,/;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;

const schema = z.object({
  logoDataUrl: z.string().max(LOGO_MAX_BYTES + 64).optional(),
  brandName: z.string().max(80).optional(),
  tagline: z.string().max(200).optional(),
  footerText: z.string().max(200).optional(),
  primaryColor: z.string().max(9).optional(),
  appIconDataUrl: z.string().max(LOGO_MAX_BYTES + 64).optional(),
  splashImageDataUrl: z.string().max(SPLASH_MAX_BYTES + 64).optional(),
  apkUrlGoogle: z.string().max(500).optional(),
  apkUrlAmazon: z.string().max(500).optional(),
});

export async function GET() {
  await requireSuperAdmin();
  const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
  return NextResponse.json({
    logoDataUrl: row?.logoDataUrl ?? '',
    brandName: row?.brandName ?? '',
    tagline: row?.tagline ?? '',
    footerText: row?.footerText ?? '',
    primaryColor: row?.primaryColor ?? '',
    appIconDataUrl: row?.appIconDataUrl ?? '',
    splashImageDataUrl: row?.splashImageDataUrl ?? '',
    apkUrlGoogle: row?.apkUrlGoogle ?? '',
    apkUrlAmazon: row?.apkUrlAmazon ?? '',
  });
}

function validateImage(value: string | undefined, max: number, label: string) {
  if (!value || value.length === 0) return null;
  if (!DATA_URL_RE.test(value)) {
    return `${label} must be a base64 data URL of type svg / png / jpeg / webp.`;
  }
  if (value.length > max) {
    return `${label} too large (limit ${Math.round(max / 1024)} KB).`;
  }
  return null;
}

function validateUrl(value: string | undefined, label: string) {
  if (!value || value.length === 0) return null;
  if (!URL_RE.test(value)) {
    return `${label} must be a URL (https://... or /downloads/...).`;
  }
  return null;
}

export async function PUT(req: Request) {
  await requireSuperAdmin();

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const errors: string[] = [];
  const logoErr = validateImage(body.logoDataUrl, LOGO_MAX_BYTES, 'Logo');
  if (logoErr) errors.push(logoErr);
  const iconErr = validateImage(body.appIconDataUrl, LOGO_MAX_BYTES, 'App icon');
  if (iconErr) errors.push(iconErr);
  const splashErr = validateImage(body.splashImageDataUrl, SPLASH_MAX_BYTES, 'Splash image');
  if (splashErr) errors.push(splashErr);
  const apkGoogleErr = validateUrl(body.apkUrlGoogle, 'Google APK URL');
  if (apkGoogleErr) errors.push(apkGoogleErr);
  const apkAmazonErr = validateUrl(body.apkUrlAmazon, 'Amazon APK URL');
  if (apkAmazonErr) errors.push(apkAmazonErr);

  if (body.primaryColor && body.primaryColor.length > 0 && !COLOR_RE.test(body.primaryColor)) {
    errors.push('Primary color must be a CSS hex like #6B4E3D.');
  }

  if (errors.length) {
    const status = errors[0].includes('too large') ? 413 : 400;
    return NextResponse.json({ error: errors.join(' ') }, { status });
  }

  const data = {
    logoDataUrl: body.logoDataUrl ?? '',
    brandName: (body.brandName ?? '').slice(0, 80),
    tagline: (body.tagline ?? '').slice(0, 200),
    footerText: (body.footerText ?? '').slice(0, 200),
    primaryColor: (body.primaryColor ?? '').slice(0, 9),
    appIconDataUrl: body.appIconDataUrl ?? '',
    splashImageDataUrl: body.splashImageDataUrl ?? '',
    apkUrlGoogle: (body.apkUrlGoogle ?? '').slice(0, 500),
    apkUrlAmazon: (body.apkUrlAmazon ?? '').slice(0, 500),
  };

  await prisma.platformBranding.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  return NextResponse.json({ ok: true });
}
