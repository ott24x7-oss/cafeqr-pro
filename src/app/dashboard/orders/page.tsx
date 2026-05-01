import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { OrderBoard } from '@/components/dashboard/order-board';
import { UsageBanner } from '@/components/dashboard/usage-banner';
import { planToLimits, evaluateOrderLimit } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Single Promise.all — orders board + usage-banner data in one
  // round-trip-shaped wait instead of three sequential ones.
  const [orders, ordersThisMonth] = await Promise.all([
    prisma.order.findMany({
      where: {
        cafeId: cafe.id,
        status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
      },
      include: { items: true, table: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({
      where: { cafeId: cafe.id, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
    }),
  ]);

  const limits = planToLimits((cafe as any).plan);
  const decision = evaluateOrderLimit(ordersThisMonth, limits.maxOrdersPerMonth);

  return (
    <div className="space-y-4">
      <UsageBanner plan={limits} decision={decision} />
      <OrderBoard initialOrders={orders as any} cafe={cafe as any} />
    </div>
  );
}
