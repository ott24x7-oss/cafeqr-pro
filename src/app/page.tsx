import Link from 'next/link';
import {
  QrCode,
  Smartphone,
  Bell,
  CreditCard,
  Star,
  Coffee,
  Utensils,
  Users,
  BarChart3,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

async function getPlans() {
  try {
    return await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-50" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-caramel/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-coffee-200/40 blur-3xl" />

        <div className="container relative py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-5">
              <Sparkles className="h-3.5 w-3.5" /> Trusted by 500+ cafes &amp; restaurants
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight text-coffee-900">
              QR ordering that <span className="text-gradient-coffee">just works</span>.
            </h1>
            <p className="mt-5 text-lg text-coffee-700 max-w-xl">
              Customers scan, order &amp; pay from their seat. You get every order on your dashboard and WhatsApp instantly. No app
              downloads, no waiters chasing tables.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="text-base">
                  Start free 14-day trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" size="lg" className="text-base">
                  See how it works
                </Button>
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-coffee-600">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />Setup in 5 minutes</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" />WhatsApp built-in</span>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="relative animate-fade-up">
            <PhoneMockup />
            <div className="absolute -left-6 top-12 hidden md:block">
              <FloatingCard icon={Bell} label="New order #1284" tone="amber" />
            </div>
            <div className="absolute -right-4 top-44 hidden md:block">
              <FloatingCard icon={CreditCard} label="₹680 paid" tone="emerald" />
            </div>
            <div className="absolute -left-8 bottom-12 hidden md:block">
              <FloatingCard icon={Star} label="5★ review!" tone="caramel" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: '500+', l: 'Cafes serving' },
            { v: '2.4M', l: 'Orders processed' },
            { v: '4.9★', l: 'Avg rating' },
            { v: '<3s', l: 'Order time' },
          ].map((s) => (
            <div key={s.l} className="card-warm text-center">
              <div className="font-display text-3xl font-bold text-coffee-900">{s.v}</div>
              <div className="text-xs text-coffee-600">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-16">
        <SectionHead
          eyebrow="How it works"
          title="From QR scan to served — in minutes"
          desc="A 4-step ordering flow your customers will love and your staff will thank you for."
        />
        <div className="mt-12 grid md:grid-cols-4 gap-5">
          {[
            { n: '01', t: 'Scan QR', d: 'Customer scans the unique table QR code with their phone camera.', i: QrCode },
            { n: '02', t: 'Browse & order', d: 'Mobile-first menu. Add items, notes, place order in 30 seconds.', i: Smartphone },
            { n: '03', t: 'You get notified', d: 'Order lands on dashboard with sound + WhatsApp ping to owner.', i: Bell },
            { n: '04', t: 'Serve & get paid', d: 'Mark ready, send bill link, customer pays via UPI. Done.', i: CreditCard },
          ].map((s) => (
            <div key={s.n} className="card-warm relative">
              <span className="absolute -top-3 left-5 rounded-full bg-coffee-700 px-3 py-1 text-xs font-bold text-cream-50">
                {s.n}
              </span>
              <s.i className="h-7 w-7 text-caramel-dark mt-2" />
              <h3 className="mt-4 font-bold text-coffee-900">{s.t}</h3>
              <p className="mt-1 text-sm text-coffee-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-16">
          <SectionHead
            eyebrow="Everything you need"
            title="Built for cafes & restaurants — every feature included"
            desc="Stop juggling 4 different apps. CafeQR Pro replaces them all."
          />
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.t} className="card-warm hover:-translate-y-0.5 transition-transform">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-coffee-100 text-coffee-800">
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-coffee-900">{f.t}</h3>
                <p className="mt-1 text-sm text-coffee-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD MOCK */}
      <section className="container py-20">
        <SectionHead
          eyebrow="Your control room"
          title="A dashboard you'll actually open every morning"
          desc="Live orders, kitchen view, analytics, payments — all in one calming, coffee-themed UI."
        />
        <div className="mt-12">
          <DashboardMockup />
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="bg-coffee-gradient text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container relative py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">
              Plans that grow with your cafe.
            </h2>
            <p className="mt-3 text-cream-200/90 max-w-md">
              Start free, upgrade when you need more tables, staff or branding. No setup fees, cancel anytime.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pricing"><Button variant="accent" size="lg">View pricing</Button></Link>
              <Link href="/signup"><Button variant="outline" size="lg" className="border-cream-200 bg-transparent text-cream-50 hover:bg-white/10">Start free</Button></Link>
            </div>
          </div>
          <div className="grid gap-3">
            {(plans.length ? plans : fallbackPlans).slice(0, 3).map((p: any) => (
              <div key={p.slug} className="rounded-2xl bg-white/10 backdrop-blur p-5 border border-white/15 flex items-center justify-between">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-sm opacity-80">{p.description ?? `${p.maxTables} tables • ${p.maxMenuItems} items`}</div>
                </div>
                <div className="text-2xl font-bold">₹{p.priceMonthly}<span className="text-sm opacity-70">/mo</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-20">
        <SectionHead
          eyebrow="Loved by cafe owners"
          title="What our customers say"
        />
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <figure key={t.name} className="card-warm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-caramel text-caramel" />
                ))}
              </div>
              <blockquote className="mt-3 text-coffee-800">"{t.quote}"</blockquote>
              <figcaption className="mt-4 text-sm">
                <div className="font-semibold text-coffee-900">{t.name}</div>
                <div className="text-coffee-600">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-12">
        <div className="rounded-3xl bg-cream-200 p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-caramel/30 rounded-full blur-3xl" />
          <h2 className="font-display text-3xl md:text-4xl font-bold text-coffee-900">Brew faster orders today</h2>
          <p className="mt-3 text-coffee-700 max-w-xl mx-auto">
            Set up your QR menu in 5 minutes. No card required.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup"><Button size="lg">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/how-it-works"><Button variant="outline" size="lg">Take the tour</Button></Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

const features = [
  { t: 'Smart QR codes', d: 'One unique QR per table. Print, download or share. Auto-pre-fills the table number.', i: QrCode },
  { t: 'Live order board', d: 'New / Preparing / Ready / Served — drag, click, done. Sound + browser alerts.', i: Bell },
  { t: 'WhatsApp built-in', d: 'Owner & customer notifications via wa.me, Cloud API or Baileys (your choice).', i: Smartphone },
  { t: 'UPI payments', d: 'Add UPI ID + QR. Customer pays, you verify. Or integrate Stripe later.', i: CreditCard },
  { t: 'Menu manager', d: 'Categories, variants, add-ons, veg/non-veg, spicy levels, happy-hour pricing.', i: Utensils },
  { t: 'Multi-staff roles', d: 'Owner / Manager / Cashier / Kitchen / Waiter — each sees what they need.', i: Users },
  { t: 'Analytics & reports', d: 'Today’s sales, best sellers, table-wise revenue, GST collected, exports.', i: BarChart3 },
  { t: 'Customer reviews', d: 'Auto-link after every order. 5-star ratings, comments, Google review redirect.', i: Star },
  { t: 'Lightning fast', d: 'PWA-ready menu loads in under 1s. Works offline once cached.', i: Zap },
];

const fallbackPlans = [
  { name: 'Starter', slug: 'starter', priceMonthly: 0, description: 'Free for 14 days', maxTables: 10, maxMenuItems: 50 },
  { name: 'Pro', slug: 'pro', priceMonthly: 499, description: 'Most popular', maxTables: 30, maxMenuItems: 200 },
  { name: 'Business', slug: 'business', priceMonthly: 1499, description: 'For growing chains', maxTables: 100, maxMenuItems: 1000 },
];

const testimonials = [
  { name: 'Riya Mehta', role: 'Owner, Cafe Mocha', quote: 'My waiters now spend time serving instead of taking orders. Sales jumped 22% in 2 months.' },
  { name: 'Arjun S.', role: 'Manager, Toast Cafe', quote: 'Setup took 10 minutes. WhatsApp notifications mean we never miss an order.' },
  { name: 'Sana Khan', role: 'Founder, Bean & Brew', quote: 'The dashboard looks beautiful. My customers love how easy ordering is.' },
];

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800">
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold text-coffee-900">{title}</h2>
      {desc && <p className="mt-3 text-coffee-700">{desc}</p>}
    </div>
  );
}

function FloatingCard({ icon: I, label, tone }: { icon: any; label: string; tone: string }) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-900',
    emerald: 'bg-emerald-100 text-emerald-900',
    caramel: 'bg-cream-200 text-coffee-900',
  };
  return (
    <div className={`rounded-xl px-3 py-2 shadow-coffee text-sm font-semibold flex items-center gap-2 animate-float ${tones[tone]}`}>
      <I className="h-4 w-4" />
      {label}
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto w-[280px] md:w-[320px] aspect-[9/19] rounded-[2.5rem] bg-coffee-900 p-3 shadow-coffee">
      <div className="h-full w-full rounded-[2rem] bg-cream-50 overflow-hidden flex flex-col">
        <div className="bg-coffee-gradient text-cream-50 px-4 py-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse-dot" /> Table 7 · Open
          </div>
          <div className="mt-2 font-display text-xl font-bold">Cafe Mocha</div>
        </div>
        <div className="p-3 flex-1 overflow-hidden">
          <div className="flex gap-2 mb-3">
            <span className="pill bg-coffee-700 text-cream-50">All</span>
            <span className="pill bg-cream-200 text-coffee-800">Coffee</span>
            <span className="pill bg-cream-200 text-coffee-800">Pastry</span>
          </div>
          <div className="space-y-2">
            {[
              { n: 'Cappuccino', d: 'Rich espresso, foamed milk', p: 180 },
              { n: 'Cold Brew', d: '12-hour slow brewed', p: 220 },
              { n: 'Croissant', d: 'Flaky, buttery', p: 120 },
            ].map((m) => (
              <div key={m.n} className="rounded-xl border border-coffee-100 bg-white p-2.5 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-coffee-gradient flex items-center justify-center">
                  <Coffee className="h-5 w-5 text-cream-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-coffee-900 truncate">{m.n}</div>
                  <div className="text-[10px] text-coffee-500 truncate">{m.d}</div>
                  <div className="text-xs font-bold text-coffee-800 mt-0.5">₹{m.p}</div>
                </div>
                <button className="rounded-full bg-coffee-700 text-cream-50 h-7 w-7 grid place-items-center text-sm">+</button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-coffee-100 bg-cream-100">
          <button className="w-full bg-coffee-gradient text-cream-50 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            View cart · ₹520 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-3xl border border-coffee-200 bg-white shadow-coffee overflow-hidden">
      <div className="border-b border-coffee-100 px-5 py-3 flex items-center justify-between bg-cream-100">
        <div className="flex items-center gap-2 text-coffee-800 font-semibold">
          <Coffee className="h-4 w-4" /> CafeQR Pro · Cafe Mocha
        </div>
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
      </div>
      <div className="grid md:grid-cols-[200px_1fr]">
        <aside className="hidden md:block border-r border-coffee-100 bg-cream-50 p-4 text-sm text-coffee-700 space-y-1">
          {['Dashboard', 'Live Orders', 'Menu', 'Tables', 'Payments', 'Reviews', 'Analytics'].map((n, i) => (
            <div key={n} className={`px-3 py-2 rounded-lg ${i === 1 ? 'bg-coffee-700 text-cream-50' : 'hover:bg-cream-200'}`}>
              {n}
            </div>
          ))}
        </aside>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { l: 'Today', v: '₹12,840', s: '+18%', tone: 'text-emerald-600' },
              { l: 'Orders', v: '47', s: '12 new', tone: 'text-amber-600' },
              { l: 'Pending', v: '3', s: 'Hot', tone: 'text-rose-600' },
              { l: 'Reviews', v: '4.9★', s: '128 ratings', tone: 'text-coffee-700' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-coffee-100 p-3 bg-white">
                <div className="text-xs text-coffee-500">{s.l}</div>
                <div className="font-bold text-xl text-coffee-900">{s.v}</div>
                <div className={`text-xs ${s.tone}`}>{s.s}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {['NEW', 'PREPARING', 'READY', 'SERVED'].map((col, idx) => (
              <div key={col} className="rounded-xl bg-cream-100 p-3">
                <div className="text-xs font-bold text-coffee-700 mb-2">{col}</div>
                {Array.from({ length: 3 - (idx % 2) }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-white border border-coffee-100 p-2.5 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-coffee-900">#1{200 + idx * 7 + i}</span>
                      <span className="text-coffee-500">T-{i + 2}</span>
                    </div>
                    <div className="text-xs text-coffee-600 mt-1">2 items · ₹{280 + i * 60}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
