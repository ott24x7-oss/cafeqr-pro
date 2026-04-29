/**
 * Public read endpoint consumed by the WatShop Cafe Android companion
 * (com.watshop.cafe). On launch the app fetches this JSON, caches it on
 * disk and uses it to:
 *   - paint the splash + in-app brand
 *   - decide whether to gate behind maintenance / force-update screens
 *   - know which app-store URL to open from "Update now"
 *
 * Source-of-truth strategy: branding values come from PlatformBranding
 * (the same singleton that drives the marketing site, edited at
 * /admin/branding) so the SaaS owner only manages branding in one place.
 * App-only knobs (maintenance, version gating, store URLs) come from
 * MobileAppConfig if present, falling back to bundle-safe defaults.
 *
 * Logo binaries are served via /api/mobile-app/assets/[name] so the app's
 * Glide image pipeline gets a regular HTTP URL instead of a data URL
 * (Glide doesn't decode data URLs out of the box).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_URL = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
const FALLBACK_AMAZON_URL = 'https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe';
const FALLBACK_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.watshop.cafe';

// Build an absolute URL when we know our own origin (prod / staging) so
// the Android Glide loader doesn't need to know the base URL itself.
function abs(path: string): string {
  if (!path.startsWith('/')) return path;
  return APP_URL ? `${APP_URL}${path}` : path;
}

export async function GET() {
  const [branding, mobile] = await Promise.all([
    prisma.platformBranding.findUnique({ where: { id: 'singleton' } }).catch(() => null),
    // MobileAppConfig table exists from migration 20260429120000 even
    // though its admin UI was removed; keep the read here in case someone
    // seeded a row directly. The findFirst handles the case where the
    // singleton row hasn't been inserted yet.
    prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "MobileAppConfig" WHERE "id" = 'singleton' LIMIT 1`,
    ).catch(() => [] as any[]),
  ]);

  const m = (mobile ?? [])[0] ?? {};
  const hasLogo = !!branding?.logoDataUrl;
  const hasSplash = !!branding?.appIconDataUrl;

  const body = {
    appName: branding?.brandName?.trim() || m.appName || 'WatShop Cafe',
    // Empty string when no admin upload — the Android app already has a
    // bundled fallback for that case (see AppConfig.DEFAULT). When set,
    // point at our binary serve endpoint so Glide loads PNG/SVG bytes.
    logoUrl: hasLogo ? abs('/api/mobile-app/assets/logo') : '',
    splashLogoUrl: hasSplash
      ? abs('/api/mobile-app/assets/splash')
      : (hasLogo ? abs('/api/mobile-app/assets/logo') : ''),
    splashBackgroundColor: m.splashBackgroundColor || branding?.primaryColor?.trim() || '#3E2D24',
    primaryColor: branding?.primaryColor?.trim() || m.primaryColor || '#6B4E3D',
    tagline: branding?.tagline?.trim() || m.tagline || 'QR Ordering for Cafes',
    maintenanceMode: Boolean(m.maintenanceMode ?? false),
    maintenanceMessage: m.maintenanceMessage || 'App is under maintenance. Please try again later.',
    forceUpdate: Boolean(m.forceUpdate ?? false),
    minimumVersionCode: Number(m.minimumVersionCode ?? 1),
    amazonAppstoreUrl: branding?.apkUrlAmazon?.trim() || m.amazonAppstoreUrl || FALLBACK_AMAZON_URL,
    playStoreUrl: branding?.apkUrlGoogle?.trim() || m.playStoreUrl || FALLBACK_PLAY_URL,
  };

  return NextResponse.json(body, {
    headers: {
      // Short cache so admin updates propagate within a minute without
      // hammering the DB on every app cold-start.
      'Cache-Control': 'public, max-age=60',
    },
  });
}
