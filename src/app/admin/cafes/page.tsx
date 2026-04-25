import { prisma } from '@/lib/prisma';
import { AdminCafesTable } from '@/components/admin/cafes-table';

export const dynamic = 'force-dynamic';

export default async function AdminCafes() {
  const cafes = await prisma.cafe.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: true, plan: true, _count: { select: { orders: true, tables: true, menuItems: true } } },
  });
  return <AdminCafesTable cafes={cafes} />;
}
