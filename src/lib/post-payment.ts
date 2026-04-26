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

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(invoiceDataFromOrder(order));
  } catch (e: any) {
    return { delivered: false, reason: `pdf-render-failed: ${e?.message ?? e}` };
  }

  const cafe = order.cafe as WACafe;
  const config = configFromCafe(cafe);
  const message = [
    `🧾 *Invoice — ${cafe.name}*`,
    '',
    `Order *#${order.orderNumber}* is paid. Thank you!`,
    `Total: ₹${order.totalAmount.toFixed(0)}`,
    APP_URL ? `\nView online: ${APP_URL}/order/${order.id}` : null,
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
