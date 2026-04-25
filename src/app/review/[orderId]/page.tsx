import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ReviewForm } from '@/components/customer/review-form';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { cafe: { include: { settings: true } }, review: true },
  });
  if (!order) notFound();
  return <ReviewForm order={order as any} />;
}
