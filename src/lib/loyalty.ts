import 'server-only';
import { prisma } from './prisma';
import { normalizePhone } from './whatsapp';

/**
 * Credit loyalty points for a paid order. Idempotent — the EARN row uses a
 * (accountId, orderId, type) unique key so repeat invocations are no-ops.
 *
 * Called from post-payment.ts once an order's paymentStatus flips to PAID.
 * Only fires when the cafe has CafeSettings.loyaltyEnabled and
 * loyaltyPercent > 0. Awards round(subtotal * percent / 100) points
 * (integer); 1 point = 1 unit of the cafe's currency.
 */
export async function awardLoyaltyForOrder(orderId: string): Promise<{ awarded: number; reason?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { cafe: { include: { settings: true } } },
  });
  if (!order || !order.cafe) return { awarded: 0, reason: 'order-not-found' };
  if (order.paymentStatus !== 'PAID') return { awarded: 0, reason: 'not-paid' };
  if (!order.customerPhone) return { awarded: 0, reason: 'no-phone' };

  const settings = order.cafe.settings;
  if (!settings?.loyaltyEnabled) return { awarded: 0, reason: 'disabled' };
  const pct = settings.loyaltyPercent ?? 0;
  if (pct <= 0) return { awarded: 0, reason: 'percent-zero' };

  const points = Math.round((order.subtotal ?? 0) * pct / 100);
  if (points <= 0) return { awarded: 0, reason: 'rounds-to-zero' };

  const phone = normalizePhone(order.customerPhone);
  if (!phone) return { awarded: 0, reason: 'invalid-phone' };

  // Find or create the customer's loyalty account, then upsert an EARN row.
  // The composite unique on (accountId, orderId, type) makes the EARN
  // upsert idempotent; on conflict we don't double-credit.
  const account = await prisma.loyaltyAccount.upsert({
    where: { cafeId_phone: { cafeId: order.cafe.id, phone } },
    create: {
      cafeId: order.cafe.id,
      phone,
      name: order.customerName ?? null,
    },
    update: order.customerName ? { name: order.customerName } : {},
  });

  try {
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN',
        points,
        orderId: order.id,
        note: `Order #${order.orderNumber}`,
      },
    });
  } catch (e: any) {
    // Unique violation = already credited this order. Treat as success.
    if (e?.code === 'P2002') return { awarded: 0, reason: 'already-credited' };
    throw e;
  }

  await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      points: { increment: points },
      lifetimeEarned: { increment: points },
    },
  });

  return { awarded: points };
}

export async function getLoyaltyBalance(cafeId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return prisma.loyaltyAccount.findUnique({
    where: { cafeId_phone: { cafeId, phone: normalized } },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}
