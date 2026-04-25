'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, ChefHat, Bell, MessageSquare, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { generateCustomerStatusMessage, waLink, generateOwnerOrderMessage } from '@/lib/whatsapp';
import { toast } from '@/components/ui/toaster';

const COLUMNS: { key: string; label: string; tone: string; icon: any }[] = [
  { key: 'NEW', label: 'New', tone: 'border-amber-300 bg-amber-50', icon: Bell },
  { key: 'ACCEPTED', label: 'Accepted', tone: 'border-blue-300 bg-blue-50', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'Preparing', tone: 'border-orange-300 bg-orange-50', icon: ChefHat },
  { key: 'READY', label: 'Ready', tone: 'border-emerald-300 bg-emerald-50', icon: Clock },
  { key: 'SERVED', label: 'Served', tone: 'border-teal-300 bg-teal-50', icon: CheckCircle2 },
];

export function OrderBoard({ initialOrders, cafe }: { initialOrders: any[]; cafe: any }) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch('/api/dashboard/orders/active', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setOrders(data.orders);
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.type === filter);
  }, [orders, filter]);

  async function updateStatus(orderId: string, next: string) {
    const r = await fetch(`/api/dashboard/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) {
      const data = await r.json();
      setOrders((cur) => cur.map((o) => (o.id === orderId ? data.order : o)).filter((o) => ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'].includes(o.status)));
      toast.success(`Marked as ${next.toLowerCase()}`);
    } else {
      toast.error('Could not update');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Live orders</h1>
          <p className="text-coffee-600 text-sm">Refreshes every 5s · {orders.length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input !h-10 !py-1 !pr-9 max-w-[160px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="DINE_IN">Dine in</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 lg:grid-cols-5 gap-3 flex md:block snap-x scroll-smooth overflow-x-auto -mx-4 px-4 pb-3 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
        {COLUMNS.map((col) => {
          const colOrders = filtered.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className={`shrink-0 w-[80vw] sm:w-[60vw] md:w-auto snap-start rounded-2xl border-l-4 bg-white border border-coffee-100 p-3 ${col.tone}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-coffee-900">
                  <col.icon className="h-4 w-4" /> {col.label}
                </div>
                <span className="pill bg-white text-coffee-700">{colOrders.length}</span>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {colOrders.length === 0 ? (
                  <div className="text-center text-xs text-coffee-400 py-6">Empty</div>
                ) : (
                  colOrders.map((o) => (
                    <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left rounded-xl bg-white border border-coffee-100 p-3 hover:shadow-coffee transition">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-coffee-900">#{o.orderNumber}</span>
                        <span className="text-[11px] text-coffee-500">{timeAgo(o.createdAt)}</span>
                      </div>
                      <div className="text-xs text-coffee-600 mt-0.5">
                        {o.table ? `Table ${o.table.number}` : o.type}
                        {o.customerName && <span> · {o.customerName}</span>}
                      </div>
                      <div className="text-xs text-coffee-700 mt-1.5">{o.items.length} items</div>
                      <div className="font-bold text-coffee-900 mt-1">{formatCurrency(o.totalAmount)}</div>
                      {o.customerNote && (
                        <div className="text-[11px] text-coffee-700 italic mt-1.5 line-clamp-2 bg-cream-50 rounded p-1.5">📝 {o.customerNote}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          cafe={cafe}
          onClose={() => setSelected(null)}
          onUpdate={(s: string) => { updateStatus(selected.id, s); setSelected(null); }}
        />
      )}
    </div>
  );
}

function OrderDetailDrawer({ order, cafe, onClose, onUpdate }: any) {
  const next: Record<string, string> = {
    NEW: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'READY', READY: 'SERVED', SERVED: 'COMPLETED',
  };
  const customerWa = order.customerPhone
    ? waLink(order.customerPhone, generateCustomerStatusMessage(order, cafe, next[order.status] ?? order.status, typeof window !== 'undefined' ? window.location.origin : ''))
    : '';
  const ownerWa = cafe.whatsappNo
    ? waLink(cafe.whatsappNo, generateOwnerOrderMessage(order, cafe))
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-end" onClick={onClose}>
      <div className="w-full md:max-w-md bg-cream-50 rounded-t-3xl md:rounded-l-3xl md:rounded-r-none max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-cream-50 z-10 px-5 py-4 border-b border-coffee-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-coffee-500">Order #{order.orderNumber}</div>
            <div className="font-bold text-coffee-900">{order.table ? `Table ${order.table.number}` : order.type}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {order.customerName && <div className="text-sm">👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</div>}
          {order.customerNote && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">📝 {order.customerNote}</div>}
          <div className="card-warm !p-3">
            <div className="font-semibold text-coffee-900 mb-2">Items</div>
            <div className="space-y-2 text-sm">
              {order.items.map((i: any) => (
                <div key={i.id} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{i.quantity}× {i.name}{i.variantName ? ` (${i.variantName})` : ''}</div>
                    {i.note && <div className="text-xs text-coffee-600 italic">{i.note}</div>}
                  </div>
                  <div className="font-semibold">{formatCurrency(i.totalPrice)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-coffee-100 mt-3 pt-3 text-sm space-y-1">
              <Row l="Subtotal" v={formatCurrency(order.subtotal)} />
              {order.taxAmount > 0 && <Row l="Tax" v={formatCurrency(order.taxAmount)} />}
              {order.serviceAmount > 0 && <Row l="Service" v={formatCurrency(order.serviceAmount)} />}
              <Row l={<b>Total</b>} v={<b>{formatCurrency(order.totalAmount)}</b>} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {next[order.status] && (
              <Button size="lg" onClick={() => onUpdate(next[order.status])}>
                Mark {next[order.status]}
              </Button>
            )}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <Button variant="destructive" size="lg" onClick={() => { if (confirm('Cancel this order?')) onUpdate('CANCELLED'); }}>
                Cancel
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {customerWa && order.customerPhone && (
              <a href={customerWa} target="_blank" rel="noreferrer">
                <Button variant="wa" className="w-full"><MessageSquare className="h-4 w-4" /> Notify customer</Button>
              </a>
            )}
            {ownerWa && (
              <a href={ownerWa} target="_blank" rel="noreferrer">
                <Button variant="wa" className="w-full"><MessageSquare className="h-4 w-4" /> Forward to owner</Button>
              </a>
            )}
          </div>

          <Link href={`/dashboard/orders/${order.id}`} className="block">
            <Button variant="outline" className="w-full">Open full bill / print</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: any) {
  return <div className="flex justify-between"><span className="text-coffee-600">{l}</span><span className="text-coffee-900">{v}</span></div>;
}
