import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { OrderBoard } from '@/components/dashboard/order-board';

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
  return <OrderBoard initialOrders={orders as any} cafe={cafe as any} />;
}
