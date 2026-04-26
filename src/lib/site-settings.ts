/**
 * Helper around the SiteSettings singleton row. Caches the row on globalThis
 * for ~30s so server components / API handlers don't all hit the DB on every
 * request.
 */
import { prisma } from './prisma';
import { decrypt } from './crypto';

const TTL_MS = 30_000;

interface CacheEntry { row: any; at: number }
const G = globalThis as any;

export interface SiteSettingsView {
  id: string;
  siteName: string;
  tagline: string | null;
  supportEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPass: string | null;            // decrypted (server-only callers)
  platformUpiId: string | null;
  platformUpiQrUrl: string | null;
  platformGmailUser: string | null;
  platformGmailAppPassword: string | null; // decrypted
  content: Record<string, any>;
  updatedAt: Date | null;
}

function decryptPass(v: string | null | undefined): string | null {
  if (!v) return null;
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v)) {
    const out = decrypt(v);
    return out || null;
  }
  return v;
}

export async function getSiteSettings(opts?: { fresh?: boolean }): Promise<SiteSettingsView> {
  const cache: CacheEntry | undefined = G.__cafeqr_site_settings;
  if (!opts?.fresh && cache && Date.now() - cache.at < TTL_MS) {
    return cache.row;
  }

  let row = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (!row) {
    row = await prisma.siteSettings.create({
      data: { id: 'singleton', siteName: 'CafeQR Pro' },
    });
  }

  const view: SiteSettingsView = {
    id: row.id,
    siteName: row.siteName,
    tagline: row.tagline,
    supportEmail: row.supportEmail,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
    smtpFrom: row.smtpFrom,
    smtpPass: decryptPass(row.smtpPass),
    platformUpiId: (row as any).platformUpiId ?? null,
    platformUpiQrUrl: (row as any).platformUpiQrUrl ?? null,
    platformGmailUser: (row as any).platformGmailUser ?? null,
    platformGmailAppPassword: decryptPass((row as any).platformGmailAppPassword ?? null),
    content: (row.content as Record<string, any>) ?? {},
    updatedAt: row.updatedAt,
  };

  G.__cafeqr_site_settings = { row: view, at: Date.now() };
  return view;
}

export function invalidateSiteSettingsCache() {
  G.__cafeqr_site_settings = undefined;
}

/** Public-safe view for client / unauth pages (drops smtp credentials). */
export function publicView(s: SiteSettingsView) {
  return {
    siteName: s.siteName,
    tagline: s.tagline,
    supportEmail: s.supportEmail,
    content: s.content,
  };
}
