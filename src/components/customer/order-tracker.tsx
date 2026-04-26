'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coffee, CheckCircle2, ChefHat, Bell, Star, CreditCard, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const STEPS = [
  { k: 'NEW', l: 'Order placed', i: Bell },
  { k: 'ACCEPTED', l: 'Accepted', i: CheckCircle2 },
  { k: 'PREPARING', l: 'Preparing', i: ChefHat },
  { k: 'READY', l: 'Ready', i: Coffee },
  { k: 'SERVED', l: 'Served', i: CheckCircle2 },
  { k: 'COMPLETED', l: 'Completed', i: Receipt },
];

export function CustomerOrderTracker({ order: initialOrder }: { order: any }) {
  const [order, setOrder] = useState(initialOrder);
  const cafe = order.cafe;

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

  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.k === order.status));
  const isCancelled = order.status === 'CANCELLED';
  const isComplete = order.status === 'COMPLETED' || order.status === 'SERVED';

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      <div className="bg-coffee-gradient text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container relative py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse-dot" /> Live tracking
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-4">Thank you for ordering!</h1>
          <div className="mt-1 text-cream-200/90">{cafe.name} · Order #{order.orderNumber}</div>
        </div>
      </div>

      <div className="container max-w-2xl -mt-6 relative space-y-4">
        {/* Status timeline */}
        <div className="card-warm">
          {isCancelled ? (
            <div className="text-center py-8">
              <div className="text-rose-600 font-bold text-lg">This order was cancelled.</div>
              <p className="text-coffee-600 text-sm mt-1">Please contact the cafe staff if you need help.</p>
            </div>
          ) : (
            <ol className="space-y-1 relative">
              {STEPS.map((s, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <li key={s.k} className="flex items-start gap-3 relative pb-4 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span className={`absolute left-4 top-8 w-px h-full -translate-x-1/2 ${done ? 'bg-coffee-700' : 'bg-coffee-200'}`} />
                    )}
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${
                        active ? 'bg-coffee-700 text-cream-50 ring-4 ring-coffee-200 animate-pulse-dot' : done ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-500'
                      }`}
                    >
                      <s.i className="h-4 w-4" />
                    </span>
                    <div className="flex-1 pt-1">
                      <div className={`font-semibold ${active ? 'text-coffee-900' : done ? 'text-coffee-800' : 'text-coffee-400'}`}>
                        {s.l}
                      </div>
                      {active && (
                        <div className="text-xs text-coffee-500 mt-0.5">
                          {s.k === 'NEW' && 'Waiting for the cafe to accept…'}
                          {s.k === 'ACCEPTED' && 'Your order is in the queue'}
                          {s.k === 'PREPARING' && 'Kitchen is on it 👨‍🍳'}
                          {s.k === 'READY' && 'Hot & fresh — coming to you'}
                          {s.k === 'SERVED' && 'Enjoy your meal!'}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Items */}
        <div className="card-warm">
          <div className="font-semibold text-coffee-900 mb-2">Order summary</div>
          <div className="space-y-2 text-sm">
            {order.items.map((it: any) => (
              <div key={it.id} className="flex justify-between">
                <div>
                  <span className="font-medium text-coffee-900">{it.quantity}× {it.name}</span>
                  {it.variantName && <span className="text-coffee-500"> ({it.variantName})</span>}
                </div>
                <div className="text-coffee-700">{formatCurrency(it.totalPrice)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-coffee-100 mt-3 pt-3 text-sm space-y-1 text-coffee-700">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.taxAmount > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>}
            {order.serviceAmount > 0 && <div className="flex justify-between"><span>Service</span><span>{formatCurrency(order.serviceAmount)}</span></div>}
            <div className="flex justify-between font-bold text-coffee-900 pt-1 border-t border-coffee-100">
              <span>Total</span><span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons. Owner-side WhatsApp is sent automatically by the
            cafe's bot — customers don't see a manual share button here. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cafe.settings?.paymentEnabled && order.paymentStatus !== 'PAID' && (
            <Link href={`/pay/${order.id}`} className={isComplete && cafe.settings?.reviewEnabled ? '' : 'md:col-span-2'}>
              <Button variant="accent" className="w-full" size="lg">
                <CreditCard className="h-4 w-4" /> Pay Now · {formatCurrency(order.totalAmount)}
              </Button>
            </Link>
          )}
          {isComplete && cafe.settings?.reviewEnabled && cafe.settings?.googleReviewUrl && (
            <a
              href={cafe.settings.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className={cafe.settings?.paymentEnabled && order.paymentStatus !== 'PAID' ? '' : 'md:col-span-2'}
            >
              <Button className="w-full" size="lg">
                <Star className="h-4 w-4" /> Leave a review
              </Button>
            </a>
          )}
        </div>

        <div className="text-center text-xs text-coffee-500 mt-4">
          Refreshes automatically every 5 seconds.
        </div>
      </div>
    </div>
  );
}
