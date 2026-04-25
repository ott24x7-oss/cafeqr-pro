import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { AnalyticsClient } from '@/components/dashboard/analytics-client';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [orders, revenueByDay, byTable, topItems, gstAgg, payments] = await Promise.all([
    prisma.order.findMany({
      where: { cafeId: cafe.id, createdAt: { gte: since } },
      select: { totalAmount: true, taxAmount: true, createdAt: true, status: true, paymentStatus: true, type: true, tableId: true },
    }),
    prisma.$queryRaw<{ d: string; revenue: number; count: number }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as d,
             SUM("totalAmount")::float as revenue,
             COUNT(*)::int as count
        FROM "Order"
       WHERE "cafeId" = ${cafe.id}
         AND "createdAt" >= ${since}
         AND status NOT IN ('CANCELLED')
       GROUP BY date_trunc('day', "createdAt")
       ORDER BY date_trunc('day', "createdAt") ASC
    `.catch(() => []),
    prisma.order.groupBy({
      by: ['tableId'],
      where: { cafeId: cafe.id, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: true,
    }).then(async (rows: any) => {
      const ids = rows.map((r: any) => r.tableId).filter(Boolean);
      const tables = await prisma.table.findMany({ where: { id: { in: ids } } });
      return rows
        .filter((r: any) => r.tableId)
        .map((r: any) => ({
          table: tables.find((t) => t.id === r.tableId)?.number ?? '—',
          revenue: r._sum.totalAmount ?? 0,
          count: r._count,
        }))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 8);
    }),
    prisma.orderItem.groupBy({
      by: ['name'],
      where: { order: { cafeId: cafe.id, createdAt: { gte: since }, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.order.aggregate({
      where: { cafeId: cafe.id, createdAt: { gte: since } },
      _sum: { taxAmount: true, totalAmount: true },
    }),
    prisma.order.findMany({
      where: { cafeId: cafe.id, paymentStatus: { in: ['UNPAID', 'PENDING_VERIFICATION'] } },
      select: { totalAmount: true },
    }),
  ]);

  const pendingAmount = payments.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <AnalyticsClient
      cafe={cafe}
      orders={orders}
      revenueByDay={revenueByDay}
      byTable={byTable}
      topItems={topItems}
      gstCollected={gstAgg._sum.taxAmount ?? 0}
      pendingAmount={pendingAmount}
    />
  );
}
