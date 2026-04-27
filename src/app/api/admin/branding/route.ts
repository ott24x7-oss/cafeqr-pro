// Super-admin only read/write of the platform marketing branding singleton.
// Reuses the project's `requireSuperAdmin` guard. The PUT validates that:
//   - logoDataUrl is either empty or a base64 data URL of an allowed image
//     type (svg, png, jpeg/jpg, webp) and ≤ 600 KB encoded
//   - primaryColor is either empty or a CSS hex (#rgb / #rgba / #rrggbb /
//     #rrggbbaa)
// On success the public GET /api/branding will reflect the change after
// its 60s cache window expires.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOGO_MAX_BYTES = 614400; // 600 KB encoded
const DATA_URL_RE = /^data:image\/(svg\+xml|png|jpeg|jpg|webp);base64,/;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const schema = z.object({
  logoDataUrl: z.string().max(LOGO_MAX_BYTES + 64).optional(),
  brandName: z.string().max(80).optional(),
  tagline: z.string().max(200).optional(),
  footerText: z.string().max(200).optional(),
  primaryColor: z.string().max(9).optional(),
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

  // Logo: empty clears, otherwise must match data URL format + size cap.
  if (body.logoDataUrl && body.logoDataUrl.length > 0) {
    if (!DATA_URL_RE.test(body.logoDataUrl)) {
      return NextResponse.json(
        { error: 'Logo must be a base64 data URL of type svg / png / jpeg / webp.' },
        { status: 400 },
      );
    }
    if (body.logoDataUrl.length > LOGO_MAX_BYTES) {
      return NextResponse.json(
        { error: `Logo too large (limit ${Math.round(LOGO_MAX_BYTES / 1024)} KB).` },
        { status: 413 },
      );
    }
  }

  // Color: empty clears, otherwise must be a CSS hex.
  if (body.primaryColor && body.primaryColor.length > 0) {
    if (!COLOR_RE.test(body.primaryColor)) {
      return NextResponse.json(
        { error: 'Primary color must be a CSS hex like #6B4E3D.' },
        { status: 400 },
      );
    }
  }

  const data = {
    logoDataUrl: body.logoDataUrl ?? '',
    brandName: (body.brandName ?? '').slice(0, 80),
    tagline: (body.tagline ?? '').slice(0, 200),
    footerText: (body.footerText ?? '').slice(0, 200),
    primaryColor: (body.primaryColor ?? '').slice(0, 9),
  };

  await prisma.platformBranding.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  return NextResponse.json({ ok: true });
}
