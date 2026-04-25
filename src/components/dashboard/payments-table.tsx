'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function PaymentsTable({ initialPayments }: { initialPayments: any[] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState('all');

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

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
  const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'PENDING_VERIFICATION').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Payments</h1>
        <p className="text-coffee-600 text-sm">Verify and track UPI / cash payments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card-warm">
          <div className="text-xs text-coffee-500">Total received</div>
          <div className="font-display text-2xl font-bold text-coffee-900">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="card-warm">
          <div className="text-xs text-coffee-500">Pending verification</div>
          <div className="font-display text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
        </div>
        <div className="card-warm">
          <div className="text-xs text-coffee-500">Transactions</div>
          <div className="font-display text-2xl font-bold text-coffee-900">{payments.length}</div>
        </div>
      </div>

      <div className="card-warm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {['all', 'PENDING_VERIFICATION', 'PAID', 'UNPAID', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`pill ${filter === s ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}
            >
              {s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-coffee-500 border-b border-coffee-100">
              <th className="py-2">Order</th><th>Table</th><th>Method</th><th>Txn ID</th><th>Amount</th><th>Status</th><th>When</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-coffee-500">No payments match.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-coffee-50 last:border-0">
                  <td className="py-2">
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
                    <div className="flex gap-1 justify-end">
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
      </div>
    </div>
  );
}
