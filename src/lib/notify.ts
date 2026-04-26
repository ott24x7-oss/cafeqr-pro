/**
 * Order/Payment notification orchestrator. Called from API routes after
 * mutations. Never throws — failures are logged on the Notification table so
 * the dashboard can surface them.
 *
 * Customer pings are gated by the per-cafe `notifyOnStatuses` array so the
 * cafe owner can pick exactly which moments deserve a WhatsApp:
 *   - PLACED       order receipt (when `notifyNewOrder` runs)
 *   - ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED  status pings
 *   - PAID         post-payment combined message (handled in post-payment.ts)
 */
import { prisma } from './prisma';
import {
  configFromCafe,
  generateOwnerOrderMessage,
  generateCustomerStatusMessage,
  generateCustomerOrderReceivedMessage,
  generatePaymentMessage,
  type WACafe,
  type OrderForWA,
} from './whatsapp';
import { sendMessage } from './whatsapp-send';

const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
const DEFAULT_STATUSES = ['PLACED', 'ACCEPTED', 'SERVED', 'PAID'];

export function customerWantsStatus(cafe: WACafe, status: string): boolean {
  if (cafe.settings?.notifyCustomerWA === false) return false;
  const list = cafe.settings?.notifyOnStatuses ?? DEFAULT_STATUSES;
  return list.includes(status);
}

async function recipientsForNewOrder(cafe: WACafe): Promise<string[]> {
  const set = new Set<string>();
  if (cafe.settings?.notifyOwnerWA && cafe.whatsappNo) set.add(cafe.whatsappNo);
  for (const n of cafe.settings?.notifyNumbers ?? []) if (n) set.add(n);
  // Staff with notifyOnNewOrder = true
  const staff = await prisma.staff.findMany({
    where: { cafeId: cafe.id, notifyOnNewOrder: true, isActive: true },
    include: { user: { select: { phone: true } } },
  });
  for (const s of staff) if (s.user.phone) set.add(s.user.phone);
  return [...set].filter(Boolean);
}

export async function notifyNewOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true, cafe: { include: { settings: true } } },
    });
    if (!order || !order.cafe) return;
    const cafe = order.cafe as WACafe;
    const config = configFromCafe(cafe);

    // Owner + admin numbers + opted-in staff (always — that's a separate
    // workflow from the customer pings).
    const ownerMessage = generateOwnerOrderMessage(order as OrderForWA, cafe, APP_URL);
    const tos = await recipientsForNewOrder(cafe);
    await Promise.all(tos.map((to) => sendMessage({ to, message: ownerMessage, config })));

    // Customer "Order Received" — only when PLACED is in the cafe's
    // preferences. Off ⇒ skip, no manual share button anywhere.
    if (order.customerPhone && customerWantsStatus(cafe, 'PLACED')) {
      const customerMsg = generateCustomerOrderReceivedMessage(order as OrderForWA, cafe, APP_URL);
      await sendMessage({ to: order.customerPhone, message: customerMsg, config });
    }

    // DELIVERY orders → loop in the configured delivery partner with the
    // address + customer phone so they can roll out without the cafe owner
    // playing telephone.
    if (order.type === 'DELIVERY' && cafe.settings?.deliveryPartnerPhone) {
      const partnerMsg = [
        `🛵 *New delivery — ${cafe.name}*`,
        '',
        `Order *#${order.orderNumber}*  ·  ₹${order.totalAmount.toFixed(0)}`,
        order.customerName ? `Customer: ${order.customerName}` : null,
        order.customerPhone ? `Phone: ${order.customerPhone}` : null,
        order.customerNote ? `Note: ${order.customerNote}` : null,
        '',
        '*Items:*',
        ...order.items.map((i) => `• ${i.quantity}× ${i.name}`),
        '',
        APP_URL ? `Order details: ${APP_URL}/dashboard/orders/${order.id}` : null,
      ].filter(Boolean).join('\n');
      await sendMessage({ to: cafe.settings.deliveryPartnerPhone, message: partnerMsg, config });
    }
  } catch (e) {
    console.error('[notify.newOrder]', e);
  }
}

export async function notifyCustomerStatus(orderId: string, status: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, cafe: { include: { settings: true } } },
    });
    if (!order || !order.cafe) return;
    const cafe = order.cafe as WACafe;
    if (!order.customerPhone) return;

    const config = configFromCafe(cafe);

    // Standard status ping (gated by the cafe's per-status preferences).
    if (customerWantsStatus(cafe, status)) {
      const message = generateCustomerStatusMessage(order as OrderForWA, cafe, status, APP_URL);
      await sendMessage({ to: order.customerPhone, message, config });
    }

    // Postpaid flow: when the order is Served, follow up with a pay-link
    // WhatsApp (UPI ID in caption + UPI QR as the message media when set).
    if (
      status === 'SERVED' &&
      cafe.settings?.paymentTiming === 'postpaid' &&
      cafe.settings?.paymentEnabled !== false &&
      order.paymentStatus !== 'PAID' &&
      cafe.settings?.upiId
    ) {
      const payMsg = generatePaymentMessage(order as OrderForWA, cafe, APP_URL);
      await sendMessage({
        to: order.customerPhone,
        message: payMsg,
        config,
        imageUrl: cafe.settings?.upiQrUrl ?? undefined,
      });
    }
  } catch (e) {
    console.error('[notify.customerStatus]', e);
  }
}

export async function sendOTP(phone: string, otp: string, cafe?: WACafe) {
  const message = [
    `🔐 *${cafe?.name ?? 'CafeQR Pro'}*`,
    '',
    `Your verification code is *${otp}*`,
    `It will expire in 10 minutes.`,
    '',
    `Do not share this code with anyone.`,
  ].join('\n');

  if (cafe) {
    const config = configFromCafe(cafe);
    return sendMessage({ to: phone, message, config });
  }
  return sendMessage({ to: phone, message, provider: 'manual' });
}
