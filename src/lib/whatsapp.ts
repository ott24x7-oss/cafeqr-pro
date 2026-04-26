/**
 * CafeQR Pro — WhatsApp service
 *
 * - manual:    returns a wa.me link the UI opens / shares.
 * - cloud_api: posts to Meta Cloud API. Per-cafe creds (encrypted in DB) take
 *              precedence over WHATSAPP_CLOUD_TOKEN / WHATSAPP_CLOUD_PHONE_ID
 *              env fallbacks, so each cafe can use its own bot number.
 * - baileys:   forwarded to a self-hosted Baileys worker (BAILEYS_WORKER_URL).
 *              Implementation lives in worker/baileys-server.ts.
 */
import type { Order, OrderItem, Cafe, CafeSettings } from '@prisma/client';
import { decrypt } from './crypto';

export type WAProvider = 'manual' | 'cloud_api' | 'baileys';

export interface OrderForWA extends Order {
  items: (OrderItem & { menuItem?: any })[];
}

export interface WACafe extends Cafe {
  settings?: CafeSettings | null;
}

// ─── Number formatting ────────────────────────────────────────────────────
export function normalizePhone(phone: string, defaultCountry = '91'): string {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.length === 10) p = defaultCountry + p;
  return p;
}

export function waLink(phone: string, message: string): string {
  const num = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return `https://wa.me/${num}?text=${text}`;
}

// ─── Message templates ────────────────────────────────────────────────────
export function generateOwnerOrderMessage(order: OrderForWA, cafe: WACafe, appUrl?: string) {
  const lines = [
    `🆕 *New Order — ${cafe.name}*`,
    '',
    `*Order #:* ${order.orderNumber}`,
    `*Table:* ${order.tableId ? `Table ${(order as any).table?.number ?? ''}` : order.type}`,
    order.customerName ? `*Customer:* ${order.customerName}` : null,
    order.customerPhone ? `*Phone:* ${order.customerPhone}` : null,
    '',
    '*Items:*',
    ...order.items.map(
      (i) => `• ${i.quantity}× ${i.name}${i.variantName ? ` (${i.variantName})` : ''} — ₹${i.totalPrice.toFixed(0)}`
    ),
    '',
    `*Subtotal:* ₹${order.subtotal.toFixed(0)}`,
    order.taxAmount ? `*GST:* ₹${order.taxAmount.toFixed(0)}` : null,
    order.serviceAmount ? `*Service:* ₹${order.serviceAmount.toFixed(0)}` : null,
    `*Total:* ₹${order.totalAmount.toFixed(0)}`,
    order.customerNote ? `\n📝 *Note:* ${order.customerNote}` : null,
    appUrl ? `\n👉 Open: ${appUrl}/dashboard/orders/${order.id}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function generateCustomerStatusMessage(
  order: OrderForWA,
  cafe: WACafe,
  status: string,
  appUrl?: string
) {
  const emoji: Record<string, string> = {
    ACCEPTED: '✅',
    PREPARING: '👨‍🍳',
    READY: '🍽️',
    SERVED: '🤝',
    COMPLETED: '🙏',
    CANCELLED: '❌',
  };
  const label: Record<string, string> = {
    ACCEPTED: 'has been accepted',
    PREPARING: 'is being prepared',
    READY: 'is ready! Please collect',
    SERVED: 'has been served — enjoy!',
    COMPLETED: 'is complete. Thank you!',
    CANCELLED: 'was cancelled',
  };
  return [
    `${emoji[status] ?? '📦'} *${cafe.name}*`,
    '',
    `Hi${order.customerName ? ' ' + order.customerName : ''}, your order *#${order.orderNumber}* ${label[status] ?? 'updated'}.`,
    `Total: ₹${order.totalAmount.toFixed(0)}`,
    appUrl ? `\nTrack live: ${appUrl}/order/${order.id}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function generatePaymentMessage(order: OrderForWA, cafe: WACafe, appUrl?: string) {
  const upi = cafe.settings?.upiId;
  return [
    `💳 *Payment Request — ${cafe.name}*`,
    '',
    `Order: *#${order.orderNumber}*`,
    `Amount: *₹${order.totalAmount.toFixed(0)}*`,
    upi ? `\nUPI ID: \`${upi}\`` : null,
    appUrl ? `\nPay securely: ${appUrl}/pay/${order.id}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function generateReviewMessage(order: OrderForWA, cafe: WACafe, appUrl?: string) {
  return [
    `⭐ *Thank you for visiting ${cafe.name}!*`,
    '',
    `We hope you enjoyed your meal. Could you spare 30 seconds to rate us?`,
    appUrl ? `\nLeave review: ${appUrl}/review/${order.id}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function generateOTPMessage(otp: string, cafeName?: string) {
  return [
    `🔐 *${cafeName ?? 'CafeQR Pro'}*`,
    '',
    `Your verification code is *${otp}*`,
    `It will expire in 10 minutes.`,
    '',
    `Do not share this code with anyone.`,
  ].join('\n');
}

// ─── Provider abstraction ─────────────────────────────────────────────────
export interface SendResult {
  ok: boolean;
  provider: WAProvider;
  link?: string;
  error?: string;
}

export interface CafeWAConfig {
  provider?: WAProvider;
  cloudToken?: string | null;        // encrypted (we decrypt) or plain
  cloudPhoneId?: string | null;
  baileysSessionId?: string | null;
}

export interface SendOpts {
  to: string;
  message: string;
  provider?: WAProvider;
  config?: CafeWAConfig;
}

function maybeDecrypt(v?: string | null): string | undefined {
  if (!v) return undefined;
  // Encrypted format from src/lib/crypto.ts is `iv:tag:data` (all hex). If it
  // doesn't match that shape we assume the value is already plaintext (e.g.
  // legacy data or env values).
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v)) {
    const out = decrypt(v);
    return out || v;
  }
  return v;
}

export async function sendMessage({ to, message, provider, config }: SendOpts): Promise<SendResult> {
  const link = waLink(to, message);
  const eff: WAProvider = (provider ?? config?.provider ?? 'manual') as WAProvider;

  if (eff === 'manual') {
    return { ok: true, provider: 'manual', link };
  }

  if (eff === 'cloud_api') {
    try {
      const token   = maybeDecrypt(config?.cloudToken)   ?? process.env.WHATSAPP_CLOUD_TOKEN;
      const phoneId = maybeDecrypt(config?.cloudPhoneId) ?? process.env.WHATSAPP_CLOUD_PHONE_ID;
      if (!token || !phoneId) return { ok: false, provider: eff, error: 'Cloud API not configured', link };
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizePhone(to),
          type: 'text',
          text: { body: message },
        }),
      });
      if (!res.ok) return { ok: false, provider: eff, error: await res.text(), link };
      return { ok: true, provider: eff, link };
    } catch (e: any) {
      return { ok: false, provider: eff, error: e?.message ?? 'send failed', link };
    }
  }

  if (eff === 'baileys') {
    try {
      const base = process.env.BAILEYS_WORKER_URL;
      if (!base) return { ok: false, provider: eff, error: 'BAILEYS_WORKER_URL not set', link };
      const res = await fetch(`${base.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.BAILEYS_WORKER_TOKEN ? { Authorization: `Bearer ${process.env.BAILEYS_WORKER_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          sessionId: config?.baileysSessionId ?? 'default',
          to: normalizePhone(to),
          message,
        }),
      });
      if (!res.ok) return { ok: false, provider: eff, error: await res.text(), link };
      return { ok: true, provider: eff, link };
    } catch (e: any) {
      return { ok: false, provider: eff, error: e?.message ?? 'baileys send failed', link };
    }
  }

  return { ok: false, provider: eff, error: 'unknown provider', link };
}

export function configFromCafe(cafe: WACafe): CafeWAConfig {
  const s = cafe.settings;
  return {
    provider: (s?.whatsappProvider ?? 'manual') as WAProvider,
    cloudToken: s?.waCloudToken ?? null,
    cloudPhoneId: s?.waCloudPhoneId ?? null,
    baileysSessionId: s?.baileysSessionId ?? null,
  };
}
