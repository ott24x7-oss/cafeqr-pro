/**
 * Canonical public site origin + name, resolved once for metadata,
 * canonicals, the sitemap and JSON-LD. Falls back to the production host
 * when APP_URL / NEXTAUTH_URL aren't set (e.g. local builds) so generated
 * absolute URLs are never relative.
 */
export const SITE_URL = (
  process.env.APP_URL ||
  process.env.NEXTAUTH_URL ||
  'https://cafe.watshop.in'
).replace(/\/+$/, '');

export const SITE_NAME = 'WatShop Cafe';
