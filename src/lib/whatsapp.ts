/**
 * CafeQR Pro — WhatsApp service
 *
 * Phase 1: Manual `wa.me` deep links + ready-made templates.
 * Phase 2 (drop-in): Cloud API + Baileys provider implementations
 *                    behind the same `sendMessage()` interface.
 */
import type { Order, OrderItem, Cafe, CafeSettings } from '@prisma/client';

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

// ─── Provider abstraction (Phase 2 ready) ─────────────────────────────────
export interface SendResult {
  ok: boolean;
  provider: WAProvider;
  link?: string;
  error?: string;
}

export interface SendOpts {
  to: string;
  message: string;
  provider?: WAProvider;
}

export async function sendMessage({ to, message, provider = 'manual' }: SendOpts): Promise<SendResult> {
  const link = waLink(to, message);

  if (provider === 'manual') {
    // Phase 1 — return a wa.me link the UI opens / shares.
    return { ok: true, provider: 'manual', link };
  }

  if (provider === 'cloud_api') {
    try {
      const token = process.env.WHATSAPP_CLOUD_TOKEN;
      const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;
      if (!token || !phoneId) return { ok: false, provider, error: 'Cloud API not configured', link };
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
      if (!res.ok) return { ok: false, provider, error: await res.text(), link };
      return { ok: true, provider, link };
    } catch (e: any) {
      return { ok: false, provider, error: e?.message ?? 'send failed', link };
    }
  }

  if (provider === 'baileys') {
    // Hook in your Baileys session manager here. Stub:
    return { ok: false, provider, error: 'Baileys not wired up yet', link };
  }

  return { ok: false, provider, error: 'unknown provider', link };
}
