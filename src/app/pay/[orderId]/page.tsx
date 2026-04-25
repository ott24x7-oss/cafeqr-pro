import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PayClient } from '@/components/customer/pay-client';

export const dynamic = 'force-dynamic';

export default async function PayPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { cafe: { include: { settings: true } }, items: true, payment: true },
  });
  if (!order) notFound();
  return <PayClient order={order as any} />;
}
