import 'server-only';
import { prisma } from './prisma';
import { configFromCafe, type WACafe } from './whatsapp';
import { sendMessage } from './whatsapp-send';

/**
 * Renewal-reminder pipeline. Subscriptions whose `endsAt` is within the
 * next 3 days get a WhatsApp ping daily until they renew or expire. Each
 * ping is idempotent within a 24h window via Subscription.lastReminderAt
 * so even if the cron over-runs (Railway can occasionally retrigger
 * scheduled tasks) we never double-send.
 *
 * Triggers in two ways:
 *   1. /api/cron/renewal-reminders   (HTTP — call from Railway cron / uptime monitor)
 *   2. setInterval inside instrumentation.ts (in-process — runs every 6h)
 * Both call the same `runRenewalReminders()` so the behaviour is identical.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_DAYS = 3;
const APP_URL = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || 'https://cafe.watshop.in';

interface ReminderResult {
  scanned: number;
  sent: number;
  skipped: number;
  failures: { subscriptionId: string; reason: string }[];
}

/** Public entry point — picks every subscription due for a reminder
 *  today and dispatches them in parallel. Safe to call as often as you
 *  like; the per-row dedupe means same-day re-runs are no-ops. */
export async function runRenewalReminders(): Promise<ReminderResult> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const due = await prisma.subscription.findMany({
    where: {
      status: 'active',
      endsAt: { gte: now, lte: windowEnd },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: startOfToday } },
      ],
    },
    include: {
      cafe: { include: { settings: true, owner: true } },
      plan: true,
    },
  });

  const result: ReminderResult = { scanned: due.length, sent: 0, skipped: 0, failures: [] };

  await Promise.all(due.map(async (sub) => {
    try {
      const sent = await sendRenewalReminder(sub.id, { row: sub });
      if (sent.ok) result.sent++;
      else { result.skipped++; result.failures.push({ subscriptionId: sub.id, reason: sent.reason ?? 'unknown' }); }
    } catch (e: any) {
      result.failures.push({ subscriptionId: sub.id, reason: e?.message ?? 'exception' });
    }
  }));

  return result;
}

/** Send a single reminder. Used by the cron, the manual super-admin
 *  "Send reminder now" button, and (potentially) any owner-side
 *  re-fire trigger. Returns ok=false with a `reason` for any silent
 *  skip (no phone, manual provider, etc.). */
export async function sendRenewalReminder(
  subscriptionId: string,
  opts: { force?: boolean; row?: any } = {},
): Promise<{ ok: boolean; reason?: string; messageId?: string }> {
  const sub = opts.row
    ?? (await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { cafe: { include: { settings: true, owner: true } }, plan: true },
    }));

  if (!sub || !sub.cafe || !sub.plan) return { ok: false, reason: 'subscription-not-found' };

  // Idempotency: skip if already reminded today, unless force=true (the
  // manual admin button passes force so the button always fires).
  if (!opts.force && sub.lastReminderAt) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sub.lastReminderAt >= today) return { ok: false, reason: 'already-reminded-today' };
  }

  const ownerPhone =
    sub.cafe.whatsappNo
    ?? sub.cafe.phone
    ?? sub.cafe.owner?.phone
    ?? '';
  if (!ownerPhone) return { ok: false, reason: 'no-owner-phone' };

  const daysLeft = Math.max(0, Math.ceil((sub.endsAt.getTime() - Date.now()) / DAY_MS));
  const cafeName = sub.cafe.name;
  const planName = sub.plan.name;
  const monthly = sub.plan.priceMonthly;
  const yearly = sub.plan.priceYearly;
  const renewUrl = `${APP_URL}/dashboard/billing?renew=${encodeURIComponent(sub.id)}`;

  const body = [
    `⏰ *${cafeName} renewal reminder*`,
    '',
    `Your *${planName}* plan expires in *${daysLeft} day${daysLeft === 1 ? '' : 's'}*.`,
    `To avoid losing access, renew now:`,
    '',
    `• *Monthly* — ₹${monthly}`,
    yearly > 0 ? `• *Yearly* — ₹${yearly}  (save ~50%)` : null,
    '',
    `Tap to pay 👉 ${renewUrl}`,
    '',
    `(Pay via UPI / scan the QR on the page. Manual confirmation, no auto-charge.)`,
  ].filter(Boolean).join('\n');

  // Send via the cafe's own WhatsApp pipeline. This way the ping comes
  // from the cafe's number to the cafe owner — already trusted, no need
  // to introduce a separate platform-side sender.
  const config = configFromCafe(sub.cafe as unknown as WACafe);
  const sendResult = await sendMessage({
    to: ownerPhone,
    message: body,
    config,
  });

  if (!sendResult.ok) return { ok: false, reason: sendResult.error ?? 'send-failed' };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { lastReminderAt: new Date() },
  });

  return { ok: true };
}
