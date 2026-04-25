import Link from 'next/link';
import {
  ArrowRight, UserPlus, Coffee, Utensils, QrCode, Printer, Bell, BarChart3,
  CheckCircle2, MessageSquare, CreditCard, Users, Sparkles, Settings, Star,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  DashboardMini, QRPrintCard, WANotificationMockup, MenuScreen, OrderToast,
} from '@/components/mockups/screens';

export const metadata = { title: 'For cafe owners — Setup in 5 minutes' };

export default function ForOwnersPage() {
  return (
    <div className="min-h-screen bg-cream-50 overflow-hidden">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="absolute -top-40 left-0 h-96 w-96 rounded-full bg-coffee-200/40 blur-3xl" />

        <div className="container relative pt-12 md:pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-caramel/30 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
              <Sparkles className="h-3.5 w-3.5" /> For cafe owners
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-coffee-900">
              Live in <span className="text-gradient-coffee">5 minutes.</span>
            </h1>
            <p className="mt-4 text-lg text-coffee-700 max-w-md mx-auto lg:mx-0">
              Sign up. Add menu. Print QR. Take orders.
            </p>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link href="/signup">
                <Button size="lg">Start free trial <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">See pricing</Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-coffee-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No card needed</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />14-day full trial</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Cancel anytime</span>
            </div>
          </div>

          <div className="relative">
            <DashboardMini />
            <div className="absolute -top-4 -right-2 hidden md:block">
              <OrderToast status="NEW" n="#1284" t="now" />
            </div>
            <div className="absolute -bottom-6 -left-2 hidden md:block">
              <OrderToast status="READY" n="#1281" t="5 min" />
            </div>
          </div>
        </div>
      </section>

      {/* 6-STEP SETUP FLOW */}
      <section className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="pill bg-cream-200 text-coffee-800">Setup walkthrough</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            From zero to live orders.
          </h2>
        </div>

        {/* Steps grid - alternating layout */}
        {[
          {
            n: '01',
            t: 'Sign up',
            d: 'Just your email, cafe name, and a password. Trial starts immediately — no credit card.',
            time: '~30 seconds',
            tips: ['No credit card', 'No phone verification', 'Cafe profile created automatically'],
            icon: UserPlus,
            mockup: <SignupMockup />,
          },
          {
            n: '02',
            t: 'Cafe profile',
            d: 'Add your logo, address, GST number, opening hours and tax %. Used on receipts and bills.',
            time: '~1 minute',
            tips: ['Logo + cover image', 'GST/FSSAI numbers', 'Set tax % (auto-applied)', 'Service charge / packing'],
            icon: Coffee,
            mockup: <CafeProfileMockup />,
          },
          {
            n: '03',
            t: 'Build your menu',
            d: 'Categories first (Coffee, Mains, Desserts), then items with photos, variants, add-ons.',
            time: '~10 min for 30 items',
            tips: ['Bulk add via copy/paste', 'Variants (half/full/regular/large)', 'Add-ons (extra shot)', 'Veg/non-veg + spicy badges'],
            icon: Utensils,
            mockup: <MenuMockup />,
          },
          {
            n: '04',
            t: 'Generate QR codes',
            d: 'Add your tables — single or bulk (10 at once). Each gets a unique QR, downloadable as PNG.',
            time: '~30 seconds',
            tips: ['Bulk-add 10 tables at once', 'Unique QR per table', 'PNG download or print all'],
            icon: QrCode,
            mockup: <QRMockup />,
          },
          {
            n: '05',
            t: 'Print & place',
            d: 'Print the QR cards. Stick on tables, menu boards, takeaway counters. Ready for orders.',
            time: '~5 minutes',
            tips: ['"Print all" generates one PDF', 'Beautiful card design included', 'Laminate for durability'],
            icon: Printer,
            mockup: <PrintMockup />,
          },
          {
            n: '06',
            t: 'Take live orders',
            d: 'Customer scans → order appears with sound + WhatsApp ping. Move through New → Preparing → Ready.',
            time: 'Real-time',
            tips: ['Sound + browser notification', 'WhatsApp to owner instantly', 'Kitchen view for chefs only', 'One-tap status updates'],
            icon: Bell,
            mockup: <DashboardMini />,
          },
        ].map((step, i) => (
          <div
            key={step.n}
            className={`grid lg:grid-cols-5 gap-8 items-center mb-20 ${i % 2 ? 'lg:[&>:first-child]:order-2' : ''}`}
          >
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coffee-700 text-cream-50 font-display font-bold">
                  {step.n}
                </span>
                <step.icon className="h-6 w-6 text-caramel-dark" />
                <span className="pill-amber text-[10px]">{step.time}</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">{step.t}</h3>
              <p className="mt-2 text-coffee-700">{step.d}</p>
              <ul className="mt-4 space-y-1.5">
                {step.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-coffee-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3 flex justify-center">{step.mockup}</div>
          </div>
        ))}
      </section>

      {/* DASHBOARD HIGHLIGHTS */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="pill bg-cream-200 text-coffee-800">In your dashboard</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              Everything you need, nothing you don't.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
            {[
              { i: Bell, t: 'Live order board', d: 'Drag through statuses, sound on new' },
              { i: Utensils, t: 'Menu manager', d: 'Variants, add-ons, hide/show' },
              { i: QrCode, t: 'Tables & QR', d: 'Print, download, bulk-add' },
              { i: CreditCard, t: 'Payments', d: 'UPI verify, mark paid' },
              { i: Star, t: 'Reviews', d: 'Avg rating, customer comments' },
              { i: Users, t: 'Multi-staff roles', d: 'Cashier / Kitchen / Waiter' },
              { i: BarChart3, t: 'Analytics', d: 'Revenue, top items, GST' },
              { i: MessageSquare, t: 'WhatsApp', d: 'Manual / Cloud / Baileys' },
              { i: Settings, t: 'Custom branding', d: 'Logo, colours, subdomain' },
            ].map((f) => (
              <div key={f.t} className="card-warm hover:-translate-y-0.5 transition">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-coffee-100 text-coffee-800 shrink-0">
                    <f.i className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-coffee-900 text-sm">{f.t}</div>
                    <div className="text-xs text-coffee-600">{f.d}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP NOTIFICATION HIGHLIGHT */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          <div>
            <span className="pill bg-emerald-100 text-emerald-800"><MessageSquare className="h-3 w-3" /> WhatsApp notifications</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              Never miss an order.
            </h2>
            <p className="mt-3 text-coffee-700 max-w-md">
              Sound on dashboard. WhatsApp to your phone. Browser notification.
              Three ways to alert you — pick what works.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-coffee-700">
              {[
                'Manual mode: tap to send via wa.me',
                'Cloud API: fully automated (Meta tokens)',
                'Baileys: self-hosted, free forever',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <WANotificationMockup />
          </div>
        </div>
      </section>

      {/* PRICING CTA */}
      <section className="container py-16">
        <div className="rounded-3xl bg-cream-200 p-10 md:p-14 max-w-5xl mx-auto relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-caramel/30 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-coffee-900">
                Start with the free Starter plan.
              </h2>
              <p className="mt-3 text-coffee-700">
                5 tables · 30 menu items · WhatsApp notifications. Forever free.
                Upgrade only when you outgrow it.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { t: 'Starter', p: '₹0', s: '/forever' },
                { t: 'Pro', p: '₹499', s: '/month · 30 tables' },
                { t: 'Business', p: '₹1,499', s: '/month · 200 tables' },
              ].map((p) => (
                <div key={p.t} className="rounded-xl bg-white border border-coffee-100 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-coffee-900">{p.t}</div>
                    <div className="text-xs text-coffee-500">{p.s}</div>
                  </div>
                  <div className="font-display text-2xl font-bold text-coffee-900">{p.p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 text-center mb-8">
          Owner questions
        </h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {ownerFaqs.map((f) => (
            <details key={f.q} className="card-warm">
              <summary className="cursor-pointer font-semibold text-coffee-900 list-none flex items-center justify-between">
                {f.q}
                <span className="text-coffee-500">⌄</span>
              </summary>
              <p className="mt-3 text-sm text-coffee-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-12">
        <div className="rounded-3xl bg-coffee-gradient text-cream-50 p-10 md:p-14 text-center relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-pattern opacity-10" />
          <Coffee className="relative mx-auto h-10 w-10" />
          <h2 className="relative font-display text-3xl md:text-5xl font-bold mt-4">
            Open your QR menu today.
          </h2>
          <p className="relative mt-3 text-cream-200/90">14-day free trial. No card. No commitment.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup"><Button variant="accent" size="lg">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/how-it-works"><Button variant="outline" size="lg" className="border-cream-200 bg-transparent text-cream-50 hover:bg-white/10">Take the tour</Button></Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/* ─────────── inline mockups ─────────── */

function SignupMockup() {
  return (
    <div className="rounded-3xl bg-white border border-coffee-200 shadow-coffee p-6 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Coffee className="h-6 w-6 text-coffee-700" />
        <span className="font-display font-bold text-coffee-900">Sign up</span>
      </div>
      <div className="space-y-3 text-xs">
        {[
          { l: 'Cafe name', v: 'Cafe Mocha' },
          { l: 'Your name', v: 'Riya Mehta' },
          { l: 'Email', v: 'riya@mocha.cafe' },
          { l: 'Password', v: '••••••••' },
        ].map((f) => (
          <div key={f.l}>
            <div className="text-[10px] font-medium text-coffee-700 mb-0.5">{f.l}</div>
            <div className="rounded-lg border border-coffee-200 bg-cream-50 px-2.5 py-2 text-coffee-900">{f.v}</div>
          </div>
        ))}
      </div>
      <button className="w-full bg-coffee-gradient text-cream-50 py-2 rounded-lg font-bold text-xs mt-4">
        Start free trial
      </button>
      <div className="text-[9px] text-coffee-500 text-center mt-2">No card needed · 14 days free</div>
    </div>
  );
}

function CafeProfileMockup() {
  return (
    <div className="rounded-3xl bg-white border border-coffee-200 shadow-coffee p-5 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl bg-coffee-gradient grid place-items-center text-cream-50 shrink-0">
          <Coffee className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-coffee-900 truncate">Cafe Mocha</div>
          <div className="text-[10px] text-coffee-500 truncate">12 Brigade Road · Bengaluru</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {[
          ['GST', '29ABCDE1234F1Z5'],
          ['FSSAI', '10012023012345'],
          ['Tax %', '5%'],
          ['Service', '5%'],
          ['Phone', '9876543210'],
          ['Currency', 'INR ₹'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-cream-100 p-2">
            <div className="text-coffee-500">{k}</div>
            <div className="font-semibold text-coffee-900">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuMockup() {
  return (
    <div className="rounded-3xl bg-white border border-coffee-200 shadow-coffee p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-coffee-900">Menu</span>
        <button className="bg-coffee-700 text-cream-50 rounded-lg px-2 py-1 text-[10px] font-bold">+ Add item</button>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-hidden">
        {['Coffee (4)', 'Pastry (3)', 'Mains (2)'].map((c, i) => (
          <span key={c} className={`pill text-[9px] ${i === 0 ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}>{c}</span>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { n: 'Cappuccino', p: '₹180', pop: true },
          { n: 'Cold Brew', p: '₹220' },
          { n: 'Latte', p: '₹200' },
        ].map((m) => (
          <div key={m.n} className="rounded-lg border border-coffee-100 p-2 flex items-center gap-2">
            <div className="h-9 w-9 rounded bg-coffee-gradient" />
            <div className="flex-1 text-[11px]">
              <div className="font-bold text-coffee-900 flex items-center gap-1">
                <span className="veg-dot scale-75" /> {m.n}
                {m.pop && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded">★</span>}
              </div>
              <div className="text-coffee-700">{m.p}</div>
            </div>
            <span className="text-coffee-500 text-[9px]">⋮</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QRMockup() {
  return (
    <div className="rounded-3xl bg-white border border-coffee-200 shadow-coffee p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-coffee-900">Tables &amp; QR</span>
        <button className="bg-coffee-700 text-cream-50 rounded-lg px-2 py-1 text-[10px] font-bold">+ Add</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="rounded-lg border border-coffee-100 p-2 text-center">
            <div className="text-[10px] font-bold text-coffee-900">Table {n}</div>
            <div className="my-1 mx-auto h-12 w-12 bg-white border border-coffee-200 rounded grid place-items-center">
              <QrCode className="h-10 w-10 text-coffee-900" />
            </div>
            <div className="flex justify-center gap-0.5">
              <span className="h-1.5 w-1.5 bg-coffee-700 rounded-sm" />
              <span className="h-1.5 w-1.5 bg-coffee-700 rounded-sm" />
              <span className="h-1.5 w-1.5 bg-rose-500 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintMockup() {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
      <div className="rotate-[-3deg]"><QRPrintCard /></div>
      <div className="rotate-[3deg] mt-4"><QRPrintCard /></div>
    </div>
  );
}

const ownerFaqs = [
  { q: 'How fast can I really set this up?', a: 'Most cafes go live in under 30 minutes. Heaviest part is photographing menu items.' },
  { q: 'Can I keep my existing POS?', a: 'Yes — CafeQR Pro complements your POS. Use it for QR ordering and let your POS handle the rest.' },
  { q: 'What about multiple branches?', a: 'Business plan supports unlimited locations under one account, with per-branch menus and staff.' },
  { q: 'Do customers need to download anything?', a: 'No. They scan, browse and order in their phone browser. Owners can install the dashboard as a PWA.' },
  { q: 'Can I customize my brand?', a: 'Yes — logo, colours, custom subdomain (Pro+) and even full custom domain.' },
  { q: 'What if my internet is slow?', a: 'The dashboard works on 3G. Customer menu is mobile-first and loads in under 1s.' },
];
