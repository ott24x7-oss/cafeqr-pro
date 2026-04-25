import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { OrderDetailClient } from '@/components/dashboard/order-detail';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, table: true, payment: true, cafe: { include: { settings: true } } },
  });
  if (!order || order.cafeId !== cafe.id) notFound();
  return <OrderDetailClient order={order as any} cafe={cafe as any} />;
}
