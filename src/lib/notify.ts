/**
 * Order/Payment notification orchestrator. Called from API routes after
 * mutations. Never throws — failures are logged on the Notification table so
 * the dashboard can surface them.
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

    // Owner + admin numbers + opted-in staff.
    const ownerMessage = generateOwnerOrderMessage(order as OrderForWA, cafe, APP_URL);
    const tos = await recipientsForNewOrder(cafe);
    await Promise.all(tos.map((to) => sendMessage({ to, message: ownerMessage, config })));

    // Customer "order received" — auto via the bot, no manual share button.
    if (order.customerPhone && cafe.settings?.notifyCustomerWA !== false) {
      const customerMsg = generateCustomerOrderReceivedMessage(order as OrderForWA, cafe, APP_URL);
      await sendMessage({ to: order.customerPhone, message: customerMsg, config });
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
    if (cafe.settings?.notifyCustomerWA === false) return;
    if (!order.customerPhone) return;
    const config = configFromCafe(cafe);
    const message = generateCustomerStatusMessage(order as OrderForWA, cafe, status, APP_URL);
    await sendMessage({ to: order.customerPhone, message, config });

    // When the order is READY and not yet paid, follow up with the payment
    // link — UPI ID in the caption + the cafe's UPI QR as image media when
    // available so the customer can pay with one tap.
    if (
      status === 'READY' &&
      order.paymentStatus !== 'PAID' &&
      cafe.settings?.paymentEnabled &&
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
