'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, RefreshCw, CheckCircle2, X, Loader2, Filter, IndianRupee, AlertCircle, ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const STATUS_TONE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-800',
  pending:   'bg-amber-100 text-amber-800',
  expired:   'bg-coffee-100 text-coffee-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

interface Stats {
  active: number; pending: number; expired: number; cancelled: number; revenue: number;
}

export function AdminSubscriptions({
  initialSubs, stats,
}: { initialSubs: any[]; stats: Stats }) {
  const [subs, setSubs] = useState(initialSubs);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return [s.cafe?.name, s.cafe?.slug, s.cafe?.owner?.email, s.cafe?.owner?.name, s.plan?.name, s.transactionId]
        .some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [subs, q, statusFilter]);

  async function markPaid(s: any) {
    const utr = window.prompt(
      `Mark subscription as paid for ${s.cafe?.name ?? 'cafe'} (${s.plan?.name})?\n\nOptional UTR / transaction ID:`
    );
    if (utr === null) return; // cancelled
    setBusyId(s.id);
    const r = await fetch(`/api/admin/subscriptions/${s.id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: utr.trim() || undefined }),
    });
    setBusyId(null);
    if (r.ok) {
      const now = new Date().toISOString();
      setSubs((cur) => cur.map((x) =>
        x.id === s.id
          ? { ...x, status: 'active', paidAt: now, transactionId: (utr.trim() || x.transactionId || 'MANUAL'), startsAt: now }
          : (x.cafeId === s.cafeId && x.status === 'active' ? { ...x, status: 'expired' } : x)
      ));
      toast.success('Marked as paid', `${s.cafe?.name} → ${s.plan?.name}`);
    } else {
      const data = await r.json().catch(() => ({} as any));
      toast.error('Could not mark paid', data.error ?? '');
    }
  }

  async function cancel(s: any) {
    if (!window.confirm(`Cancel ${s.plan?.name} subscription for ${s.cafe?.name}?`)) return;
    setBusyId(s.id);
    const r = await fetch(`/api/admin/subscriptions/${s.id}/cancel`, { method: 'POST' });
    setBusyId(null);
    if (r.ok) {
      setSubs((cur) => cur.map((x) => (x.id === s.id ? { ...x, status: 'cancelled' } : x)));
      toast.success('Subscription cancelled');
    } else {
      toast.error('Cancel failed');
    }
  }

  async function runVerify() {
    setScanning(true);
    const r = await fetch('/api/admin/subscriptions/run-verify', { method: 'POST' });
    const data = await r.json().catch(() => ({} as any));
    setScanning(false);
    if (data.matched > 0) {
      toast.success(`${data.matched} subscription(s) auto-verified`, `Scanned ${data.scanned} email(s)`);
      // Optimistically refresh — easier than splicing matched rows in.
      setTimeout(() => window.location.reload(), 600);
    } else if (data.errors?.length) {
      toast.error('Scan completed with errors', data.errors[0]);
    } else {
      toast.success(`Scanned ${data.scanned} email(s)`, 'No new matches');
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Subscriptions</h1>
          <p className="text-coffee-600 text-sm">Plan purchases across every cafe — verify, scan, cancel.</p>
        </div>
        <Button onClick={runVerify} disabled={scanning} variant="outline" size="sm">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
          Run auto-verify now
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Active',    v: stats.active,    tone: 'text-emerald-700' },
          { l: 'Pending',   v: stats.pending,   tone: 'text-amber-700'   },
          { l: 'Expired',   v: stats.expired,   tone: 'text-coffee-700'  },
          { l: 'Cancelled', v: stats.cancelled, tone: 'text-rose-700'    },
          { l: 'Lifetime revenue', v: formatCurrency(stats.revenue), tone: 'text-coffee-900', wide: true },
        ].map((c) => (
          <div key={c.l} className={`card-warm ${c.wide ? 'col-span-2' : ''}`}>
            <div className="text-xs text-coffee-500">{c.l}</div>
            <div className={`font-display text-2xl font-bold ${c.tone} mt-1`}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="card-warm !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-coffee-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <Input
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cafe, owner email, plan, UTR…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['', 'pending', 'active', 'expired', 'cancelled'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`pill text-xs ${statusFilter === s ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-700'}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-coffee-500">No subscriptions match.</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-coffee-700">
                  <tr>
                    <th className="text-left p-3">Cafe / Owner</th>
                    <th className="text-left p-3">Plan</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">UTR</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Renews / paid</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t border-coffee-100 hover:bg-cream-50">
                      <td className="p-3">
                        <div className="font-semibold text-coffee-900">{s.cafe?.name ?? '—'}</div>
                        <div className="text-xs text-coffee-500">{s.cafe?.owner?.email ?? '—'}</div>
                      </td>
                      <td className="p-3">{s.plan?.name ?? '—'}<div className="text-[10px] text-coffee-500">{s.billing}</div></td>
                      <td className="p-3 text-right">
                        <div className="font-bold">{formatCurrency(s.payableAmount ?? s.amount)}</div>
                        {s.payableAmount && s.payableAmount !== s.amount && (
                          <div className="text-[10px] text-coffee-500">base {formatCurrency(s.amount)}</div>
                        )}
                      </td>
                      <td className="p-3"><span className={`pill ${STATUS_TONE[s.status] ?? 'bg-coffee-100 text-coffee-700'} text-xs`}>{s.status}</span></td>
                      <td className="p-3 text-xs text-coffee-600 break-all max-w-[180px]">{s.transactionId ?? '—'}</td>
                      <td className="p-3 text-xs text-coffee-600 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                      <td className="p-3 text-xs text-coffee-600 whitespace-nowrap">
                        {s.paidAt ? `Paid ${formatDate(s.paidAt, { dateStyle: 'medium', timeStyle: undefined })}` : null}
                        {s.endsAt ? <div>Ends {formatDate(s.endsAt, { dateStyle: 'medium', timeStyle: undefined })}</div> : null}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col items-end gap-1">
                          {s.status === 'pending' && (
                            <Button size="sm" variant="accent" disabled={busyId === s.id} onClick={() => markPaid(s)}>
                              {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Mark paid
                            </Button>
                          )}
                          {(s.status === 'pending' || s.status === 'active') && (
                            <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => cancel(s)}>
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-coffee-100">
              {filtered.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-coffee-900 truncate">{s.cafe?.name}</div>
                      <div className="text-[11px] text-coffee-500 truncate">{s.cafe?.owner?.email}</div>
                      <div className="text-xs text-coffee-700 mt-1">{s.plan?.name} · {s.billing}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-coffee-900">{formatCurrency(s.payableAmount ?? s.amount)}</div>
                      <span className={`mt-1 inline-block pill text-[10px] ${STATUS_TONE[s.status]}`}>{s.status}</span>
                    </div>
                  </div>
                  {s.transactionId && (
                    <div className="text-[11px] text-coffee-500 mt-2 break-all">UTR: {s.transactionId}</div>
                  )}
                  <div className="text-[10px] text-coffee-400 mt-1">{formatDate(s.createdAt)}</div>
                  <div className="flex gap-2 mt-3">
                    {s.status === 'pending' && (
                      <Button size="sm" variant="accent" className="flex-1" disabled={busyId === s.id} onClick={() => markPaid(s)}>
                        <CheckCircle2 className="h-3 w-3" /> Mark paid
                      </Button>
                    )}
                    {(s.status === 'pending' || s.status === 'active') && (
                      <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => cancel(s)}>
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
