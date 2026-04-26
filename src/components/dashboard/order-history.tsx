'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Download, Loader2, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
const TYPES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];

type Filters = {
  q: string;
  status: string[];
  type: string[];
  from: string;
  to: string;
  tableId: string;
};

const STATUS_TONE: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-emerald-100 text-emerald-800',
  SERVED: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-coffee-100 text-coffee-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

const PAY_TONE: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800',
  UNPAID: 'bg-coffee-100 text-coffee-700',
  FAILED: 'bg-rose-100 text-rose-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export function OrderHistory({ tables }: { tables: { id: string; number: string; name: string | null }[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [filters, setFilters] = useState<Filters>({
    q: '',
    status: ['COMPLETED'],
    type: [],
    from: monthAgo,
    to: today,
    tableId: '',
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.status.length) p.set('status', filters.status.join(','));
    if (filters.type.length) p.set('type', filters.type.join(','));
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    if (filters.tableId) p.set('tableId', filters.tableId);
    return p.toString();
  }, [filters]);

  async function load(reset = true) {
    setLoading(true);
    const url = `/api/dashboard/orders/history?${queryString}${!reset && nextCursor ? `&cursor=${nextCursor}` : ''}`;
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) return;
    setRevenue(data.revenue);
    setTotalCount(data.totalCount);
    setNextCursor(data.nextCursor);
    setOrders(reset ? data.orders : [...orders, ...data.orders]);
  }

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [queryString]);

  function toggle(arr: string[], v: string) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function exportCsv() {
    if (!orders.length) return;
    const header = ['Order #', 'Date', 'Type', 'Table', 'Customer', 'Phone', 'Items', 'Subtotal', 'Tax', 'Total', 'Status', 'Payment'];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString(),
      o.type,
      o.table?.number ?? '',
      o.customerName ?? '',
      o.customerPhone ?? '',
      o.items.length,
      o.subtotal.toFixed(2),
      o.taxAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.status,
      o.paymentStatus,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${filters.from}-to-${filters.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Order history</h1>
          <p className="text-coffee-600 text-sm">{totalCount.toLocaleString()} orders · {formatCurrency(revenue)} revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load(true)} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} size="sm" disabled={!orders.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Search bar — always visible */}
      <div className="card-warm !p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Search order #, customer name or phone…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
            <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="label">From</label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div>
              <label className="label">To</label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="label">Table</label>
              <select
                className="input"
                value={filters.tableId}
                onChange={(e) => setFilters({ ...filters, tableId: e.target.value })}
              >
                <option value="">Any table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.number}{t.name ? ` — ${t.name}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Quick range</label>
              <div className="flex flex-wrap gap-1">
                {[
                  ['Today', 0],
                  ['7d', 6],
                  ['30d', 29],
                  ['90d', 89],
                ].map(([l, d]) => (
                  <button
                    key={l as string}
                    onClick={() => {
                      const t = new Date();
                      const f = new Date(Date.now() - (d as number) * 86400000);
                      setFilters({ ...filters, from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) });
                    }}
                    className="pill bg-cream-200 text-coffee-800 text-xs"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilters({ ...filters, status: toggle(filters.status, s) })}
                    className={`pill text-xs ${filters.status.includes(s) ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilters({ ...filters, type: toggle(filters.type, t) })}
                    className={`pill text-xs ${filters.type.includes(t) ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-700'}`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="card-warm !p-0 overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="py-12 text-center text-coffee-500">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-coffee-500">
            No orders match these filters.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-coffee-700">
                  <tr>
                    <th className="text-left p-3">Order</th>
                    <th className="text-left p-3">When</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Items</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Payment</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-coffee-100 hover:bg-cream-50">
                      <td className="p-3 font-semibold text-coffee-900">#{o.orderNumber}</td>
                      <td className="p-3 text-coffee-600 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="p-3">
                        <div className="text-coffee-900">{o.customerName ?? (o.table ? `Table ${o.table.number}` : '—')}</div>
                        {o.customerPhone && <div className="text-xs text-coffee-500">{o.customerPhone}</div>}
                      </td>
                      <td className="p-3 text-coffee-700">{o.items.length}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(o.totalAmount)}</td>
                      <td className="p-3"><span className={`pill ${STATUS_TONE[o.status]} text-xs`}>{o.status}</span></td>
                      <td className="p-3"><span className={`pill ${PAY_TONE[o.paymentStatus]} text-xs`}>{o.paymentStatus.replace('_', ' ')}</span></td>
                      <td className="p-3">
                        <Link href={`/dashboard/orders/${o.id}`} className="text-coffee-600 hover:text-coffee-900">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-coffee-100">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/dashboard/orders/${o.id}`}
                  className="flex items-start justify-between p-4 hover:bg-cream-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-coffee-900">#{o.orderNumber}</span>
                      <span className={`pill ${STATUS_TONE[o.status]} text-[10px]`}>{o.status}</span>
                    </div>
                    <div className="text-xs text-coffee-600 mt-1">
                      {formatDate(o.createdAt)}{o.table ? ` · Table ${o.table.number}` : ''}
                    </div>
                    {(o.customerName || o.customerPhone) && (
                      <div className="text-xs text-coffee-500 mt-0.5 truncate">
                        {o.customerName} {o.customerPhone && `· ${o.customerPhone}`}
                      </div>
                    )}
                    <div className="text-xs text-coffee-500 mt-1">{o.items.length} items</div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <div className="font-bold text-coffee-900">{formatCurrency(o.totalAmount)}</div>
                    <div className={`mt-1 pill ${PAY_TONE[o.paymentStatus]} text-[10px]`}>
                      {o.paymentStatus.replace('_', ' ')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(false)} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Load more
          </Button>
        </div>
      )}
    </div>
  );
}
