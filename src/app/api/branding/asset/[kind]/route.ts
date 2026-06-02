/**
 * Serves admin-uploaded platform-branding images as raw binary, decoded from
 * the base64 data URL stored in PlatformBranding. Lets the marketing pages
 * reference a short, cacheable URL (e.g. /api/branding/asset/logo) instead of
 * inlining a multi-hundred-KB data URL into every page's HTML.
 *
 *   GET /api/branding/asset/logo   → PlatformBranding.logoDataUrl
 *   GET /api/branding/asset/icon   → PlatformBranding.appIconDataUrl
 *   GET /api/branding/asset/splash → PlatformBranding.splashImageDataUrl
 *
 * Anything else → 404. The allow-list is explicit so a tampered URL can't be
 * used to enumerate other columns. If the admin stored a plain hosted URL
 * (not a data URL), we 302 to it instead of decoding.
 */
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FIELD: Record<string, 'logoDataUrl' | 'appIconDataUrl' | 'splashImageDataUrl'> = {
  logo: 'logoDataUrl',
  icon: 'appIconDataUrl',
  splash: 'splashImageDataUrl',
};
const DATA_URL_RE = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/s;

export async function GET(req: Request, { params }: { params: { kind: string } }) {
  const field = FIELD[params.kind];
  if (!field) return NextResponse.json({ error: 'unknown asset' }, { status: 404 });

  const row = await prisma.platformBranding
    .findUnique({ where: { id: 'singleton' } })
    .catch(() => null);
  const value = (row?.[field] as string | undefined)?.trim() ?? '';
  if (!value) return NextResponse.json({ error: 'not set' }, { status: 404 });

  // Hosted URL rather than an inlined image → just redirect to it.
  if (!value.startsWith('data:')) return NextResponse.redirect(value, 302);

  const match = DATA_URL_RE.exec(value);
  if (!match) return NextResponse.json({ error: 'malformed asset' }, { status: 500 });

  const [, mime, b64] = match;
  const buffer = Buffer.from(b64, 'base64');
  const etag = '"' + crypto.createHash('sha1').update(buffer).digest('base64url').slice(0, 24) + '"';

  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(buffer.byteLength),
      ETag: etag,
      // Long-lived at the CDN with background revalidation; brand changes
      // still propagate within s-maxage without a redeploy.
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
