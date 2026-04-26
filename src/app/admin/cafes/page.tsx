import { prisma } from '@/lib/prisma';
import { AdminCafesTable } from '@/components/admin/cafes-table';

export const dynamic = 'force-dynamic';

export default async function AdminCafes() {
  const [cafes, plans] = await Promise.all([
    prisma.cafe.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true, plan: true, _count: { select: { orders: true, tables: true, menuItems: true } } },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, priceMonthly: true },
    }),
  ]);
  return <AdminCafesTable cafes={cafes} plans={plans} />;
}
