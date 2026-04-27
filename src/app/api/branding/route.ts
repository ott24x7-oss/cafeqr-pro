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
  const body = {
    logo: row?.logoDataUrl ?? '',
    brandName: row?.brandName ?? '',
    tagline: row?.tagline ?? '',
    footer: row?.footerText ?? '',
    primaryColor: row?.primaryColor ?? '',
  };
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=60',
    },
  });
}
