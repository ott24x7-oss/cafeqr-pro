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

/** Lightweight tagged logger — `[welcome-reply] ...`. Helps grepping
 *  Railway logs while debugging "why didn't the bot reply" issues. */
function log(reason: string, details?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[welcome-reply] ${reason}`, details ?? '');
}

export async function handleIncomingMessage(input: IncomingMessage): Promise<{ replied: boolean; reason?: string }> {
  log('inbound', { sessionId: input.sessionId, fromPhone: input.fromPhone, body: input.body });

  const fromPhone = normalizePhone(input.fromPhone);
  if (!fromPhone) {
    log('skip:invalid-phone', { raw: input.fromPhone });
    return { replied: false, reason: 'invalid-phone' };
  }

  // Locate the cafe by Baileys session ID. CafeSettings holds the link.
  // First try exact match; if that misses, fall back to "any cafe whose
  // session ID is empty/null but has Baileys provider on" — covers cafes
  // that paired before baileysSessionId was being persisted reliably.
  let settings = await prisma.cafeSettings.findFirst({
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

  if (!settings) {
    // Loosened lookup: in some upgrade paths the column ends up empty
    // even though the cafe is paired and using Baileys. If exactly one
    // cafe has welcomeAutoReply on and provider=baileys, use that.
    const candidates = await prisma.cafeSettings.findMany({
      where: {
        whatsappProvider: 'baileys',
        welcomeAutoReply: true,
        OR: [{ baileysSessionId: null }, { baileysSessionId: '' }],
      },
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
    }).catch(() => [] as any[]);
    if (candidates.length === 1) {
      log('lookup:fallback-to-only-baileys-cafe', { cafeId: candidates[0].cafe?.id });
      settings = candidates[0] as any;
    }
  }

  if (!settings || !settings.cafe) {
    log('skip:no-cafe-for-session', { sessionId: input.sessionId });
    return { replied: false, reason: 'no-cafe-for-session' };
  }
  if (!settings.welcomeAutoReply) {
    // Surface the actual DB values so we can tell whether the save just
    // didn't persist vs. the column being cleared by something else.
    log('skip:disabled', {
      cafeId: settings.cafe.id,
      welcomeAutoReply: settings.welcomeAutoReply,
      welcomeMessageLen: settings.welcomeMessage?.length ?? 0,
      welcomeTriggers: settings.welcomeTriggers,
      whatsappProvider: settings.whatsappProvider,
    });
    return { replied: false, reason: 'disabled' };
  }

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
  if (skipPhones.has(fromPhone)) {
    log('skip:staff-number', { fromPhone, skipList: Array.from(skipPhones) });
    return { replied: false, reason: 'staff-number' };
  }

  // Trigger match (case-insensitive, starts-with).
  const triggers = (settings.welcomeTriggers && settings.welcomeTriggers.length > 0)
    ? settings.welcomeTriggers
    : ['hi', 'hello'];
  if (!looksLikeTrigger(input.body, triggers)) {
    log('skip:no-trigger-match', { body: input.body, triggers });
    return { replied: false, reason: 'no-trigger-match' };
  }

  // 7-day cooldown.
  const cooldownLog = await prisma.welcomeReplyLog.findUnique({
    where: { cafeId_phone: { cafeId: cafe.id, phone: fromPhone } },
  }).catch(() => null);
  if (cooldownLog && Date.now() - cooldownLog.lastSentAt.getTime() < SEVEN_DAYS_MS) {
    log('skip:cooldown', {
      fromPhone,
      lastSentAt: cooldownLog.lastSentAt.toISOString(),
    });
    return { replied: false, reason: 'cooldown' };
  }

  // Render the message.
  const url = cafeUrl(cafe);
  const body = (settings.welcomeMessage?.trim() || DEFAULT_BODY)
    .replaceAll('{cafeName}', cafe.name)
    .replaceAll('{cafeUrl}', url);

  log('sending', { to: fromPhone, cafeId: cafe.id });
  const config = configFromCafe(settings.cafe as unknown as WACafe);
  const result = await sendMessage({
    to: fromPhone,
    message: body,
    config,
  });
  if (!result.ok) {
    log('send-failed', { error: result.error });
    return { replied: false, reason: result.error ?? 'send-failed' };
  }

  // Upsert the cooldown row.
  await prisma.welcomeReplyLog.upsert({
    where: { cafeId_phone: { cafeId: cafe.id, phone: fromPhone } },
    create: { cafeId: cafe.id, phone: fromPhone },
    update: { lastSentAt: new Date() },
  });

  log('replied', { to: fromPhone, cafeId: cafe.id });
  return { replied: true };
}
