// Public, unauthenticated endpoint consumed by the Android app at launch.
// Returns the singleton MobileAppConfig as a flat JSON object. Image fields
// are returned as absolute HTTPS URLs (via /api/mobile-app/assets/[name]) so
// the device can fetch + cache them with normal HTTP caching, instead of
// inlining base64 in the JSON. Cached for 60s on the CDN edge so a flood of
// app launches doesn't hammer the DB. The Android client also caches the
// last-known-good config locally so it can boot offline.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = {
  appName: 'WatShop Cafe',
  splashBackgroundColor: '#0B0F14',
  primaryColor: '#22C55E',
  tagline: 'QR Ordering for Cafes',
  maintenanceMessage: 'App is under maintenance. Please try again later.',
  amazonAppstoreUrl: 'https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.watshop.cafe',
};

function originFromReq(req: Request): string {
  // Prefer the explicit APP_URL so links work behind reverse proxies / on
  // Railway. Fall back to the request URL for local dev.
  const env = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
  if (env) return env;
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

export async function GET(req: Request) {
  const row = await prisma.mobileAppConfig.findUnique({ where: { id: 'singleton' } });
  const origin = originFromReq(req);
  // updatedAt → cache-buster so the device picks up new images immediately
  const v = row?.updatedAt ? Math.floor(row.updatedAt.getTime() / 1000) : 0;
  const logoUrl = row?.logoData
    ? `${origin}/api/mobile-app/assets/logo?v=${v}`
    : '';
  const splashLogoUrl = row?.splashLogoData
    ? `${origin}/api/mobile-app/assets/splash-logo?v=${v}`
    : '';

  const body = {
    appName: row?.appName || DEFAULT_CONFIG.appName,
    logoUrl,
    splashLogoUrl,
    splashBackgroundColor: row?.splashBackgroundColor || DEFAULT_CONFIG.splashBackgroundColor,
    primaryColor: row?.primaryColor || DEFAULT_CONFIG.primaryColor,
    tagline: row?.tagline || DEFAULT_CONFIG.tagline,
    maintenanceMode: !!row?.maintenanceMode,
    maintenanceMessage: row?.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
    forceUpdate: !!row?.forceUpdate,
    minimumVersionCode: row?.minimumVersionCode ?? 1,
    // Both store URLs are returned; the device picks the right one based on
    // its installer package. Amazon Appstore is the primary distribution.
    amazonAppstoreUrl: row?.amazonAppstoreUrl || DEFAULT_CONFIG.amazonAppstoreUrl,
    playStoreUrl: row?.playStoreUrl || DEFAULT_CONFIG.playStoreUrl,
  };

  return NextResponse.json(body, {
    headers: {
      // Short edge cache; the Android app additionally treats its own copy
      // as the source of truth on cold start.
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      // Endpoint is intended to be called from the Android app (no Origin)
      // but allow CORS so the website can debug-render the config too.
      'Access-Control-Allow-Origin': '*',
    },
  });
}
