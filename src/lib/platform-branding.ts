import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Server-side resolved platform branding — the values baked into the initial
 * HTML so there's no flash of the default logo before /js/branding.js patches
 * the DOM.
 *
 * Image fields resolve to SHORT, CACHEABLE URLs (e.g. /api/branding/asset/logo)
 * rather than the raw base64 data URL stored in the DB. Inlining the data URLs
 * previously bloated every marketing page's HTML by hundreds of KB.
 *
 * `cache()` deduplicates the DB hit within a single request: navbar, footer
 * and the landing page share one round-trip.
 */
export interface PlatformBranding {
  logoUrl: string;        // navbar <img> src — custom logo URL or the static default lockup
  customLogoUrl: string;  // non-empty only when a custom logo exists (footer mark / patcher)
  brandName: string;
  tagline: string;
  footerText: string;
  primaryColor: string;
  appIconUrl: string;     // custom app-icon URL, or '' when none set
  splashUrl: string;      // custom splash-image URL, or '' when none set
  apkUrlGoogle: string;
  apkUrlAmazon: string;
}

const DEFAULT_LOGO = '/watshop-cafe-lockup.svg';
const DEFAULT_BRAND_NAME = 'WatShop Cafe';

/**
 * Map a stored branding image (base64 data URL OR hosted URL) to a short URL.
 * Data URLs are served via the cacheable /api/branding/asset/<kind> endpoint
 * so they never get inlined into page HTML; hosted URLs pass through; empty
 * stays empty.
 */
function assetUrl(raw: string | null | undefined, kind: 'logo' | 'icon' | 'splash'): string {
  const v = raw?.trim() ?? '';
  if (!v) return '';
  if (v.startsWith('data:')) return `/api/branding/asset/${kind}`;
  return v;
}

export const getPlatformBranding = cache(async (): Promise<PlatformBranding> => {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
    const customLogoUrl = assetUrl(row?.logoDataUrl, 'logo');
    return {
      logoUrl: customLogoUrl || DEFAULT_LOGO,
      customLogoUrl,
      brandName: row?.brandName?.trim() || DEFAULT_BRAND_NAME,
      tagline: row?.tagline ?? '',
      footerText: row?.footerText ?? '',
      primaryColor: row?.primaryColor ?? '',
      appIconUrl: assetUrl(row?.appIconDataUrl, 'icon'),
      splashUrl: assetUrl(row?.splashImageDataUrl, 'splash'),
      apkUrlGoogle: row?.apkUrlGoogle ?? '',
      apkUrlAmazon: row?.apkUrlAmazon ?? '',
    };
  } catch {
    // DB outage / transient error: return defaults so the marketing pages
    // still render. The runtime patcher catches up later.
    return {
      logoUrl: DEFAULT_LOGO,
      customLogoUrl: '',
      brandName: DEFAULT_BRAND_NAME,
      tagline: '',
      footerText: '',
      primaryColor: '',
      appIconUrl: '',
      splashUrl: '',
      apkUrlGoogle: '',
      apkUrlAmazon: '',
    };
  }
});
