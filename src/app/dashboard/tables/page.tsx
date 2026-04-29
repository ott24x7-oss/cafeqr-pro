import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { TablesManager } from '@/components/dashboard/tables-manager';
import { CafeStoreLink } from '@/components/dashboard/cafe-store-link';
import { withLiveOccupancy } from '@/lib/table-occupancy';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const rawTables = await prisma.table.findMany({
    where: { cafeId: cafe.id },
    orderBy: { number: 'asc' },
  });
  // Compute isOccupied live from open-order count, ignoring the stored
  // flag. Completed / cancelled / deleted orders surface as Available
  // on the next render even if a previous write path forgot to clear.
  const tables = await withLiveOccupancy(cafe.id, rawTables);
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <CafeStoreLink
        slug={cafe.slug}
        cafeName={cafe.name}
        appUrl={appUrl}
        customDomain={cafe.customDomain}
        customDomainStatus={cafe.customDomainStatus}
      />
      <TablesManager initialTables={tables} cafe={cafe} appUrl={appUrl} />
    </div>
  );
}
