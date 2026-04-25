import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { PaymentsTable } from '@/components/dashboard/payments-table';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const payments = await prisma.payment.findMany({
    where: { order: { cafeId: cafe.id } },
    include: { order: { include: { table: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return <PaymentsTable initialPayments={payments as any} />;
}
