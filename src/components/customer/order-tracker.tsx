'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coffee, CheckCircle2, ChefHat, Bell, ArrowLeft, ArrowRight, CreditCard, Plus,
  ConciergeBell, GlassWater, Sparkles, Clock, Armchair, ShoppingBag, Star,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const STEPS = [
  { keys: ['NEW', 'ACCEPTED'], l: 'Order Received', i: CheckCircle2 },
  { keys: ['PREPARING'], l: 'Preparing', i: ChefHat },
  { keys: ['READY'], l: 'Ready', i: Bell },
  { keys: ['SERVED', 'COMPLETED'], l: 'Served', i: Coffee },
];

export function CustomerOrderTracker({ order: initialOrder }: { order: any }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const cafe = order.cafe;
  const table = order.table;

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/${order.id}/status`, { cache: 'no-store' });
        const data = await r.json();
        if (data?.order) setOrder((cur: any) => ({ ...cur, ...data.order }));
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [order.id]);

  const isCancelled = order.status === 'CANCELLED';
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.keys.includes(order.status)));
  const isComplete = order.status === 'SERVED' || order.status === 'COMPLETED';
  const backHref = table ? `/cafe/${cafe.slug}/table/${table.code}` : `/cafe/${cafe.slug}`;

  async function service(kind: string) {
    try {
      const r = await fetch('/api/customer/service-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeSlug: cafe.slug, tableCode: table?.code, kind, orderId: order.id }),
      });
      if (!r.ok) throw new Error();
      toast.success('Staff notified ✓');
    } catch { toast.error('Could not send request'); }
  }

  const placedAt = order.createdAt ? new Date(order.createdAt) : null;

  return (
    <div className="cafe-app pb-28" data-theme={cafe.settings?.appTheme || 'coffee'}>
      {/* Header */}
      <header className="px-4 pt-4 pb-3 flex items-center gap-3">
        <a href={backHref} className="glass-chip h-10 w-10 rounded-full grid place-items-center"><ArrowLeft className="h-5 w-5 text-cream-50" /></a>
        <h1 className="font-display text-xl font-bold text-cream-50 flex-1 text-center">Your Order</h1>
        <span className="glass-chip rounded-xl px-3 py-2 flex items-center gap-2">
          {table ? <Armchair className="h-4 w-4 app-amber" /> : <ShoppingBag className="h-4 w-4 app-amber" />}
          <span className="text-sm font-semibold text-cream-50">{table ? `Table ${table.number}` : 'Takeaway'}</span>
        </span>
      </header>

      <main className="px-4 space-y-4">
        {/* Order meta + stepper */}
        <div className="glass-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-cream-200/55">Order #</div>
              <div className="font-display text-2xl font-bold app-amber">{order.orderNumber}</div>
              {placedAt && <div className="text-[11px] text-cream-200/45 mt-0.5">Placed {placedAt.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs text-cream-200/55">Estimated</div>
              <div className="font-display text-xl font-bold app-amber inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {cafe.settings?.avgPrepMinutes ?? 12} min</div>
              <div className="text-[11px] text-cream-200/45 mt-0.5 max-w-[120px]">We&rsquo;ll notify you when it&rsquo;s ready.</div>
            </div>
          </div>

          {isCancelled ? (
            <div className="mt-5 text-center py-4">
              <div className="text-rose-300 font-bold text-lg">This order was cancelled.</div>
              <p className="text-cream-200/60 text-sm mt-1">Please contact the cafe staff if you need help.</p>
            </div>
          ) : (
            <div className="mt-6 flex items-start justify-between relative">
              {STEPS.map((s, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <div key={s.l} className="flex-1 flex flex-col items-center text-center relative">
                    {i < STEPS.length - 1 && (
                      <span className={`absolute top-5 left-1/2 w-full h-0.5 ${i < currentIdx ? 'bg-amber-400' : 'bg-white/10'}`} />
                    )}
                    <span className={`relative z-10 h-10 w-10 rounded-full grid place-items-center ${active ? 'btn-amber animate-pulse-dot' : done ? 'btn-amber' : 'glass-chip'}`}>
                      <s.i className={`h-5 w-5 ${done || active ? 'on-acc' : 'text-cream-200/50'}`} />
                    </span>
                    <span className={`text-[11px] mt-2 font-medium ${active ? 'app-amber' : done ? 'text-cream-100' : 'text-cream-200/45'}`}>{s.l}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-cream-50">Your Items ({order.items.length})</div>
          </div>
          <div className="space-y-3">
            {order.items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-black/30 grid place-items-center shrink-0"><Coffee className="h-5 w-5 text-cream-200/30" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-cream-50 truncate">{it.name}{it.variantName ? ` (${it.variantName})` : ''}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs app-amber">x{it.quantity}</div>
                  <div className="text-sm text-cream-100">{formatCurrency(it.totalPrice)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3 flex justify-between font-bold text-cream-50">
            <span>Total</span><span className="app-amber">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => service('call_waiter')} className="glass-card py-3 flex flex-col items-center gap-1 text-amber-300">
            <ConciergeBell className="h-5 w-5" /><span className="text-xs font-semibold">Call Waiter</span>
          </button>
          <a href={backHref} className="glass-card py-3 flex flex-col items-center gap-1 text-emerald-300">
            <Plus className="h-5 w-5" /><span className="text-xs font-semibold">Add Items</span>
          </a>
          {cafe.settings?.paymentEnabled && order.paymentStatus !== 'PAID' ? (
            <a href={`/pay/${order.id}`} className="btn-amber rounded-2xl py-3 flex flex-col items-center gap-1">
              <CreditCard className="h-5 w-5 on-acc" /><span className="text-xs font-bold on-acc">Pay Bill</span>
            </a>
          ) : (
            <a href={`/review/${order.id}`} className="glass-card py-3 flex flex-col items-center gap-1 text-amber-300">
              <Star className="h-5 w-5" /><span className="text-xs font-semibold">Review</span>
            </a>
          )}
        </div>

        {/* Need anything else */}
        <div className="glass-card p-4">
          <div className="font-display text-lg font-bold text-cream-50">Need anything else?</div>
          <p className="text-xs text-cream-200/55 mb-3">We&rsquo;re here to make your experience perfect.</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'water', l: 'Water', icon: GlassWater },
              { k: 'tissue', l: 'Tissue', icon: Sparkles },
              { k: 'cutlery', l: 'Cutlery', icon: Coffee },
            ].map((q) => (
              <button key={q.k} onClick={() => service(q.k)} className="glass-chip rounded-xl py-2.5 flex flex-col items-center gap-1 text-cream-100">
                <q.icon className="h-4 w-4 app-amber" /><span className="text-xs">{q.l}</span>
              </button>
            ))}
          </div>
        </div>

        {isComplete && (
          <a href={`/review/${order.id}`} className="btn-amber w-full rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2">
            Rate your experience <ArrowRight className="h-5 w-5" />
          </a>
        )}

        <div className="text-center text-xs text-cream-200/35 pt-1">Refreshes automatically every few seconds.</div>
      </main>

      {/* Bottom nav (links back into the app) */}
      <nav className="glass-nav fixed bottom-0 inset-x-0 z-50 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {[
          { l: 'Home', icon: Coffee, href: backHref, active: false },
          { l: 'Menu', icon: Plus, href: backHref, active: false },
          { l: 'Orders', icon: Bell, href: '/my-orders', active: true },
        ].map((n) => (
          <a key={n.l} href={n.href} className="col-span-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[60px]">
            <n.icon className={`h-5 w-5 ${n.active ? 'app-amber' : 'text-cream-200/55'}`} />
            <span className={`text-[11px] ${n.active ? 'app-amber' : 'text-cream-200/55'}`}>{n.l}</span>
          </a>
        ))}
        <a href="/my-orders" className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-cream-200/55"><CheckCircle2 className="h-5 w-5" /><span className="text-[11px]">Track</span></a>
        <a href={backHref} className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-cream-200/55"><ConciergeBell className="h-5 w-5" /><span className="text-[11px]">Service</span></a>
      </nav>
    </div>
  );
}
