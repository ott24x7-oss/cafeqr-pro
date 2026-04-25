import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CustomerOrderTracker } from '@/components/customer/order-tracker';

export const dynamic = 'force-dynamic';

export default async function OrderTrackPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true, table: true, cafe: { include: { settings: true } }, payment: true },
  });
  if (!order) notFound();
  return <CustomerOrderTracker order={order as any} />;
}
