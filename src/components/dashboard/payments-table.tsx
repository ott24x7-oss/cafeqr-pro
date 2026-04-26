'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, X, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function PaymentsTable({ initialPayments }: { initialPayments: any[] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState('all');
  const [verifying, setVerifying] = useState(false);

  async function setStatus(orderId: string, status: string) {
    const r = await fetch(`/api/dashboard/orders/${orderId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      setPayments((cur) => cur.map((p) => p.orderId === orderId ? { ...p, status, order: { ...p.order, paymentStatus: status } } : p));
      toast.success('Updated');
    }
  }

  async function verifyFromEmail() {
    setVerifying(true);
    const r = await fetch('/api/dashboard/payments/verify-from-email', { method: 'POST' });
    const data = await r.json().catch(() => ({}));
    setVerifying(false);
    if (!r.ok) {
      toast.error('Verify failed', data.error ?? 'See server logs');
      return;
    }
    if (data.errors?.length) {
      toast.error(`Scan ran with ${data.errors.length} error${data.errors.length > 1 ? 's' : ''}`, data.errors[0]);
    }
    if (data.matched > 0) {
      toast.success(`✅ ${data.matched} payment${data.matched > 1 ? 's' : ''} auto-verified`, `Scanned ${data.scanned} email(s)`);
      // Refresh list
      const matchedIds: string[] = (data.matches ?? []).map((m: any) => m.orderId);
      setPayments((cur) =>
        cur.map((p) =>
          matchedIds.includes(p.orderId)
            ? { ...p, status: 'PAID', order: { ...p.order, paymentStatus: 'PAID' } }
            : p
        )
      );
    } else {
      toast.success(`Scanned ${data.scanned} email(s)`, 'No new matches found');
    }
  }

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
  const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'PENDING_VERIFICATION').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Payments</h1>
          <p className="text-coffee-600 text-sm">Verify and track UPI / cash payments</p>
        </div>
        <Button onClick={verifyFromEmail} disabled={verifying} variant="outline" size="sm">
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          <span className="hidden sm:inline">Verify from email</span>
          <span className="sm:hidden">Check email</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card-warm">
          <div className="text-xs text-coffee-500">Total received</div>
          <div className="font-display text-xl md:text-2xl font-bold text-coffee-900">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="card-warm">
          <div className="text-xs text-coffee-500">Pending verification</div>
          <div className="font-display text-xl md:text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
        </div>
        <div className="card-warm col-span-2 md:col-span-1">
          <div className="text-xs text-coffee-500">Transactions</div>
          <div className="font-display text-xl md:text-2xl font-bold text-coffee-900">{payments.length}</div>
        </div>
      </div>

      <div className="card-warm !p-0 overflow-hidden">
        <div className="flex items-center gap-2 p-3 flex-wrap border-b border-coffee-100">
          {['all', 'PENDING_VERIFICATION', 'PAID', 'UNPAID', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`pill text-xs ${filter === s ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}
            >
              {s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-coffee-500 border-b border-coffee-100">
              <th className="py-2 px-3">Order</th><th>Table</th><th>Method</th><th>Txn ID</th><th>Amount</th><th>Status</th><th>When</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-coffee-500">No payments match.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-coffee-50 last:border-0">
                  <td className="py-2 px-3">
                    <Link href={`/dashboard/orders/${p.orderId}`} className="font-semibold text-coffee-900 hover:underline">
                      #{p.order.orderNumber}
                    </Link>
                  </td>
                  <td>{p.order.table?.number ?? '—'}</td>
                  <td className="capitalize">{p.method}</td>
                  <td className="text-xs text-coffee-600">{p.transactionId ?? '—'}</td>
                  <td className="font-bold">{formatCurrency(p.amount)}</td>
                  <td>
                    <span className={`pill ${p.status === 'PAID' ? 'pill-wa' : p.status === 'PENDING_VERIFICATION' ? 'pill-amber' : 'pill-rose'}`}>
                      {p.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </td>
                  <td className="text-xs text-coffee-500">{formatDate(p.createdAt)}</td>
                  <td>
                    <div className="flex gap-1 justify-end pr-3">
                      {p.status !== 'PAID' && (
                        <Button size="sm" variant="accent" onClick={() => setStatus(p.orderId, 'PAID')}>
                          <CheckCircle2 className="h-3 w-3" /> Verify
                        </Button>
                      )}
                      {p.status === 'PENDING_VERIFICATION' && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(p.orderId, 'FAILED')}>
                          <X className="h-3 w-3" />
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
          {filtered.length === 0 && (
            <div className="py-12 text-center text-coffee-500 text-sm">No payments match.</div>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/dashboard/orders/${p.orderId}`} className="font-semibold text-coffee-900">
                    #{p.order.orderNumber}
                  </Link>
                  <div className="text-xs text-coffee-500 mt-0.5">
                    {p.order.table ? `Table ${p.order.table.number}` : '—'} · {p.method}
                  </div>
                  {p.transactionId && (
                    <div className="text-[11px] text-coffee-500 truncate mt-0.5">UTR: {p.transactionId}</div>
                  )}
                  <div className="text-[11px] text-coffee-400 mt-0.5">{formatDate(p.createdAt)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-coffee-900">{formatCurrency(p.amount)}</div>
                  <span className={`mt-1 inline-block pill text-[10px] ${p.status === 'PAID' ? 'pill-wa' : p.status === 'PENDING_VERIFICATION' ? 'pill-amber' : 'pill-rose'}`}>
                    {p.status.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
              </div>
              {p.status !== 'PAID' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="accent" className="flex-1" onClick={() => setStatus(p.orderId, 'PAID')}>
                    <CheckCircle2 className="h-3 w-3" /> Verify
                  </Button>
                  {p.status === 'PENDING_VERIFICATION' && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(p.orderId, 'FAILED')}>
                      <X className="h-3 w-3" /> Fail
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
