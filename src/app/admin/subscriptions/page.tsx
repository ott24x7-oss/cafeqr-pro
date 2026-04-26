import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';
import { AdminSubscriptions } from '@/components/admin/admin-subscriptions';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();

  const [subs, totals] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        cafe: { select: { id: true, name: true, slug: true, owner: { select: { email: true, name: true } } } },
        plan: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(totals.map((t) => [t.status, t._count._all]));
  const revenue = totals
    .filter((t) => t.status === 'active' || t.status === 'expired')
    .reduce((s, t) => s + (t._sum.amount ?? 0), 0);

  return (
    <AdminSubscriptions
      initialSubs={subs as any}
      stats={{
        active:    statusCounts.active    ?? 0,
        pending:   statusCounts.pending   ?? 0,
        expired:   statusCounts.expired   ?? 0,
        cancelled: statusCounts.cancelled ?? 0,
        revenue,
      }}
    />
  );
}
