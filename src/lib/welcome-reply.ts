import { prisma } from './prisma';
import { sendMessage } from './whatsapp-send';
import { configFromCafe, normalizePhone, type WACafe } from './whatsapp';

/**
 * Auto-reply on first contact. When a customer DMs a cafe's WhatsApp
 * number with a trigger word, send back a welcome + the cafe's
 * storefront link — but only once every 7 days per customer to avoid
 * spamming on repeat hellos.
 *
 * Wired in from the Baileys session manager's `messages.upsert` event.
 * Cloud-API webhook integration is intentionally not built here —
 * that surface needs separate Meta-side wiring and is out of scope
 * for this iteration.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const APP_URL = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || 'https://cafe.watshop.in';

const DEFAULT_BODY =
  'Hi 👋 Thanks for reaching out to *{cafeName}*. Browse our menu and order online: {cafeUrl}';

interface IncomingMessage {
  /** The Baileys session ID — same as CafeSettings.baileysSessionId */
  sessionId: string;
  /** Sender phone, raw E.164-ish (digits only is fine — we normalize) */
  fromPhone: string;
  /** Message body, will be lowercased + trimmed before trigger match */
  body: string;
}

/** Storefront URL for a cafe — uses verified custom domain if set,
 *  otherwise the canonical platform path. */
function cafeUrl(cafe: { slug: string; customDomain?: string | null; customDomainStatus?: string | null }) {
  if (cafe.customDomain && cafe.customDomainStatus === 'verified') {
    return `https://${cafe.customDomain}`;
  }
  return `${APP_URL}/cafe/${cafe.slug}`;
}

function looksLikeTrigger(body: string, triggers: string[]): boolean {
  const trimmed = body.trim().toLowerCase();
  if (!trimmed) return false;
  return triggers.some((t) => {
    const tt = t.trim().toLowerCase();
    if (!tt) return false;
    if (trimmed === tt) return true;
    // "starts with" — accepts "hi there", "hello, do you have…" etc.
    return trimmed.startsWith(tt + ' ') || trimmed.startsWith(tt + '!') || trimmed.startsWith(tt + '.');
  });
}

export async function handleIncomingMessage(input: IncomingMessage): Promise<{ replied: boolean; reason?: string }> {
  const fromPhone = normalizePhone(input.fromPhone);
  if (!fromPhone) return { replied: false, reason: 'invalid-phone' };

  // Locate the cafe by Baileys session ID. CafeSettings holds the link.
  const settings = await prisma.cafeSettings.findFirst({
    where: { baileysSessionId: input.sessionId },
    include: {
      cafe: {
        select: {
          id: true, name: true, slug: true,
          customDomain: true, customDomainStatus: true,
          phone: true, whatsappNo: true, ownerId: true,
          owner: { select: { phone: true } },
        },
      },
    },
  }).catch(() => null);

  if (!settings || !settings.cafe) return { replied: false, reason: 'no-cafe-for-session' };
  if (!settings.welcomeAutoReply) return { replied: false, reason: 'disabled' };

  const cafe = settings.cafe;

  // Skip the cafe's own staff numbers — never welcome-reply to them.
  const skipPhones = new Set<string>(
    [
      cafe.phone,
      cafe.whatsappNo,
      cafe.owner?.phone,
      ...(settings.notifyNumbers ?? []),
    ]
      .filter(Boolean)
      .map((p) => normalizePhone(String(p)))
      .filter(Boolean),
  );
  if (skipPhones.has(fromPhone)) return { replied: false, reason: 'staff-number' };

  // Trigger match (case-insensitive, starts-with).
  const triggers = (settings.welcomeTriggers && settings.welcomeTriggers.length > 0)
    ? settings.welcomeTriggers
    : ['hi', 'hello'];
  if (!looksLikeTrigger(input.body, triggers)) {
    return { replied: false, reason: 'no-trigger-match' };
  }

  // 7-day cooldown.
  const log = await prisma.welcomeReplyLog.findUnique({
    where: { cafeId_phone: { cafeId: cafe.id, phone: fromPhone } },
  }).catch(() => null);
  if (log && Date.now() - log.lastSentAt.getTime() < SEVEN_DAYS_MS) {
    return { replied: false, reason: 'cooldown' };
  }

  // Render the message.
  const url = cafeUrl(cafe);
  const body = (settings.welcomeMessage?.trim() || DEFAULT_BODY)
    .replaceAll('{cafeName}', cafe.name)
    .replaceAll('{cafeUrl}', url);

  // Send via the cafe's configured provider (which is Baileys here, since
  // that's what received the message). sendMessage handles the rest.
  const config = configFromCafe(settings.cafe as unknown as WACafe);
  const result = await sendMessage({
    to: fromPhone,
    message: body,
    config,
  });
  if (!result.ok) return { replied: false, reason: result.error ?? 'send-failed' };

  // Upsert the cooldown row.
  await prisma.welcomeReplyLog.upsert({
    where: { cafeId_phone: { cafeId: cafe.id, phone: fromPhone } },
    create: { cafeId: cafe.id, phone: fromPhone },
    update: { lastSentAt: new Date() },
  });

  return { replied: true };
}
