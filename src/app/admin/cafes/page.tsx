import { prisma } from '@/lib/prisma';
import { AdminCafesTable } from '@/components/admin/cafes-table';
import { CustomDomainPanel } from '@/components/admin/custom-domain-panel';

export const dynamic = 'force-dynamic';

export default async function AdminCafes() {
  const [cafes, plans, domainRequests] = await Promise.all([
    prisma.cafe.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true, plan: true, _count: { select: { orders: true, tables: true, menuItems: true } } },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, priceMonthly: true },
    }),
    prisma.cafe.findMany({
      where: { customDomain: { not: null } },
      orderBy: [{ customDomainStatus: 'asc' }, { customDomainRequestedAt: 'desc' }],
      select: {
        id: true, name: true, slug: true,
        customDomain: true, customDomainStatus: true, customDomainNote: true,
        customDomainRequestedAt: true, customDomainVerifiedAt: true,
        owner: { select: { email: true, name: true } },
      },
    }),
  ]);
  return (
    <>
      <CustomDomainPanel requests={domainRequests as any} />
      <AdminCafesTable cafes={cafes} plans={plans} />
    </>
  );
}
