import 'server-only';
import crypto from 'crypto';
import { prisma } from './prisma';
import { configFromCafe, generateMagicLinkMessage, type WACafe } from './whatsapp';
import { sendMessage } from './whatsapp-send';

const TTL_MS = 10 * 60 * 1000;
// How old a used/expired row has to be before issueMagicLink will sweep it.
// Kept as a soft gate so abuse audits still have a window of recent rows.
const SWEEP_AFTER_MS = 24 * 60 * 60 * 1000;

function envAppUrl(): string {
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
 * cafe's configured WhatsApp provider. `origin` is the request origin we
 * fall back to when APP_URL isn't configured — without that fallback the
 * URL would be relative and tappable only on the same device that issued
 * it, which defeats the WhatsApp hand-off.
 */
export async function issueMagicLink({
  cafe,
  phone,
  origin,
  ip,
  userAgent,
}: {
  cafe: WACafe;
  phone: string;
  origin?: string | null;
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

  // Best-effort housekeeping: prune used/expired tokens older than a day.
  // Runs on the issuance hot path but is cheap (indexed on expiresAt) and
  // we swallow errors so a slow sweep can't break login.
  void prisma.whatsAppMagicLink
    .deleteMany({
      where: {
        OR: [
          { usedAt: { lt: new Date(Date.now() - SWEEP_AFTER_MS) } },
          { expiresAt: { lt: new Date(Date.now() - SWEEP_AFTER_MS) } },
        ],
      },
    })
    .catch(() => {});

  const base = (envAppUrl() || (origin ?? '').replace(/\/+$/, ''));
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

export type ConsumeMagicLinkResult =
  | { ok: true; phone: string; cafeSlug: string }
  | { ok: false; reason: 'invalid' | 'used' | 'expired'; cafeSlug?: string };

/**
 * Atomically validate-and-burn a magic-link token. Distinguishes between
 * unknown / already-used / expired so callers can render meaningful copy
 * ("link expired" vs "already used") on the login page.
 */
export async function consumeMagicLink(token: string): Promise<ConsumeMagicLinkResult> {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return { ok: false, reason: 'invalid' };
  }
  const row = await prisma.whatsAppMagicLink.findUnique({ where: { token } });
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used', cafeSlug: row.cafeSlug };
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired', cafeSlug: row.cafeSlug };
  }

  // updateMany with the unused-and-fresh predicate gives us a single-row CAS:
  // exactly one tap wins, replays return null. We re-check after for the
  // race where the row was used between our read above and this update.
  const upd = await prisma.whatsAppMagicLink.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (upd.count !== 1) return { ok: false, reason: 'used', cafeSlug: row.cafeSlug };

  return { ok: true, phone: row.phone, cafeSlug: row.cafeSlug };
}
