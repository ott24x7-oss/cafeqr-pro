import 'server-only';
import crypto from 'crypto';
import { prisma } from './prisma';
import { configFromCafe, generateMagicLinkMessage, type WACafe } from './whatsapp';
import { sendMessage } from './whatsapp-send';

const TTL_MS = 10 * 60 * 1000;

function appUrl(): string {
  const u = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  return u.replace(/\/+$/, '');
}

export interface IssueMagicLinkResult {
  ok: boolean;
  delivered: boolean;
  provider: string;
  token: string;
  url: string;
  expiresAt: Date;
  error?: string;
}

/**
 * Generate a one-tap WhatsApp login token for `phone` on `cafe`, persist it
 * (single-use, 10-min TTL), and DM the customer the magic URL via the
 * cafe's configured WhatsApp provider. Returns the URL so callers can fall
 * back to a manual share link in dev / when delivery fails.
 */
export async function issueMagicLink({
  cafe,
  phone,
  ip,
  userAgent,
}: {
  cafe: WACafe;
  phone: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<IssueMagicLinkResult> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.whatsAppMagicLink.create({
    data: {
      cafeId: cafe.id,
      cafeSlug: cafe.slug,
      phone,
      token,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

  const base = appUrl();
  const url = `${base}/m/${token}`;
  const config = configFromCafe(cafe);
  const message = generateMagicLinkMessage(url, cafe.name);

  let delivered = false;
  let error: string | undefined;
  if (config.provider && config.provider !== 'manual') {
    const r = await sendMessage({ to: phone, message, config });
    delivered = r.ok === true;
    if (!r.ok) error = r.error;
  }

  return {
    ok: true,
    delivered,
    provider: config.provider ?? 'manual',
    token,
    url,
    expiresAt,
    error,
  };
}

/**
 * Atomically validate-and-burn a magic-link token. Returns the matching
 * row's phone + cafeSlug on success; null when missing, expired, already
 * used, or the row vanished mid-update (concurrent tap).
 */
export async function consumeMagicLink(token: string): Promise<{ phone: string; cafeSlug: string } | null> {
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  const row = await prisma.whatsAppMagicLink.findUnique({ where: { token } });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  // updateMany with the unused-and-fresh predicate gives us a single-row CAS:
  // exactly one tap wins, replays return null.
  const upd = await prisma.whatsAppMagicLink.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (upd.count !== 1) return null;

  return { phone: row.phone, cafeSlug: row.cafeSlug };
}
