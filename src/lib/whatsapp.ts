/**
 * Pure WhatsApp utilities — message templates, phone normalization, link
 * helpers and the per-cafe config selector. SAFE FOR CLIENT bundles.
 *
 * Anything that performs network I/O (Cloud API calls, Baileys session
 * orchestration) lives in src/lib/whatsapp-send.ts and is server-only.
 */
import type { Order, OrderItem, Cafe, CafeSettings } from '@prisma/client';

export type WAProvider = 'manual' | 'cloud_api' | 'baileys';

export interface OrderForWA extends Order {
  items: (OrderItem & { menuItem?: any })[];
}

export interface WACafe extends Cafe {
  settings?: CafeSettings | null;
}

/** Map ISO-3166 alpha-2 → E.164 dial code (no `+`). Add more as the SaaS
 *  expands; defaults to India when the cafe hasn't picked yet. */
export const COUNTRY_DIAL: Record<string, string> = {
  IN: '91',  US: '1',   GB: '44',  AE: '971',
  SG: '65',  AU: '61',  CA: '1',   IE: '353',
  DE: '49',  FR: '33',  ES: '34',  IT: '39',
  NL: '31',  CH: '41',  SA: '966', QA: '974',
  PK: '92',  BD: '880', LK: '94',  NP: '977',
  MY: '60',  ID: '62',  PH: '63',  TH: '66',
  VN: '84',  ZA: '27',  NZ: '64',
};

export function dialCodeFor(country: string | null | undefined): string {
  return COUNTRY_DIAL[(country ?? 'IN').toUpperCase()] ?? '91';
}

export function normalizePhone(phone: string, defaultCountry: string = '91'): string {
  if (!phone) return '';
  // Strip everything except digits and a leading `+`.
  let p = phone.trim().replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);

  // The default-country argument is either the dial code itself ('91') or an
  // ISO-2 code ('IN') — accept both for back-compat.
  const dial = /^\d+$/.test(defaultCountry) ? defaultCountry : dialCodeFor(defaultCountry);

  // Heuristic: if it's already long enough to include a country code and
  // doesn't start with the cafe's dial code, leave it. Otherwise treat as a
  // local number and prepend the dial code.
  if (p.length <= 10) p = dial + p;
  return p;
}

export function waLink(phone: string, message: string): string {
  const num = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return `https://wa.me/${num}?text=${text}`;
}

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

export function generateCustomerOrderReceivedMessage(order: OrderForWA, cafe: WACafe, appUrl?: string) {
  const itemSummary = order.items
    .slice(0, 5)
    .map((i) => `• ${i.quantity}× ${i.name}${i.variantName ? ` (${i.variantName})` : ''}`)
    .join('\n');
  const more = order.items.length > 5 ? `\n…and ${order.items.length - 5} more` : '';
  return [
    `🆕 *Order received — ${cafe.name}*`,
    '',
    `Hi${order.customerName ? ' ' + order.customerName : ''}, we got your order *#${order.orderNumber}*.`,
    '',
    itemSummary + more,
    '',
    `*Total:* ₹${order.totalAmount.toFixed(0)}`,
    appUrl ? `\nTrack live: ${appUrl}/order/${order.id}` : null,
  ].filter(Boolean).join('\n');
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
  const amount = (order as any).payableAmount ?? order.totalAmount;
  return [
    `💳 *Payment Request — ${cafe.name}*`,
    '',
    `Order: *#${order.orderNumber}*`,
    `Amount: *₹${amount.toFixed(2)}*`,
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

export function generateMagicLinkMessage(url: string, cafeName?: string) {
  return [
    `🔓 Tap to sign in to ${cafeName ?? 'CafeQR Pro'}`,
    '',
    url,
    '',
    `This link expires in 5 minutes and works only once. If you didn't request it, ignore this message.`,
  ].join('\n');
}

// ─── Per-cafe config selector ─────────────────────────────────────────────
export interface CafeWAConfig {
  provider?: WAProvider;
  cloudToken?: string | null;
  cloudPhoneId?: string | null;
  baileysSessionId?: string | null;
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
