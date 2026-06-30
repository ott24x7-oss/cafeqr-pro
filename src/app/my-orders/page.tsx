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
    <div className="cafe-dark min-h-screen bg-forest-900 text-cream-50 bg-forest-glow bg-fixed pb-12">
      <div className="bg-forest-gradient text-cream-50">
        <div className="container py-8 text-center">
          <span
            className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-gold-gradient text-forest-950 bg-cover bg-center"
            data-brand-logo
          >
            <Coffee className="h-6 w-6" data-brand-logo-icon />
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-bold mt-3 text-gradient-gold">My orders</h1>
          <p className="text-forest-300 text-sm">Look up past orders by your WhatsApp number</p>
        </div>
      </div>

      <div className="container max-w-md -mt-4 relative">
        <form onSubmit={lookup} className="cafe-card p-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-50">WhatsApp number</label>
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" inputMode="tel" className="bg-forest-700 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30" />
              <Button variant="accent" type="submit" disabled={loading || !phone}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />} Find
              </Button>
            </div>
          </div>
        </form>

        {orders && (
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="cafe-card p-5 text-center text-forest-300 py-8">
                <Receipt className="mx-auto h-8 w-8 mb-2" /> No orders found.
              </div>
            ) : (
              orders.map((o: any) => (
                <Link key={o.id} href={`/order/${o.id}`} className="cafe-card p-5 block hover:-translate-y-0.5 hover:border-gold/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-cream-50">#{o.orderNumber}</div>
                    <span className="cafe-pill-gold text-[10px]">{ORDER_STATUS_LABELS[o.status]}</span>
                  </div>
                  <div className="text-xs text-forest-300 mt-1">{o.cafe?.name} · {formatDate(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  <div className="text-xs text-forest-300 mt-1">{o.items.length} items</div>
                  <div className="font-bold text-gold-light mt-1">{formatCurrency(o.totalAmount)}</div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
