/**
 * Serves admin-uploaded brand images as raw binary so the Android app's
 * Glide loader can fetch them like any HTTP image. The base64 data URL
 * stored in PlatformBranding is decoded on the fly.
 *
 * Routes:
 *   GET /api/mobile-app/assets/logo    → PlatformBranding.logoDataUrl
 *   GET /api/mobile-app/assets/splash  → PlatformBranding.appIconDataUrl
 *                                        (falls back to logoDataUrl)
 *
 * Anything else → 404. We keep the allow-list explicit so a tampered URL
 * can't be used to enumerate other columns.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['logo', 'splash']);
const DATA_URL_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/;

export async function GET(
  _req: Request,
  { params }: { params: { name: string } },
) {
  if (!ALLOWED.has(params.name)) {
    return NextResponse.json({ error: 'unknown asset' }, { status: 404 });
  }

  const row = await prisma.platformBranding.findUnique({
    where: { id: 'singleton' },
  }).catch(() => null);

  let dataUrl = '';
  if (params.name === 'logo') {
    dataUrl = row?.logoDataUrl ?? '';
  } else if (params.name === 'splash') {
    dataUrl = row?.appIconDataUrl?.trim() || row?.logoDataUrl?.trim() || '';
  }

  if (!dataUrl) {
    return NextResponse.json({ error: 'not set' }, { status: 404 });
  }

  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    return NextResponse.json({ error: 'malformed asset' }, { status: 500 });
  }

  const [, mime, b64] = match;
  const buffer = Buffer.from(b64, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(buffer.byteLength),
      // Cache for 5 minutes at the edge — covers most app-launch bursts
      // while still letting brand changes propagate without redeploying.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
