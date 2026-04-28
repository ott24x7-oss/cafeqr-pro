// Decodes the base64 image stored in MobileAppConfig and serves it as a
// regular binary HTTP response. The Android app and any browser preview
// just see /api/mobile-app/assets/logo (or splash-logo) returning a PNG /
// JPEG / WebP. Long cache + ?v= cache-buster from the config endpoint.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NAME_TO_FIELD: Record<string, 'logoData' | 'splashLogoData'> = {
  logo: 'logoData',
  'splash-logo': 'splashLogoData',
};

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i;

export async function GET(
  _req: Request,
  ctx: { params: { name: string } },
) {
  const field = NAME_TO_FIELD[ctx.params.name];
  if (!field) {
    return NextResponse.json({ error: 'Unknown asset' }, { status: 404 });
  }

  const row = await prisma.mobileAppConfig.findUnique({
    where: { id: 'singleton' },
    select: { [field]: true } as any,
  });
  const dataUrl: string = (row as any)?.[field] ?? '';
  if (!dataUrl) {
    return NextResponse.json({ error: 'Not set' }, { status: 404 });
  }

  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: 'Invalid asset data' }, { status: 500 });
  }

  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const buf = Buffer.from(match[2], 'base64');

  return new NextResponse(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(buf.length),
      // Long cache; the config endpoint changes the ?v= query when the row
      // is updated, so a new URL invalidates the device cache automatically.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
