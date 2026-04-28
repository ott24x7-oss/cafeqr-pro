'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Loader2, Coffee, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';

export default function MyOrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch(`/api/customer/history?phone=${encodeURIComponent(phone)}`);
    const data = await r.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-12">
      <div className="bg-coffee-gradient text-cream-50">
        <div className="container py-8 text-center">
          <span
            className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-white/15 bg-cover bg-center"
            data-brand-logo
          >
            <Coffee className="h-6 w-6" data-brand-logo-icon />
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-3">My orders</h1>
          <p className="text-cream-200/85 text-sm">Look up past orders by your WhatsApp number</p>
        </div>
      </div>

      <div className="container max-w-md -mt-4 relative">
        <form onSubmit={lookup} className="card-warm space-y-3">
          <div>
            <label className="label">WhatsApp number</label>
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" inputMode="tel" />
              <Button type="submit" disabled={loading || !phone}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Find
              </Button>
            </div>
          </div>
        </form>

        {orders && (
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="card-warm text-center text-coffee-500 py-8">
                <Receipt className="mx-auto h-8 w-8 mb-2" /> No orders found.
              </div>
            ) : (
              orders.map((o: any) => (
                <Link key={o.id} href={`/order/${o.id}`} className="card-warm block hover:-translate-y-0.5 transition">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-coffee-900">#{o.orderNumber}</div>
                    <span className="pill-coffee text-[10px]">{ORDER_STATUS_LABELS[o.status]}</span>
                  </div>
                  <div className="text-xs text-coffee-500 mt-1">{o.cafe?.name} · {formatDate(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  <div className="text-xs text-coffee-700 mt-1">{o.items.length} items</div>
                  <div className="font-bold text-coffee-900 mt-1">{formatCurrency(o.totalAmount)}</div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
