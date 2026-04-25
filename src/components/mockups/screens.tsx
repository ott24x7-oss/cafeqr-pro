'use client';

import { Coffee, ArrowRight, Star, Bell, ChefHat, CheckCircle2, CreditCard, QrCode, Plus, Minus, Search, Camera, MessageSquare, MapPin, Clock } from 'lucide-react';

/* ─────────── 1. SCAN QR SCREEN ─────────── */
export function ScanQRScreen() {
  return (
    <div className="h-full bg-coffee-950 relative">
      <div className="absolute inset-0 bg-pattern opacity-10" />
      <div className="relative h-full flex flex-col items-center justify-center text-cream-50 p-6">
        <Camera className="h-6 w-6 mb-2 opacity-60" />
        <div className="text-xs opacity-70 mb-4">Point camera at QR code</div>
        <div className="relative">
          <div className="h-44 w-44 bg-white rounded-2xl grid place-items-center shadow-coffee">
            <QrCode className="h-32 w-32 text-coffee-900" />
          </div>
          <span className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-caramel rounded-tl-xl" />
          <span className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-caramel rounded-tr-xl" />
          <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-caramel rounded-bl-xl" />
          <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-caramel rounded-br-xl" />
        </div>
        <div className="mt-6 text-[11px] text-caramel/90 animate-pulse-dot">Detecting…</div>
      </div>
    </div>
  );
}

/* ─────────── 2. MENU SCREEN ─────────── */
export function MenuScreen({ withItems = true }: { withItems?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-coffee-gradient text-cream-50 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse-dot" /> Open</span>
          <span className="pill bg-white/20 backdrop-blur text-cream-50 text-[9px]">Table 7</span>
        </div>
        <div className="font-display text-lg font-bold leading-tight">Cafe Mocha</div>
        <div className="flex items-center gap-2 mt-1 text-[10px] opacity-80">
          <MapPin className="h-2.5 w-2.5" /> Bengaluru · 4.9★
        </div>
      </div>
      <div className="px-3 py-2 bg-cream-100">
        <div className="flex items-center bg-white rounded-lg px-2 py-1.5">
          <Search className="h-3 w-3 text-coffee-400 mr-1" />
          <span className="text-[10px] text-coffee-400">Search dishes…</span>
        </div>
      </div>
      <div className="flex gap-1.5 px-3 py-2 overflow-hidden">
        <span className="pill bg-coffee-700 text-cream-50 text-[9px] !px-2">All</span>
        <span className="pill bg-cream-200 text-coffee-800 text-[9px] !px-2">Coffee</span>
        <span className="pill bg-cream-200 text-coffee-800 text-[9px] !px-2">Pastry</span>
        <span className="pill bg-cream-200 text-coffee-800 text-[9px] !px-2">Mains</span>
      </div>
      <div className="px-3 flex-1 space-y-1.5 overflow-hidden">
        {withItems && [
          { n: 'Cappuccino', d: 'Rich espresso, foamed milk', p: 180, veg: true, pop: true },
          { n: 'Cold Brew', d: '12-hour slow brewed', p: 220, veg: true },
          { n: 'Truffle Pasta', d: 'Hand-rolled tagliatelle', p: 460, veg: true },
        ].map((m) => (
          <div key={m.n} className="rounded-lg border border-coffee-100 bg-white p-2 flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-coffee-gradient grid place-items-center shrink-0">
              <Coffee className="h-4 w-4 text-cream-50" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="veg-dot scale-75" />
                {m.pop && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded">★</span>}
              </div>
              <div className="text-[11px] font-bold text-coffee-900 leading-tight truncate">{m.n}</div>
              <div className="text-[9px] text-coffee-500 truncate">{m.d}</div>
              <div className="text-[10px] font-bold text-coffee-800 mt-0.5">₹{m.p}</div>
            </div>
            <button className="rounded-full bg-coffee-700 text-cream-50 h-6 w-6 grid place-items-center text-xs shrink-0">+</button>
          </div>
        ))}
      </div>
      <div className="p-2.5 border-t border-coffee-100 bg-cream-100">
        <button className="w-full bg-coffee-gradient text-cream-50 py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5">
          View cart · ₹520 <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ─────────── 3. CART SCREEN ─────────── */
export function CartScreen() {
  return (
    <div className="h-full flex flex-col bg-cream-50">
      <div className="px-4 py-3 border-b border-coffee-100 flex items-center justify-between">
        <div className="font-display text-base font-bold text-coffee-900">Your cart</div>
        <span className="text-[10px] text-coffee-500">3 items</span>
      </div>
      <div className="px-3 py-2 flex-1 space-y-1.5 overflow-hidden">
        {[
          { n: 'Cappuccino', q: 2, p: 360 },
          { n: 'Croissant', q: 1, p: 180 },
          { n: 'Avocado Toast', q: 1, p: 280 },
        ].map((i) => (
          <div key={i.n} className="rounded-lg bg-white border border-coffee-100 p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-coffee-900 truncate">{i.n}</div>
              <div className="text-[10px] font-bold text-coffee-700 mt-0.5">₹{i.p}</div>
            </div>
            <div className="flex items-center gap-1 bg-cream-100 rounded-full px-1">
              <Minus className="h-2.5 w-2.5 text-coffee-700" />
              <span className="text-[10px] font-bold text-coffee-900 w-3 text-center">{i.q}</span>
              <Plus className="h-2.5 w-2.5 text-coffee-700" />
            </div>
          </div>
        ))}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[10px] text-emerald-800 flex items-center gap-1.5 mt-2">
          ✓ WhatsApp verified · 98765*****
        </div>
      </div>
      <div className="p-2.5 border-t border-coffee-100 bg-white space-y-1">
        <div className="flex justify-between text-[10px] text-coffee-600">
          <span>Subtotal</span><span>₹820</span>
        </div>
        <div className="flex justify-between text-[10px] text-coffee-600">
          <span>Tax · 5%</span><span>₹41</span>
        </div>
        <div className="flex justify-between text-[12px] font-bold text-coffee-900 border-t border-coffee-100 pt-1">
          <span>Total</span><span>₹861</span>
        </div>
        <button className="w-full bg-coffee-gradient text-cream-50 py-2 rounded-lg font-bold text-[11px] mt-1">
          Place order · ₹861
        </button>
      </div>
    </div>
  );
}

/* ─────────── 4. ORDER TRACKING SCREEN ─────────── */
export function TrackingScreen() {
  const steps = [
    { l: 'Order placed', i: Bell, done: true },
    { l: 'Accepted', i: CheckCircle2, done: true },
    { l: 'Preparing', i: ChefHat, done: true, active: true },
    { l: 'Ready', i: Coffee, done: false },
    { l: 'Served', i: CheckCircle2, done: false },
  ];
  return (
    <div className="h-full flex flex-col bg-cream-50">
      <div className="bg-coffee-gradient text-cream-50 px-4 py-4 text-center">
        <div className="text-[9px] opacity-80">Order #1284 · Cafe Mocha</div>
        <div className="font-display text-base font-bold mt-1">Thank you for ordering!</div>
        <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[9px]">
          <span className="h-1 w-1 rounded-full bg-emerald-300 animate-pulse-dot" /> Live tracking
        </div>
      </div>
      <div className="px-3 py-3 flex-1 space-y-1.5">
        {steps.map((s, i) => (
          <div key={s.l} className="flex items-center gap-2.5">
            <span className={`grid h-6 w-6 place-items-center rounded-full shrink-0 text-[9px] ${
              s.active ? 'bg-coffee-700 text-cream-50 ring-2 ring-coffee-200' :
              s.done ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-400'
            }`}>
              <s.i className="h-3 w-3" />
            </span>
            <div className={`text-[11px] font-semibold ${s.done ? 'text-coffee-900' : 'text-coffee-400'}`}>
              {s.l}
              {s.active && <div className="text-[9px] text-coffee-500 font-normal">Kitchen is on it 👨‍🍳</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2.5 border-t border-coffee-100 bg-white space-y-1.5">
        <button className="w-full bg-wagreen text-white py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5">
          <MessageSquare className="h-3 w-3" /> Send to Owner WhatsApp
        </button>
        <button className="w-full bg-caramel text-coffee-900 py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5">
          <CreditCard className="h-3 w-3" /> Pay ₹861
        </button>
      </div>
    </div>
  );
}

/* ─────────── 5. PAY SCREEN ─────────── */
export function PayScreen() {
  return (
    <div className="h-full flex flex-col bg-cream-50">
      <div className="bg-coffee-gradient text-cream-50 px-4 py-4 text-center">
        <div className="text-[9px] opacity-80">Order #1284</div>
        <div className="font-display text-base font-bold mt-1">Cafe Mocha</div>
        <div className="text-xl font-bold mt-2">₹861</div>
      </div>
      <div className="p-3 flex-1 space-y-2">
        <div className="rounded-lg border border-coffee-100 bg-white p-3 text-center">
          <div className="text-[9px] font-semibold text-coffee-700 mb-1.5">Scan & Pay</div>
          <div className="mx-auto h-24 w-24 bg-white border-2 border-coffee-700 rounded grid place-items-center">
            <QrCode className="h-20 w-20 text-coffee-900" />
          </div>
          <div className="mt-2 text-[9px] text-coffee-600">UPI · Any app</div>
        </div>
        <div className="rounded-lg bg-white border border-coffee-100 p-2.5">
          <div className="text-[9px] text-coffee-500">UPI ID</div>
          <div className="font-mono text-[10px] text-coffee-900 truncate">mocha@hdfcbank</div>
        </div>
        <button className="w-full bg-caramel text-coffee-900 py-2 rounded-lg font-bold text-[11px]">
          Open UPI app
        </button>
      </div>
    </div>
  );
}

/* ─────────── 6. REVIEW SCREEN ─────────── */
export function ReviewScreen() {
  return (
    <div className="h-full flex flex-col bg-cream-50">
      <div className="bg-coffee-gradient text-cream-50 px-4 py-4 text-center">
        <div className="text-[9px] opacity-80">#1284 · Cafe Mocha</div>
        <div className="font-display text-base font-bold mt-1">How was your meal?</div>
      </div>
      <div className="p-4 flex-1 flex flex-col items-center text-center">
        <div className="flex gap-1 my-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-7 w-7 ${i < 5 ? 'fill-caramel text-caramel' : 'text-coffee-200'}`} />
          ))}
        </div>
        <div className="text-[11px] text-coffee-600">Loved it! 🤩</div>
        <div className="mt-3 w-full rounded-lg border border-coffee-200 bg-white p-2 text-[10px] text-coffee-700 italic text-left">
          "Best cappuccino in town!"
        </div>
        <button className="mt-4 w-full bg-coffee-gradient text-cream-50 py-2 rounded-lg font-bold text-[11px]">
          Submit review
        </button>
      </div>
    </div>
  );
}

/* ─────────── 7. DASHBOARD MOCKUP (shorter, for cards) ─────────── */
export function DashboardMini() {
  return (
    <div className="rounded-2xl border border-coffee-200 bg-white shadow-coffee overflow-hidden">
      <div className="border-b border-coffee-100 px-3 py-2 flex items-center justify-between bg-cream-100">
        <div className="flex items-center gap-1.5 text-coffee-800 font-semibold text-xs">
          <Coffee className="h-3 w-3" /> CafeQR Pro
        </div>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { l: 'Today', v: '₹12.8K', tone: 'text-emerald-600' },
            { l: 'Orders', v: '47', tone: 'text-amber-600' },
            { l: 'Pending', v: '3', tone: 'text-rose-600' },
            { l: 'Rating', v: '4.9', tone: 'text-coffee-700' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-coffee-100 p-1.5 bg-white">
              <div className="text-[8px] text-coffee-500">{s.l}</div>
              <div className={`font-bold text-xs ${s.tone}`}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {['NEW', 'PREP', 'READY', 'DONE'].map((c, idx) => (
            <div key={c} className="rounded-lg bg-cream-100 p-1.5">
              <div className="text-[8px] font-bold text-coffee-700 mb-1">{c}</div>
              {Array.from({ length: 2 - (idx % 2) }).map((_, i) => (
                <div key={i} className="rounded bg-white border border-coffee-100 p-1 mb-1 text-[7px]">
                  <div className="font-bold text-coffee-900">#{1280 + idx * 7 + i}</div>
                  <div className="text-coffee-500">₹{280 + i * 60}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── 8. QR TABLE PRINT MOCKUP ─────────── */
export function QRPrintCard() {
  return (
    <div className="border-2 border-dashed border-coffee-700 rounded-2xl p-5 bg-white text-center shadow-coffee max-w-[200px] mx-auto">
      <div className="font-display text-sm font-bold text-coffee-900">Cafe Mocha</div>
      <div className="font-display text-3xl font-bold text-coffee-900 mt-1">Table 7</div>
      <div className="my-3 mx-auto h-28 w-28 bg-white rounded grid place-items-center">
        <QrCode className="h-24 w-24 text-coffee-900" />
      </div>
      <div className="text-[10px] text-coffee-600">Scan to view menu &amp; order</div>
    </div>
  );
}

/* ─────────── 9. WHATSAPP NOTIFICATION MOCKUP ─────────── */
export function WANotificationMockup() {
  return (
    <div className="rounded-2xl bg-[#0a1014] p-3 max-w-[280px] mx-auto shadow-coffee">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-full bg-wagreen grid place-items-center text-white text-xs font-bold">CM</div>
        <div>
          <div className="text-[11px] font-semibold text-white">Cafe Mocha</div>
          <div className="text-[9px] text-emerald-400">online</div>
        </div>
      </div>
      <div className="bg-emerald-900/40 rounded-lg p-2 text-[10px] text-cream-50 leading-relaxed">
        🆕 <b>New Order — Cafe Mocha</b><br />
        <br />
        <b>Order #:</b> ORD-1284<br />
        <b>Table:</b> Table 7<br />
        <b>Customer:</b> Riya<br />
        <br />
        <b>Items:</b><br />
        • 2× Cappuccino — ₹360<br />
        • 1× Croissant — ₹180<br />
        <br />
        <b>Total:</b> ₹861
      </div>
      <div className="text-right text-[8px] text-cream-50/40 mt-1">9:42 ✓✓</div>
    </div>
  );
}

/* ─────────── 10. ORDER NOTIFICATION TOAST ─────────── */
export function OrderToast({ status = 'NEW', n = '#1284', t = '2 min ago' }: any) {
  const tones: Record<string, string> = {
    NEW: 'border-amber-300 bg-amber-50',
    READY: 'border-emerald-300 bg-emerald-50',
    PREP: 'border-orange-300 bg-orange-50',
  };
  return (
    <div className={`rounded-xl border-l-4 bg-white p-3 shadow-coffee ${tones[status]}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-coffee-900">{n}</span>
        <span className="text-[10px] text-coffee-500">{t}</span>
      </div>
      <div className="text-xs text-coffee-600 mt-0.5">3 items · Table 7</div>
    </div>
  );
}
