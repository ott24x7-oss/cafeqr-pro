import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { OrderBoard } from '@/components/dashboard/order-board';
import { UsageBanner } from '@/components/dashboard/usage-banner';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const orders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
    },
    include: { items: true, table: true },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="space-y-4">
      {/* Reuses the dashboard's UsageBanner — same component, same logic.
          Auto-hides below 70% on paid plans; on Free / approaching limit
          it shows a progress bar + counter ("47 / 100 orders this month")
          + an Upgrade CTA right above the live order board. */}
      <UsageBanner cafeId={cafe.id} />
      <OrderBoard initialOrders={orders as any} cafe={cafe as any} />
    </div>
  );
}
