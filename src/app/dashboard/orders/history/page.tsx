import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { OrderHistory } from '@/components/dashboard/order-history';

export const dynamic = 'force-dynamic';

export default async function OrderHistoryPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const tables = await prisma.table.findMany({
    where: { cafeId: cafe.id },
    select: { id: true, number: true, name: true },
    orderBy: { number: 'asc' },
  });
  return <OrderHistory tables={tables} />;
}
