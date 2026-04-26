/**
 * Single source of truth for "what to do after a payment confirms".
 *
 * Wires together: invoice PDF → WhatsApp delivery to customer → in-app
 * notification record. Idempotent — safe to call multiple times for the
 * same order; the WA delivery will only fire once thanks to the
 * `paymentNotifiedAt` marker on the Notification trail.
 */
import 'server-only';
import { prisma } from './prisma';
import { renderInvoicePdf, invoiceDataFromOrder } from './invoice-pdf';
import { configFromCafe, type WACafe } from './whatsapp';
import { sendMessage } from './whatsapp-send';
import { customerWantsStatus } from './notify';

const APP_URL = process.env.APP_URL || process.env.NEXTAUTH_URL || '';

export interface PaymentConfirmedResult {
  delivered: boolean;
  reason?: string;
}

const sentLock = (globalThis as any).__cafeqr_invoice_sent ??= new Set<string>();

export async function onPaymentConfirmed(orderId: string): Promise<PaymentConfirmedResult> {
  if (sentLock.has(orderId)) return { delivered: false, reason: 'already-sent' };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      table: true,
      payment: true,
      cafe: { include: { settings: true } },
    },
  });
  if (!order || !order.cafe) return { delivered: false, reason: 'order-not-found' };
  if (order.paymentStatus !== 'PAID') return { delivered: false, reason: 'not-paid' };

  // Mark to dedupe before any await — small race window is acceptable here.
  sentLock.add(orderId);

  // Also drop a Notification row so the dashboard surfaces this even when
  // the bot can't deliver (e.g. no customer phone).
  await prisma.notification.create({
    data: {
      cafeId: order.cafe.id,
      kind: 'PAYMENT',
      title: `Payment received for #${order.orderNumber}`,
      body: `₹${order.totalAmount.toFixed(0)} • PAID • Invoice sent to customer`,
      link: `/dashboard/orders/${order.id}`,
    },
  }).catch(() => {});

  if (!order.customerPhone) {
    return { delivered: false, reason: 'no-customer-phone' };
  }

  const cafe = order.cafe as WACafe;
  if (!customerWantsStatus(cafe, 'PAID')) {
    return { delivered: false, reason: 'paid-notification-disabled' };
  }

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(invoiceDataFromOrder(order));
  } catch (e: any) {
    return { delivered: false, reason: `pdf-render-failed: ${e?.message ?? e}` };
  }

  const config = configFromCafe(cafe);

  // Caption layout:
  //   – Always: payment confirmation + thank-you + total + invoice PDF.
  //   – Only when paymentTiming = 'postpaid': also include the cafe's review
  //     link, since the customer is leaving right after paying. For prepaid
  //     the review link is fired separately by the owner via the
  //     "Send feedback" button on the order detail page (when the customer
  //     actually leaves, not while they're still eating).
  const reviewUrl = cafe.settings?.googleReviewUrl?.trim();
  const isPostpaid = cafe.settings?.paymentTiming === 'postpaid';
  const paidAmount = (order as any).payableAmount ?? order.totalAmount;
  const message = [
    `🧾 *Payment received — ${cafe.name}*`,
    '',
    `Order *#${order.orderNumber}* is paid. Thank you for visiting! 🙏`,
    `Amount: ₹${paidAmount.toFixed(2)}`,
    APP_URL ? `View online: ${APP_URL}/order/${order.id}` : null,
    '',
    'Your invoice is attached above 👆',
    (isPostpaid && reviewUrl) ? `\n⭐ Loved your visit? Drop a quick review:\n${reviewUrl}` : null,
  ].filter(Boolean).join('\n');

  const result = await sendMessage({
    to: order.customerPhone,
    message,
    config,
    document: {
      buffer: pdf,
      fileName: `invoice-${order.orderNumber}.pdf`,
      mimetype: 'application/pdf',
    },
  });

  if (!result.ok) {
    // Don't keep the lock if delivery failed — let it retry later.
    sentLock.delete(orderId);
    return { delivered: false, reason: result.error ?? 'wa-send-failed' };
  }

  return { delivered: true };
}
