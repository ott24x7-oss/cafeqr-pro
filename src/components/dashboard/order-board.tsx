'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Clock, ChefHat, Bell, X,
  History, Volume2, VolumeX, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const COLUMNS: { key: string; label: string; tone: string; icon: any; nextLabel?: string }[] = [
  { key: 'NEW',       label: 'New',       tone: 'border-amber-300 bg-amber-50',     icon: Bell,         nextLabel: 'Accept' },
  { key: 'ACCEPTED',  label: 'Accepted',  tone: 'border-blue-300 bg-blue-50',       icon: CheckCircle2, nextLabel: 'Start prep' },
  { key: 'PREPARING', label: 'Preparing', tone: 'border-orange-300 bg-orange-50',   icon: ChefHat,      nextLabel: 'Mark ready' },
  { key: 'READY',     label: 'Ready',     tone: 'border-emerald-300 bg-emerald-50', icon: Clock,        nextLabel: 'Mark served' },
  { key: 'SERVED',    label: 'Served',    tone: 'border-teal-300 bg-teal-50',       icon: CheckCircle2, nextLabel: 'Complete' },
];

const NEXT_STATUS: Record<string, string> = {
  NEW: 'ACCEPTED', ACCEPTED: 'PREPARING', PREPARING: 'READY', READY: 'SERVED', SERVED: 'COMPLETED',
};

// Generate a short pleasant chime via Web Audio API — no asset shipping required.
function playChime(audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g);
      g.connect(ctx.destination);
      const start = now + i * 0.18;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.18, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      o.start(start);
      o.stop(start + 0.36);
    });
  } catch {}
}

export function OrderBoard({ initialOrders, cafe }: { initialOrders: any[]; cafe: any }) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(cafe?.settings?.enableSound ?? true);
  const [accepting, setAccepting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const armedRef = useRef(false); // browsers require a user gesture before audio

  // Persist sound preference per device
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cafeqr_sound') : null;
    if (saved === '0') setSoundOn(false);
    if (saved === '1') setSoundOn(true);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('cafeqr_sound', soundOn ? '1' : '0');
  }, [soundOn]);

  // Arm audio on first user gesture so the chime plays.
  useEffect(() => {
    const arm = () => { armedRef.current = true; window.removeEventListener('click', arm); };
    window.addEventListener('click', arm);
    return () => window.removeEventListener('click', arm);
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch('/api/dashboard/orders/active', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        const next = data.orders as any[];
        // Detect new arrivals.
        const newOnes = next.filter((o) => !seenIdsRef.current.has(o.id));
        for (const o of newOnes) seenIdsRef.current.add(o.id);
        if (newOnes.length > 0 && soundOn && armedRef.current) playChime(audioCtxRef);
        if (newOnes.length > 0) {
          toast.success(`${newOnes.length} new order${newOnes.length > 1 ? 's' : ''}!`);
        }
        setOrders(next);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [soundOn]);

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
      setOrders((cur) =>
        cur
          .map((o) => (o.id === orderId ? data.order : o))
          .filter((o) => ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'].includes(o.status))
      );
      toast.success(`Marked as ${next.toLowerCase()}`);
    } else {
      toast.error('Could not update');
    }
  }

  async function acceptAll() {
    const news = orders.filter((o) => o.status === 'NEW');
    if (news.length === 0) return;
    if (!confirm(`Accept all ${news.length} new order${news.length > 1 ? 's' : ''}?`)) return;
    setAccepting(true);
    await Promise.all(news.map((o) =>
      fetch(`/api/dashboard/orders/${o.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })
    ));
    setAccepting(false);
    const r = await fetch('/api/dashboard/orders/active', { cache: 'no-store' });
    if (r.ok) {
      const data = await r.json();
      setOrders(data.orders);
    }
    toast.success(`Accepted ${news.length} order${news.length > 1 ? 's' : ''}`);
  }

  const newCount = orders.filter((o) => o.status === 'NEW').length;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Live orders</h1>
          <p className="text-coffee-600 text-sm">Auto-refresh every 5s · {orders.length} active</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className={`pill ${soundOn ? 'bg-emerald-100 text-emerald-800' : 'bg-coffee-100 text-coffee-600'}`}
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            <span className="hidden sm:inline">{soundOn ? 'Sound on' : 'Muted'}</span>
          </button>
          {newCount > 0 && (
            <Button size="sm" onClick={acceptAll} disabled={accepting}>
              <Zap className="h-4 w-4" /> Accept all {newCount}
            </Button>
          )}
          <select
            className="input !h-9 !py-1 !pr-9 max-w-[150px] text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="DINE_IN">Dine in</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
          </select>
          <Link href="/dashboard/orders/history" className="pill bg-cream-200 text-coffee-800 text-sm">
            <History className="h-3 w-3" /> History
          </Link>
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
                    <div key={o.id} className="rounded-xl bg-white border border-coffee-100 hover:shadow-coffee transition overflow-hidden">
                      <button onClick={() => setSelected(o)} className="w-full text-left p-3">
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
                      {col.nextLabel && (
                        <div className="border-t border-coffee-100 grid grid-cols-2 divide-x divide-coffee-100 text-xs">
                          <button
                            onClick={() => updateStatus(o.id, NEXT_STATUS[o.status])}
                            className="py-2 font-semibold text-coffee-800 hover:bg-cream-50 active:bg-cream-100"
                          >
                            {col.nextLabel} →
                          </button>
                          <button
                            onClick={() => setSelected(o)}
                            className="py-2 text-coffee-500 hover:bg-cream-50"
                          >
                            Details
                          </button>
                        </div>
                      )}
                    </div>
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
            {NEXT_STATUS[order.status] && (
              <Button size="lg" onClick={() => onUpdate(NEXT_STATUS[order.status])}>
                Mark {NEXT_STATUS[order.status]}
              </Button>
            )}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <Button variant="destructive" size="lg" onClick={() => { if (confirm('Cancel this order?')) onUpdate('CANCELLED'); }}>
                Cancel
              </Button>
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
