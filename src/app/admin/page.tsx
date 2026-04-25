import { Coffee, Users, ListOrdered, IndianRupee } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const [totalCafes, activeCafes, trialCafes, totalUsers, totalOrders, revenueAgg, recentCafes] = await Promise.all([
    prisma.cafe.count(),
    prisma.cafe.count({ where: { status: 'ACTIVE' } }),
    prisma.cafe.count({ where: { status: 'TRIAL' } }),
    prisma.user.count(),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmount: true } }),
    prisma.cafe.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { owner: true, _count: { select: { orders: true } } } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Super Admin</h1>
        <p className="text-coffee-600 text-sm">Platform overview · all cafes</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total cafes', v: totalCafes, s: `${activeCafes} active · ${trialCafes} trial`, i: Coffee },
          { l: 'Users', v: totalUsers, s: 'Owners + staff', i: Users },
          { l: 'Orders', v: totalOrders, s: 'Completed', i: ListOrdered },
          { l: 'GMV', v: formatCurrency(revenueAgg._sum.totalAmount ?? 0), s: 'All time', i: IndianRupee },
        ].map((s) => (
          <div key={s.l} className="card-warm">
            <s.i className="h-4 w-4 text-caramel-dark" />
            <div className="text-xs text-coffee-500 mt-1">{s.l}</div>
            <div className="font-display text-2xl font-bold text-coffee-900">{s.v}</div>
            <div className="text-xs text-coffee-500">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="card-warm">
        <h2 className="font-bold text-coffee-900 mb-3">Recent cafes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-coffee-500 border-b border-coffee-100">
              <th className="py-2">Cafe</th><th>Owner</th><th>Status</th><th>Orders</th><th>Joined</th>
            </tr></thead>
            <tbody>
              {recentCafes.map((c) => (
                <tr key={c.id} className="border-b border-coffee-50 last:border-0">
                  <td className="py-2">
                    <Link href={`/admin/cafes/${c.id}`} className="font-semibold text-coffee-900 hover:underline">{c.name}</Link>
                    <div className="text-xs text-coffee-500">/{c.slug}</div>
                  </td>
                  <td>{c.owner.name ?? c.owner.email}</td>
                  <td><span className={`pill ${c.status === 'ACTIVE' ? 'pill-wa' : c.status === 'TRIAL' ? 'pill-amber' : 'pill-rose'}`}>{c.status}</span></td>
                  <td>{c._count.orders}</td>
                  <td className="text-xs">{formatDate(c.createdAt, { dateStyle: 'medium', timeStyle: undefined })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
