import Link from 'next/link';
import {
  ArrowRight, ArrowDown, Sparkles, QrCode, Smartphone, Bell, CreditCard,
  Utensils, BarChart3, MessageSquare, Zap, Coffee, Plus, Check, Star, Download,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  ScanQRScreen, MenuScreen, TrackingScreen, PayScreen,
  DashboardMini, QRPrintCard, WANotificationMockup, OrderToast,
} from '@/components/mockups/screens';
import { prisma } from '@/lib/prisma';

// Re-render every 60 seconds so admin updates to PlatformBranding (logo,
// app icon, splash, APK URLs) propagate to the home page within a minute
// without forcing every visit to hit the DB.
export const revalidate = 60;

async function getPlans() {
  try {
    return await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  } catch { return []; }
}

async function getBranding() {
  try {
    return await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
  } catch { return null; }
}

export default async function LandingPage() {
  const [plans, branding] = await Promise.all([getPlans(), getBranding()]);
  const appIcon = branding?.appIconDataUrl ?? '';
  const splash = branding?.splashImageDataUrl ?? '';
  // Default to the APK files we ship under public/downloads/ when the admin
  // hasn't pasted a custom URL yet, so the home page download buttons work
  // out of the box. Admin can override either one in /admin/branding.
  const apkGoogle = branding?.apkUrlGoogle?.trim() || '/downloads/app-google-debug.apk';
  const apkAmazon = branding?.apkUrlAmazon?.trim() || '/downloads/app-amazon-debug.apk';
  const brandName = branding?.brandName?.trim() || 'WatShop Cafe';

  return (
    <div className="min-h-screen bg-cream-50 overflow-x-clip">
      <PublicNavbar />

      {/* ═══════════ HERO — split visual: dashboard → phone ═══════════ */}
      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-caramel/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-coffee-200/40 blur-3xl" />

        <div className="container relative pt-12 md:pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
            <Sparkles className="h-3.5 w-3.5" /> 500+ cafes · Live in 5 minutes
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-coffee-900 max-w-3xl mx-auto">
            Build your cafe's QR ordering store.
          </h1>
          <p className="mt-3 text-base md:text-lg text-coffee-700">
            No app. No code. Just your menu and a QR.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">Start free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">See live demo</Button>
            </Link>
          </div>
        </div>

        {/* Hero visual: dashboard → phone with menu */}
        <div className="container relative pb-16">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-center max-w-5xl mx-auto">
            <div className="relative">
              <span className="pill bg-coffee-700 text-cream-50 mb-2">You build</span>
              <DashboardMini />
              <div className="absolute -top-3 -right-3 hidden md:block">
                <OrderToast status="NEW" n="#1284" t="now" />
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center text-coffee-500">
              <ArrowRight className="h-8 w-8" />
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">becomes</span>
            </div>
            <div className="flex md:hidden justify-center">
              <ArrowDown className="h-8 w-8 text-coffee-500" />
            </div>
            <div className="relative">
              <span className="pill bg-caramel text-coffee-900 mb-2">They order</span>
              <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ BUILD IN 4 STEPS — the visual flow ═══════════ */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="pill bg-cream-200 text-coffee-800">How you build</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
              Sign up to selling in 4 steps
            </h2>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-center max-w-6xl mx-auto">
            <BuildStep n="01" label="Sign up" mockup={<SignupMockup />} />
            <StepArrow />
            <BuildStep n="02" label="Add your menu" mockup={<MenuBuilderMockup />} />
            <StepArrow />
            <BuildStep n="03" label="Print your QR" mockup={<div className="scale-90"><QRPrintCard /></div>} />
            <StepArrow />
            <BuildStep n="04" label="Customers order" mockup={<PhoneFrame size="sm"><MenuScreen /></PhoneFrame>} />
          </div>

          <div className="text-center mt-10">
            <Link href="/signup">
              <Button size="lg">Start building free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ CUSTOMER EXPERIENCE — 4 phones, no copy ═══════════ */}
      <section className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="pill bg-cream-200 text-coffee-800">What your customers see</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            Scan → Order → Track → Pay
          </h2>
        </div>

        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-6 md:overflow-visible snap-x scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { n: '01', t: 'Scan', screen: <ScanQRScreen />, c: 'bg-coffee-700' },
            { n: '02', t: 'Order', screen: <MenuScreen />, c: 'bg-coffee-600' },
            { n: '03', t: 'Track', screen: <TrackingScreen />, c: 'bg-caramel-dark' },
            { n: '04', t: 'Pay', screen: <PayScreen />, c: 'bg-caramel' },
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

      {/* ═══════════ OWNER VIEW — dashboard + live notifications ═══════════ */}
      <section className="bg-cream-100/60 border-y border-coffee-100">
        <div className="container py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="pill bg-cream-200 text-coffee-800">What you see</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
              One dashboard. Every order.
            </h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="rounded-3xl border border-coffee-200 bg-white shadow-coffee overflow-hidden">
              <DashboardMini />
            </div>
            <div className="absolute -top-4 -right-2 md:-right-10 hidden md:block">
              <OrderToast status="NEW" n="#1284" t="now" />
            </div>
            <div className="absolute -bottom-6 -left-2 md:-left-10 hidden md:block max-w-[260px]">
              <WANotificationMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ MOBILE APP — icon mockup + APK downloads ═══════════
          Both icon and splash are admin-overridable (PlatformBranding ->
          appIconDataUrl / splashImageDataUrl). Download buttons render only
          when the corresponding APK URL is set in /admin/branding. */}
      <section className="container py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center max-w-5xl mx-auto">
          {/* Phone with splash + icon */}
          <div className="relative mx-auto">
            <PhoneFrame size="md">
              <div className="h-full w-full relative bg-coffee-gradient flex items-center justify-center overflow-hidden">
                {splash ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={splash}
                    alt={`${brandName} splash`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-pattern opacity-20" />
                )}
                {/* Foreground: icon + brand name on top of splash/gradient.
                    Hidden if a splash image is supplied — the splash itself
                    typically bakes in the icon. */}
                {!splash && (
                  <div className="relative flex flex-col items-center text-cream-50">
                    {appIcon ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={appIcon}
                        alt={`${brandName} app icon`}
                        className="h-20 w-20 rounded-3xl shadow-coffee object-cover"
                      />
                    ) : (
                      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/15 backdrop-blur shadow-coffee">
                        <Coffee className="h-10 w-10" />
                      </span>
                    )}
                    <div className="mt-4 font-display text-xl font-bold">{brandName}</div>
                    <div className="text-[10px] opacity-80 tracking-wider mt-0.5">CAFE OWNER APP</div>
                  </div>
                )}
              </div>
            </PhoneFrame>
            {/* Floating app-icon badge in front of phone */}
            <div className="absolute -bottom-4 -right-4 md:-right-8">
              {appIcon ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={appIcon}
                  alt=""
                  className="h-16 w-16 md:h-20 md:w-20 rounded-3xl shadow-coffee border-4 border-cream-50 object-cover"
                />
              ) : (
                <span className="grid h-16 w-16 md:h-20 md:w-20 place-items-center rounded-3xl bg-coffee-gradient text-cream-50 shadow-coffee border-4 border-cream-50">
                  <Coffee className="h-8 w-8 md:h-10 md:w-10" />
                </span>
              )}
            </div>
          </div>

          {/* Right column: copy + download buttons */}
          <div className="text-center md:text-left">
            <span className="pill bg-cream-200 text-coffee-800">Mobile app</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900 leading-[1.05]">
              Run your cafe<br />from your phone.
            </h2>
            <p className="mt-3 text-coffee-700">
              The companion app for cafe owners — live orders, kitchen view, payments and
              WhatsApp alerts on the go.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
              {apkGoogle && (
                <a
                  href={apkGoogle}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-coffee-700 text-cream-50 px-4 py-3 font-semibold text-sm hover:bg-coffee-800 transition shadow-soft"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    <span className="block text-[10px] font-normal opacity-80 leading-none">Download for</span>
                    <span className="block leading-tight">Android (Google)</span>
                  </span>
                </a>
              )}
              {apkAmazon && (
                <a
                  href={apkAmazon}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-caramel text-coffee-900 px-4 py-3 font-semibold text-sm hover:bg-caramel-dark transition shadow-soft"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    <span className="block text-[10px] font-normal opacity-80 leading-none">Available on</span>
                    <span className="block leading-tight">Amazon Appstore</span>
                  </span>
                </a>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-coffee-500 justify-center md:justify-start">
              <Smartphone className="h-3.5 w-3.5" /> Free for cafe owners on every plan
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — single icon strip, no copy ═══════════ */}
      <section className="container py-12 md:py-16">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {[
            { i: QrCode, t: 'QR per table' },
            { i: Smartphone, t: 'No app' },
            { i: Bell, t: 'Live orders' },
            { i: MessageSquare, t: 'WhatsApp' },
            { i: CreditCard, t: 'UPI' },
            { i: Utensils, t: 'Menu' },
            { i: BarChart3, t: 'Analytics' },
            { i: Zap, t: 'PWA' },
          ].map((f) => (
            <div key={f.t} className="card-warm text-center !p-3 hover:-translate-y-0.5 transition">
              <div className="grid h-9 w-9 mx-auto place-items-center rounded-xl bg-coffee-100 text-coffee-800 mb-1.5">
                <f.i className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-semibold text-coffee-900">{f.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ PRICING — 3 cards ═══════════ */}
      <section className="bg-coffee-gradient text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container relative py-16 md:py-20 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold">
            Plans that grow with you.
          </h2>
          <p className="mt-2 text-cream-200/90">Start free.</p>
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

      {/* ═══════════ FINAL CTA — minimal ═══════════ */}
      <section className="container py-16">
        <div className="rounded-3xl bg-cream-200 p-10 md:p-14 text-center relative overflow-hidden max-w-3xl mx-auto">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-caramel/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-coffee-200/50 rounded-full blur-3xl" />
          <div className="relative">
            <Coffee className="h-10 w-10 mx-auto text-coffee-700" />
            <h2 className="font-display text-3xl md:text-5xl font-bold text-coffee-900 mt-3">
              Build yours now.
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/signup"><Button size="lg">Start free <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/demo"><Button variant="outline" size="lg">Watch demo</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/* ───────────────── helper components ───────────────── */

function BuildStep({ n, label, mockup }: { n: string; label: string; mockup: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex items-center gap-1.5 bg-coffee-700 text-cream-50 rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-2">
        STEP {n}
      </div>
      <div className="font-display text-base font-bold text-coffee-900 mb-3 text-center">{label}</div>
      <div className="flex items-center justify-center min-h-[200px]">{mockup}</div>
    </div>
  );
}

function StepArrow() {
  return (
    <div className="flex md:flex-col items-center justify-center text-coffee-400">
      <ArrowRight className="hidden md:block h-6 w-6" />
      <ArrowDown className="md:hidden h-6 w-6 mx-auto my-2" />
    </div>
  );
}

/* Tiny inline mockups used only by the build-flow section */

function SignupMockup() {
  return (
    <div className="rounded-2xl border border-coffee-200 bg-white shadow-soft p-3 w-[200px]">
      <div className="font-display text-xs font-bold text-coffee-900 mb-2">Create your cafe</div>
      <div className="space-y-1.5">
        <div className="rounded-md bg-cream-100 px-2 py-1.5 text-[10px] text-coffee-700">Cafe Mocha</div>
        <div className="rounded-md bg-cream-100 px-2 py-1.5 text-[10px] text-coffee-700">you@cafe.com</div>
        <div className="rounded-md bg-cream-100 px-2 py-1.5 text-[10px] text-coffee-400">••••••••</div>
        <div className="rounded-md bg-coffee-gradient text-cream-50 text-center py-1.5 text-[10px] font-bold">
          Start free trial
        </div>
      </div>
      <div className="mt-2 text-[9px] text-emerald-600 flex items-center gap-1">
        <Check className="h-2.5 w-2.5" /> No card needed
      </div>
    </div>
  );
}

function MenuBuilderMockup() {
  return (
    <div className="rounded-2xl border border-coffee-200 bg-white shadow-soft p-3 w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display text-xs font-bold text-coffee-900">Menu</div>
        <span className="inline-flex items-center gap-0.5 text-[9px] bg-coffee-700 text-cream-50 rounded-full px-1.5 py-0.5">
          <Plus className="h-2 w-2" /> Add
        </span>
      </div>
      <div className="space-y-1.5">
        {[
          { n: 'Cappuccino', p: 180 },
          { n: 'Cold Brew', p: 220 },
          { n: 'Truffle Pasta', p: 460 },
        ].map((i) => (
          <div key={i.n} className="rounded-md border border-coffee-100 bg-white p-1.5 flex items-center gap-1.5">
            <div className="h-6 w-6 rounded bg-coffee-gradient" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-coffee-900 truncate">{i.n}</div>
              <div className="text-[9px] text-coffee-700">₹{i.p}</div>
            </div>
            <Star className="h-2.5 w-2.5 fill-caramel text-caramel" />
          </div>
        ))}
      </div>
    </div>
  );
}

const fallbackPlans = [
  { name: 'Starter', slug: 'starter', priceMonthly: 0, maxTables: 5, maxMenuItems: 30 },
  { name: 'Pro', slug: 'pro', priceMonthly: 499, maxTables: 30, maxMenuItems: 200 },
  { name: 'Business', slug: 'business', priceMonthly: 1499, maxTables: 200, maxMenuItems: 2000 },
];
