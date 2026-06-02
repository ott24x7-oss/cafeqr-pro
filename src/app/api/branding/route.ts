// Public, unauthenticated read of the platform's marketing-site branding
// overrides. Served with a short public cache so the runtime patcher
// (/js/branding.js) doesn't hammer the DB. Returns short field names that
// match the patcher's contract: { logo, brandName, tagline, footer,
// primaryColor }. All values default to empty strings — when the admin
// hasn't customised anything, the patcher leaves the static markup alone.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
// Force dynamic so the Cache-Control header is honoured by the CDN — Next
// would otherwise statically render this once at build time and serve the
// same payload until the next deploy.
export const dynamic = 'force-dynamic';

export async function GET() {
  const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
  // Emit short, cacheable endpoint URLs for image fields rather than raw
  // base64 data URLs. The runtime patcher (/js/branding.js) just assigns these
  // to src / background-image, so an endpoint URL works identically while
  // keeping the DOM from being re-inflated with hundreds of KB after hydration.
  const asset = (v: string | null | undefined, kind: 'logo' | 'icon' | 'splash') => {
    const s = v?.trim() ?? '';
    if (!s) return '';
    return s.startsWith('data:') ? `/api/branding/asset/${kind}` : s;
  };
  const body = {
    logo: asset(row?.logoDataUrl, 'logo'),
    brandName: row?.brandName ?? '',
    tagline: row?.tagline ?? '',
    footer: row?.footerText ?? '',
    primaryColor: row?.primaryColor ?? '',
    // App-mockup fields. The landing page reads them server-side (not via
    // the runtime patcher) so the icon/splash render with no flash.
    appIcon: asset(row?.appIconDataUrl, 'icon'),
    splashImage: asset(row?.splashImageDataUrl, 'splash'),
    apkUrlGoogle: row?.apkUrlGoogle ?? '',
    apkUrlAmazon: row?.apkUrlAmazon ?? '',
  };
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
