import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { TablesManager } from '@/components/dashboard/tables-manager';

export const dynamic = 'force-dynamic';

export default async function TablesPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const tables = await prisma.table.findMany({
    where: { cafeId: cafe.id },
    orderBy: { number: 'asc' },
  });
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  return <TablesManager initialTables={tables} cafe={cafe} appUrl={appUrl} />;
}
