import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Server-side resolved platform branding — the values that should be
 * baked into the initial HTML so there's no flash of the default logo
 * before /js/branding.js patches the DOM. The runtime patcher still runs
 * as a safety net for any updates that land between SSR cache windows.
 *
 * `cache()` from React deduplicates the DB hit within a single request:
 * navbar, footer and any other server component that calls this within
 * the same render share a single round-trip.
 */
export interface PlatformBranding {
  logoUrl: string;          // either the admin-uploaded data URL or the static default
  brandName: string;
  tagline: string;
  footerText: string;
  primaryColor: string;
  appIconDataUrl: string;
  splashImageDataUrl: string;
  apkUrlGoogle: string;
  apkUrlAmazon: string;
}

const DEFAULT_LOGO = '/watshop-cafe-lockup.svg';
const DEFAULT_BRAND_NAME = 'WatShop Cafe';

export const getPlatformBranding = cache(async (): Promise<PlatformBranding> => {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
    return {
      logoUrl: row?.logoDataUrl?.trim() || DEFAULT_LOGO,
      brandName: row?.brandName?.trim() || DEFAULT_BRAND_NAME,
      tagline: row?.tagline ?? '',
      footerText: row?.footerText ?? '',
      primaryColor: row?.primaryColor ?? '',
      appIconDataUrl: row?.appIconDataUrl ?? '',
      splashImageDataUrl: row?.splashImageDataUrl ?? '',
      apkUrlGoogle: row?.apkUrlGoogle ?? '',
      apkUrlAmazon: row?.apkUrlAmazon ?? '',
    };
  } catch {
    // DB outage / transient error: return defaults so the marketing
    // pages still render. The runtime patcher will catch up later.
    return {
      logoUrl: DEFAULT_LOGO,
      brandName: DEFAULT_BRAND_NAME,
      tagline: '',
      footerText: '',
      primaryColor: '',
      appIconDataUrl: '',
      splashImageDataUrl: '',
      apkUrlGoogle: '',
      apkUrlAmazon: '',
    };
  }
});
