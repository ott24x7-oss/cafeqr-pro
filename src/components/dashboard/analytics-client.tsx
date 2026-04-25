'use client';

import { Download, TrendingUp, Receipt, Coffee, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export function AnalyticsClient({ cafe, orders, revenueByDay, byTable, topItems, gstCollected, pendingAmount }: any) {
  const totalRevenue = orders.reduce((s: number, o: any) => o.status !== 'CANCELLED' ? s + o.totalAmount : s, 0);
  const totalOrders = orders.filter((o: any) => o.status !== 'CANCELLED').length;
  const aov = totalOrders ? totalRevenue / totalOrders : 0;

  function exportCsv() {
    const rows = [['Date', 'Status', 'Type', 'Total', 'Tax', 'Payment'], ...orders.map((o: any) => [
      new Date(o.createdAt).toISOString(),
      o.status,
      o.type,
      o.totalAmount,
      o.taxAmount,
      o.paymentStatus,
    ])];
    const csv = rows.map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${cafe.slug}-orders.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Analytics</h1>
          <p className="text-coffee-600 text-sm">Last 30 days · {cafe.name}</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Revenue', v: formatCurrency(totalRevenue), i: TrendingUp },
          { l: 'Orders', v: totalOrders, i: Coffee },
          { l: 'Avg order value', v: formatCurrency(aov), i: Users },
          { l: 'GST collected', v: formatCurrency(gstCollected), i: Receipt },
        ].map((s) => (
          <div key={s.l} className="card-warm">
            <s.i className="h-4 w-4 text-caramel-dark" />
            <div className="text-xs text-coffee-500 mt-1">{s.l}</div>
            <div className="font-display text-2xl font-bold text-coffee-900">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Revenue trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5BE" />
                <XAxis dataKey="d" stroke="#85604A" fontSize={11} />
                <YAxis stroke="#85604A" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#FFFBF5', border: '1px solid #E8D5BE', borderRadius: 12 }}
                  labelStyle={{ color: '#3E2D24' }}
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6B4E3D" strokeWidth={2} dot={{ fill: '#D4A574' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Top selling items</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5BE" />
                <XAxis dataKey="name" stroke="#85604A" fontSize={10} />
                <YAxis stroke="#85604A" fontSize={11} />
                <Tooltip contentStyle={{ background: '#FFFBF5', border: '1px solid #E8D5BE', borderRadius: 12 }} />
                <Bar dataKey="_sum.quantity" fill="#A0775A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Top tables</h2>
          {byTable.length === 0 ? (
            <div className="text-coffee-500 text-sm">No table data yet.</div>
          ) : (
            <ul className="space-y-2">
              {byTable.map((t: any, i: number) => (
                <li key={t.table} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cream-200 text-xs font-bold text-coffee-800">{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-coffee-900">Table {t.table}</div>
                    <div className="text-xs text-coffee-500">{t.count} orders</div>
                  </div>
                  <div className="font-bold text-coffee-900">{formatCurrency(t.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Money owed</h2>
          <div className="font-display text-3xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</div>
          <p className="text-sm text-coffee-600 mt-1">Across orders not yet paid or pending verification.</p>
        </div>
      </div>
    </div>
  );
}
