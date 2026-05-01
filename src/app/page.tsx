import Link from 'next/link';
import {
  ArrowRight, ArrowDown, Sparkles, Coffee, Plus, Check, Star, Download, Smartphone,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  MenuScreen, DashboardMini, QRPrintCard, OrderToast,
} from '@/components/mockups/screens';
import { prisma } from '@/lib/prisma';

// Re-render every 60s so admin updates to PlatformBranding (logo, app icon,
// splash, APK URLs) propagate to the home page within a minute without
// forcing every visit to hit the DB.
export const revalidate = 60;

async function getPlans() {
  try {
    return await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
    });
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
  const apkGoogle = branding?.apkUrlGoogle?.trim() || '/downloads/app-google-debug.apk';
  const apkAmazon = branding?.apkUrlAmazon?.trim() || '/downloads/app-amazon-debug.apk';
  const brandName = branding?.brandName?.trim() || 'WatShop Cafe';

  return (
    <div className="min-h-screen bg-cream-50 overflow-x-clip">
      <PublicNavbar />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-caramel/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-coffee-200/40 blur-3xl" />

        <div className="container relative pt-12 md:pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Live in 5 minutes · 5 मिनट में शुरू
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-coffee-900 max-w-3xl mx-auto">
            Your cafe's QR ordering store.
          </h1>
          <p className="mt-3 text-base md:text-lg text-coffee-700">
            No app. No code. Just your menu and a QR.
          </p>
          <p className="mt-1 text-sm text-coffee-500">
            कोई app नहीं · कोई code नहीं · सिर्फ़ आपका menu और एक QR
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

        {/* Hero visual: dashboard → phone */}
        <div className="container relative pb-16">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-center max-w-5xl mx-auto">
            <div className="relative">
              <span className="pill bg-coffee-700 text-cream-50 mb-2">You build · आप बनाते हैं</span>
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
              <span className="pill bg-caramel text-coffee-900 mb-2">They order · वो order करते हैं</span>
              <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 4-STEP GUIDE ═══════════ */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-14 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="pill bg-cream-200 text-coffee-800">Quick start guide</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
              4 steps to your first order.
            </h2>
            <p className="mt-2 text-coffee-700 text-sm">
              पहले order तक केवल 4 कदम — sign up से लेकर QR print तक।
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-center max-w-6xl mx-auto">
            <BuildStep
              n="01"
              label="Sign up"
              hi="साइन अप करें"
              hint="Email + cafe name. No card needed."
              hintHi="Email और cafe का नाम — कार्ड की ज़रूरत नहीं।"
              mockup={<SignupMockup />}
            />
            <StepArrow />
            <BuildStep
              n="02"
              label="Add your menu"
              hi="Menu जोड़ें"
              hint="Categories, photos, prices."
              hintHi="Categories, फ़ोटो, और दाम।"
              mockup={<MenuBuilderMockup />}
            />
            <StepArrow />
            <BuildStep
              n="03"
              label="Print your QR"
              hi="QR print करें"
              hint="One QR per table — print and stick."
              hintHi="हर table का एक QR — print करके लगाएँ।"
              mockup={<div className="scale-90"><QRPrintCard /></div>}
            />
            <StepArrow />
            <BuildStep
              n="04"
              label="Take orders"
              hi="Orders लें"
              hint="Customer scans → orders → you get pinged."
              hintHi="ग्राहक scan करता है → order आता है → आपको alert मिलता है।"
              mockup={<PhoneFrame size="sm"><MenuScreen /></PhoneFrame>}
            />
          </div>

          <div className="text-center mt-12">
            <Link href="/signup">
              <Button size="lg">Start building free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <p className="mt-3 text-xs text-coffee-500">
              Free for life on your first 30 orders / month · पहले 30 orders तक हमेशा मुफ़्त
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ MOBILE APP — icon mockup + APK downloads ═══════════ */}
      <section className="container py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center max-w-5xl mx-auto">
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

          <div className="text-center md:text-left">
            <span className="pill bg-cream-200 text-coffee-800">Mobile app · मोबाइल app</span>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900 leading-[1.05]">
              Run your cafe<br />from your phone.
            </h2>
            <p className="mt-3 text-coffee-700">
              Live orders, payments and WhatsApp alerts on the go.
            </p>
            <p className="mt-1 text-sm text-coffee-500">
              Live orders, payments और WhatsApp alerts — सब कुछ phone पर।
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
              <Smartphone className="h-3.5 w-3.5" /> Free on every plan · हर plan पर मुफ़्त
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING TEASER ═══════════ */}
      <section className="bg-coffee-gradient text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container relative py-14 md:py-20 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold">
            Pay only when you grow.
          </h2>
          <p className="mt-2 text-cream-200/90">
            Start free. Pick a plan when you outgrow it.
          </p>
          <p className="text-sm text-cream-200/80">
            मुफ़्त शुरू करें — ज़रूरत पड़ने पर plan चुनें।
          </p>
          {/* Pricing teaser cards — render only what the super admin has
              actually published in /admin/plans. No hardcoded fallback;
              if the admin has wiped the table the teaser cards collapse
              and we fall back to a clean "see plans" CTA below. */}
          {plans.length > 0 && (
            <div className="mt-8 grid md:grid-cols-3 gap-3 max-w-4xl mx-auto">
              {plans.slice(0, 3).map((p: any) => (
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
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/pricing"><Button variant="accent" size="lg">View pricing</Button></Link>
            <Link href="/signup">
              <Button variant="outline" size="lg" className="border-cream-200 bg-transparent text-cream-50 hover:bg-white/10">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="container py-14">
        <div className="rounded-3xl bg-cream-200 p-10 md:p-14 text-center relative overflow-hidden max-w-3xl mx-auto">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-caramel/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-coffee-200/50 rounded-full blur-3xl" />
          <div className="relative">
            <Coffee className="h-10 w-10 mx-auto text-coffee-700" />
            <h2 className="font-display text-3xl md:text-5xl font-bold text-coffee-900 mt-3">
              Build yours now.
            </h2>
            <p className="mt-2 text-coffee-700 text-sm">अभी अपना cafe बनाएँ।</p>
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

function BuildStep({
  n, label, hi, hint, hintHi, mockup,
}: {
  n: string;
  label: string;
  hi: string;
  hint: string;
  hintHi: string;
  mockup: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex items-center gap-1.5 bg-coffee-700 text-cream-50 rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-2">
        STEP {n}
      </div>
      <div className="font-display text-base font-bold text-coffee-900 text-center">{label}</div>
      <div className="text-[11px] text-coffee-500 mb-3 text-center">{hi}</div>
      <div className="flex items-center justify-center min-h-[200px]">{mockup}</div>
      <div className="mt-3 max-w-[200px] text-center">
        <p className="text-[11px] text-coffee-700 leading-snug">{hint}</p>
        <p className="text-[10px] text-coffee-500 leading-snug mt-0.5">{hintHi}</p>
      </div>
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

