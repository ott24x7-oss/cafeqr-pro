import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { TablesManager } from '@/components/dashboard/tables-manager';
import { CafeStoreLink } from '@/components/dashboard/cafe-store-link';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const tables = await prisma.table.findMany({
    where: { cafeId: cafe.id },
    orderBy: { number: 'asc' },
  });
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <CafeStoreLink slug={cafe.slug} cafeName={cafe.name} appUrl={appUrl} />
      <TablesManager initialTables={tables} cafe={cafe} appUrl={appUrl} />
    </div>
  );
}
