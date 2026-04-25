import Link from 'next/link';
import {
  ArrowRight, Sparkles, Star, Coffee, QrCode, Smartphone, Bell, CreditCard,
  ChefHat, Users, Utensils, BarChart3, MessageSquare, Check, Zap,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  ScanQRScreen, MenuScreen, CartScreen, TrackingScreen, PayScreen, ReviewScreen,
  DashboardMini, QRPrintCard, WANotificationMockup, OrderToast,
} from '@/components/mockups/screens';
import { prisma } from '@/lib/prisma';

async function getPlans() {
  try {
    return await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  } catch { return []; }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-cream-50 overflow-hidden">
      <PublicNavbar />

      {/* ═══════════ HERO — multi-phone showcase ═══════════ */}
      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-caramel/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-coffee-200/40 blur-3xl" />

        <div className="container relative pt-12 md:pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Trusted by 500+ cafes
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-coffee-900">
              Scan. Order. <br />
              <span className="text-gradient-coffee">Sip.</span>
            </h1>
            <p className="mt-4 text-lg text-coffee-700 max-w-md mx-auto lg:mx-0">
              QR menus that just work — no apps, no fuss.
            </p>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link href="/signup">
                <Button size="lg">Start free <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" size="lg">See it work</Button>
              </Link>
            </div>
          </div>

          {/* Phone fan */}
          <div className="relative h-[500px] md:h-[560px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-[120%] -translate-y-[55%] -rotate-12 z-0 hidden md:block opacity-90">
              <PhoneFrame size="sm"><ScanQRScreen /></PhoneFrame>
            </div>
            <div className="absolute left-1/2 top-1/2 translate-x-[20%] -translate-y-[45%] rotate-12 z-0 hidden md:block opacity-90">
              <PhoneFrame size="sm"><TrackingScreen /></PhoneFrame>
            </div>

            {/* Floating chips */}
            <div className="absolute top-12 left-2 hidden md:block z-20 animate-float">
              <FloatingChip icon={Bell} label="New order!" tone="amber" />
            </div>
            <div className="absolute top-32 right-2 hidden md:block z-20 animate-float" style={{ animationDelay: '0.8s' }}>
              <FloatingChip icon={CreditCard} label="₹861 paid" tone="emerald" />
            </div>
            <div className="absolute bottom-16 left-4 hidden md:block z-20 animate-float" style={{ animationDelay: '1.6s' }}>
              <FloatingChip icon={Star} label="5★ review" tone="caramel" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="container -mt-2 md:-mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 max-w-4xl mx-auto">
          {[
            { v: '500+', l: 'Cafes' },
            { v: '2.4M', l: 'Orders' },
            { v: '4.9★', l: 'Rating' },
            { v: '<3s', l: 'Order time' },
          ].map((s) => (
            <div key={s.l} className="card-warm text-center !p-3 md:!p-4">
              <div className="font-display text-2xl md:text-3xl font-bold text-coffee-900">{s.v}</div>
              <div className="text-[11px] md:text-xs text-coffee-600">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FLOW SHOWCASE — 4 phones in a row ═══════════ */}
      <section className="container py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="pill bg-cream-200 text-coffee-800">The flow</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            From scan to served
          </h2>
        </div>

        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-6 md:overflow-visible snap-x scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { n: '01', t: 'Scan', screen: <ScanQRScreen />, c: 'bg-coffee-700' },
            { n: '02', t: 'Order', screen: <MenuScreen />, c: 'bg-coffee-600' },
            { n: '03', t: 'Track', screen: <TrackingScreen />, c: 'bg-caramel-dark' },
            { n: '04', t: 'Pay & Review', screen: <PayScreen />, c: 'bg-caramel' },
          ].map((step) => (
            <div key={step.n} className="snap-start shrink-0 w-[260px] md:w-auto">
              <div className="text-center mb-3">
                <div className={`inline-flex items-center gap-2 ${step.c} text-cream-50 rounded-full px-3 py-1 text-xs font-bold`}>
                  {step.n} · {step.t}
                </div>
              </div>
              <PhoneFrame size="sm">{step.screen}</PhoneFrame>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ TWO-PERSPECTIVE CARDS ═══════════ */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-16 md:py-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="pill bg-cream-200 text-coffee-800">For everyone</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              Built for cafes &amp; their customers
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Link href="/for-customers" className="group">
              <div className="card-warm h-full hover:-translate-y-1 transition relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-coffee-100 rounded-full blur-2xl opacity-50 group-hover:scale-125 transition" />
                <div className="relative">
                  <span className="pill bg-coffee-700 text-cream-50 mb-4">For customers</span>
                  <h3 className="font-display text-2xl font-bold text-coffee-900 mt-3">No apps. No queues.</h3>
                  <p className="text-coffee-600 mt-2 text-sm">Scan, order from your seat, pay via UPI.</p>
                  <div className="mt-5 flex justify-center">
                    <PhoneFrame size="sm"><MenuScreen /></PhoneFrame>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1 text-coffee-700 font-semibold text-sm group-hover:gap-2 transition-all">
                    See customer view <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/for-owners" className="group">
              <div className="card-warm h-full hover:-translate-y-1 transition relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-cream-200 rounded-full blur-2xl opacity-70 group-hover:scale-125 transition" />
                <div className="relative">
                  <span className="pill bg-caramel text-coffee-900 mb-4">For cafe owners</span>
                  <h3 className="font-display text-2xl font-bold text-coffee-900 mt-3">Setup in 5 minutes.</h3>
                  <p className="text-coffee-600 mt-2 text-sm">Add menu, generate QR, take orders. Done.</p>
                  <div className="mt-5">
                    <DashboardMini />
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1 text-coffee-700 font-semibold text-sm group-hover:gap-2 transition-all">
                    See owner setup <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ DASHBOARD VIEW ═══════════ */}
      <section className="container py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="pill bg-cream-200 text-coffee-800">Owner dashboard</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            Your control room
          </h2>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="rounded-3xl border border-coffee-200 bg-white shadow-coffee overflow-hidden">
            <DashboardMini />
          </div>

          {/* Floating elements around dashboard */}
          <div className="absolute -top-4 -right-2 md:-right-10 hidden md:block">
            <OrderToast status="NEW" n="#1284" t="now" />
          </div>
          <div className="absolute -bottom-6 -left-2 md:-left-10 hidden md:block max-w-[260px]">
            <WANotificationMockup />
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — icon grid, 1-line each ═══════════ */}
      <section className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { i: QrCode, t: 'QR per table' },
            { i: Smartphone, t: 'No app needed' },
            { i: Bell, t: 'Live orders' },
            { i: MessageSquare, t: 'WhatsApp built-in' },
            { i: CreditCard, t: 'UPI payments' },
            { i: Utensils, t: 'Menu manager' },
            { i: Users, t: 'Multi-staff roles' },
            { i: BarChart3, t: 'Analytics' },
            { i: Star, t: 'Reviews' },
            { i: ChefHat, t: 'Kitchen view' },
            { i: Zap, t: 'PWA installable' },
            { i: Coffee, t: 'Cafe-themed UI' },
          ].map((f) => (
            <div key={f.t} className="card-warm text-center !p-4 hover:-translate-y-0.5 transition">
              <div className="grid h-10 w-10 mx-auto place-items-center rounded-xl bg-coffee-100 text-coffee-800 mb-2">
                <f.i className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-coffee-900">{f.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ QR + WhatsApp showcase ═══════════ */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
          <div>
            <span className="pill bg-cream-200 text-coffee-800">Print &amp; place</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              QR codes for every table.
            </h2>
            <p className="mt-3 text-coffee-700 max-w-md">
              Generate, download, print. One QR per table — auto-detects which one.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div className="rotate-[-4deg]"><QRPrintCard /></div>
            <div className="rotate-[4deg] mt-4"><QRPrintCard /></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto mt-20">
          <div className="md:order-2">
            <span className="pill bg-cream-200 text-coffee-800">Instant alerts</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              WhatsApp the moment an order lands.
            </h2>
            <p className="mt-3 text-coffee-700 max-w-md">
              Owner gets notified, customer gets updates. Manual `wa.me`, Cloud API or Baileys — your choice.
            </p>
          </div>
          <div className="md:order-1">
            <WANotificationMockup />
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING TEASER ═══════════ */}
      <section className="bg-coffee-gradient text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container relative py-16 md:py-20 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold">
            Plans that grow with you.
          </h2>
          <p className="mt-3 text-cream-200/90">Start free. Upgrade only when you need more.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {(plans.length ? plans : fallbackPlans).slice(0, 3).map((p: any) => (
              <div key={p.slug} className="rounded-2xl bg-white/10 backdrop-blur p-5 border border-white/15 text-left">
                <div className="text-xs uppercase tracking-wide opacity-70">{p.name}</div>
                <div className="text-3xl font-bold mt-1">
                  {p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}`}
                  {p.priceMonthly > 0 && <span className="text-sm opacity-70">/mo</span>}
                </div>
                <div className="text-xs opacity-80 mt-1">{p.maxTables} tables · {p.maxMenuItems} items</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/pricing"><Button variant="accent" size="lg">View pricing</Button></Link>
            <Link href="/signup"><Button variant="outline" size="lg" className="border-cream-200 bg-transparent text-cream-50 hover:bg-white/10">Start free</Button></Link>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIAL — compact ═══════════ */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <figure key={t.name} className="card-warm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-caramel text-caramel" />
                ))}
              </div>
              <blockquote className="mt-2 text-coffee-800 text-sm">"{t.q}"</blockquote>
              <figcaption className="mt-3 text-xs">
                <div className="font-semibold text-coffee-900">{t.n}</div>
                <div className="text-coffee-500">{t.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="container pb-12">
        <div className="rounded-3xl bg-cream-200 p-10 md:p-16 text-center relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-caramel/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-coffee-200/50 rounded-full blur-3xl" />
          <div className="relative">
            <Coffee className="h-10 w-10 mx-auto text-coffee-700" />
            <h2 className="font-display text-3xl md:text-5xl font-bold text-coffee-900 mt-4">
              Brew faster orders.
            </h2>
            <p className="mt-3 text-coffee-700">Ready in 5 minutes. No card needed.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/signup"><Button size="lg">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/how-it-works"><Button variant="outline" size="lg">Take the tour</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function FloatingChip({ icon: I, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-900',
    emerald: 'bg-emerald-100 text-emerald-900',
    caramel: 'bg-cream-200 text-coffee-900',
  };
  return (
    <div className={`rounded-xl px-3 py-2 shadow-coffee text-xs font-bold flex items-center gap-1.5 ${tones[tone]}`}>
      <I className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

const fallbackPlans = [
  { name: 'Starter', slug: 'starter', priceMonthly: 0, maxTables: 5, maxMenuItems: 30 },
  { name: 'Pro', slug: 'pro', priceMonthly: 499, maxTables: 30, maxMenuItems: 200 },
  { name: 'Business', slug: 'business', priceMonthly: 1499, maxTables: 200, maxMenuItems: 2000 },
];

const testimonials = [
  { n: 'Riya M.', r: 'Cafe Mocha · Bengaluru', q: 'Sales jumped 22% in 2 months. My waiters serve, not chase.' },
  { n: 'Arjun S.', r: 'Toast Cafe · Mumbai', q: '10-min setup. We never miss an order now.' },
  { n: 'Sana K.', r: 'Bean &amp; Brew · Delhi', q: 'Customers love how fast they can order.' },
];
