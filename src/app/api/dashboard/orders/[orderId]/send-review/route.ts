/**
 * Manually fire the review-link WhatsApp to the customer, via the cafe's bot.
 *
 * Used by the "Send feedback" button on the order detail page in prepaid
 * mode — the owner taps it as the customer is leaving (post-meal), and the
 * customer gets a short thank-you + the cafe's Google review URL.
 *
 * The review URL is *only* the one configured in Settings →
 * Payment → Google review URL. We never auto-generate /review/<id>.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { configFromCafe } from '@/lib/whatsapp';
import { sendMessage } from '@/lib/whatsapp-send';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { cafe: { include: { settings: true } } },
  });
  if (!order || order.cafeId !== cafe.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!order.customerPhone) {
    return NextResponse.json({ ok: false, error: 'No customer phone on this order' }, { status: 400 });
  }

  const settings = order.cafe?.settings;
  const reviewUrl = settings?.googleReviewUrl?.trim();
  if (!reviewUrl) {
    return NextResponse.json(
      { ok: false, error: 'Set a Google review URL in Settings → Payment first.' },
      { status: 400 }
    );
  }
  if (settings?.reviewEnabled === false) {
    return NextResponse.json({ ok: false, error: 'Reviews are disabled for this cafe.' }, { status: 400 });
  }

  const config = configFromCafe(order.cafe as any);
  const message = [
    `🙏 *Thanks for visiting ${order.cafe?.name ?? 'us'}!*`,
    '',
    `Your order *#${order.orderNumber}* — total ₹${order.totalAmount.toFixed(0)}.`,
    '',
    `We'd love a quick review — it helps a lot:`,
    reviewUrl,
  ].join('\n');

  const result = await sendMessage({ to: order.customerPhone, message, config });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? 'Send failed', link: result.link });
  }

  await prisma.notification.create({
    data: {
      cafeId: cafe.id,
      kind: 'REVIEW',
      title: `Review link sent for #${order.orderNumber}`,
      body: `Sent to ${order.customerPhone}`,
      link: `/dashboard/orders/${order.id}`,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, provider: result.provider });
}
