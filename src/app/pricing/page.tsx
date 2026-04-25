import Link from 'next/link';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Pricing — CafeQR Pro' };
export const revalidate = 60;

async function getPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans;
  } catch {
    return [];
  }
}

const FALLBACK = [
  {
    id: 'fallback-starter',
    name: 'Starter',
    slug: 'starter',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Free for 14 days. Then ₹0/forever for tiny cafes.',
    maxTables: 5,
    maxMenuItems: 30,
    maxStaff: 2,
    whatsappEnabled: true,
    customBranding: false,
    customSubdomain: false,
    prioritySupport: false,
    analytics: false,
    multiLanguage: false,
    isPopular: false,
    features: ['5 QR tables', '30 menu items', 'Live order board', 'WhatsApp wa.me notifications'],
  },
  {
    id: 'fallback-pro',
    name: 'Pro',
    slug: 'pro',
    priceMonthly: 499,
    priceYearly: 4990,
    description: 'For growing cafes & restaurants. Most popular choice.',
    maxTables: 30,
    maxMenuItems: 200,
    maxStaff: 10,
    whatsappEnabled: true,
    customBranding: true,
    customSubdomain: false,
    prioritySupport: false,
    analytics: true,
    multiLanguage: true,
    isPopular: true,
    features: [
      '30 tables · 200 items',
      'Multi-staff with roles',
      'Custom branding (logo, colours)',
      'Analytics & reports',
      'Coupons & happy-hour pricing',
      'Priority WhatsApp Cloud API',
    ],
  },
  {
    id: 'fallback-business',
    name: 'Business',
    slug: 'business',
    priceMonthly: 1499,
    priceYearly: 14990,
    description: 'For chains and high-volume operations.',
    maxTables: 200,
    maxMenuItems: 2000,
    maxStaff: 50,
    whatsappEnabled: true,
    customBranding: true,
    customSubdomain: true,
    prioritySupport: true,
    analytics: true,
    multiLanguage: true,
    isPopular: false,
    features: [
      'Unlimited tables · 2000 items',
      'Custom subdomain',
      'Priority support 24×7',
      'CSV/API exports',
      'Dedicated account manager',
    ],
  },
];

export default async function PricingPage() {
  const dbPlans = await getPlans();
  const plans = dbPlans.length ? dbPlans : FALLBACK;

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="container relative py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800">
            <Sparkles className="h-3.5 w-3.5" /> Pricing
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold text-coffee-900">
            Simple plans. <span className="text-gradient-coffee">No surprises.</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-coffee-700">
            Cancel anytime. Upgrade as you grow. All plans include a 14-day free trial — no card required.
          </p>
        </div>
      </section>

      <section className="container pb-12">
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p: any) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="container py-10">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 text-center mb-8">
          Compare features
        </h2>
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-coffee-100">
                <th className="text-left p-3 text-coffee-700 font-semibold">Feature</th>
                {plans.map((p: any) => (
                  <th key={p.id} className="p-3 font-semibold text-coffee-900">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-coffee-700">
              {[
                ['Tables', plans.map((p: any) => p.maxTables)],
                ['Menu items', plans.map((p: any) => p.maxMenuItems)],
                ['Staff accounts', plans.map((p: any) => p.maxStaff)],
                ['WhatsApp notifications', plans.map((p: any) => p.whatsappEnabled ? '✓' : '—')],
                ['Custom branding', plans.map((p: any) => p.customBranding ? '✓' : '—')],
                ['Custom subdomain', plans.map((p: any) => p.customSubdomain ? '✓' : '—')],
                ['Analytics', plans.map((p: any) => p.analytics ? '✓' : '—')],
                ['Priority support', plans.map((p: any) => p.prioritySupport ? '✓' : '—')],
                ['Multi-language', plans.map((p: any) => p.multiLanguage ? '✓' : '—')],
              ].map((row, i) => (
                <tr key={i} className="border-b border-coffee-50 last:border-0">
                  <td className="p-3 font-medium">{row[0] as string}</td>
                  {(row[1] as any[]).map((v, j) => (
                    <td key={j} className="p-3 text-center">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {faqs.map((f) => (
            <details key={f.q} className="card-warm group">
              <summary className="cursor-pointer font-semibold text-coffee-900 list-none flex items-center justify-between">
                {f.q}
                <span className="text-coffee-500 group-open:rotate-180 transition">⌄</span>
              </summary>
              <p className="mt-3 text-sm text-coffee-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container pb-12">
        <div className="rounded-3xl bg-coffee-gradient p-10 md:p-14 text-center text-cream-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-10" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold">Try it free for 14 days</h2>
          <p className="relative mt-3 max-w-xl mx-auto text-cream-200/90">
            Set up your menu, add tables, generate QR codes — see it work end-to-end before you decide.
          </p>
          <div className="relative mt-7">
            <Link href="/signup">
              <Button variant="accent" size="lg">Get started free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const features: string[] = plan.features?.length ? plan.features : [
    `${plan.maxTables} tables`,
    `${plan.maxMenuItems} menu items`,
    `${plan.maxStaff} staff accounts`,
    plan.whatsappEnabled && 'WhatsApp notifications',
    plan.analytics && 'Analytics dashboard',
    plan.customBranding && 'Custom branding',
  ].filter(Boolean) as string[];

  return (
    <div className={`card-warm relative flex flex-col ${plan.isPopular ? 'border-coffee-700 ring-2 ring-coffee-300 -translate-y-2' : ''}`}>
      {plan.isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coffee-700 text-cream-50 px-3 py-1 text-xs font-bold">
          Most popular
        </span>
      )}
      <h3 className="font-display text-2xl font-bold text-coffee-900">{plan.name}</h3>
      <p className="text-sm text-coffee-600 mt-1 min-h-[40px]">{plan.description}</p>
      <div className="mt-5">
        <span className="font-display text-4xl font-bold text-coffee-900">
          {plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly}`}
        </span>
        {plan.priceMonthly > 0 && <span className="text-coffee-600 text-sm"> /month</span>}
      </div>
      {plan.priceYearly > 0 && (
        <div className="text-xs text-coffee-500 mt-1">or ₹{plan.priceYearly}/year (save ~17%)</div>
      )}
      <ul className="mt-6 space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-coffee-700">
            <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <Link href={`/signup?plan=${plan.slug}`} className="mt-6">
        <Button className="w-full" variant={plan.isPopular ? 'default' : 'outline'}>
          {plan.priceMonthly === 0 ? 'Start free' : 'Choose ' + plan.name}
        </Button>
      </Link>
    </div>
  );
}

const faqs = [
  { q: 'Is there really a free trial?', a: 'Yes — 14 days, full features, no credit card required. After the trial you pick a plan or stay on the free Starter tier.' },
  { q: 'How does WhatsApp notification work?', a: 'By default, CafeQR Pro generates wa.me links you can tap to send. On Pro and above, you can plug in WhatsApp Cloud API or self-host Baileys for fully automated sends.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel from your billing page — your account stays active until the end of the current period.' },
  { q: 'Do you support multiple branches?', a: 'Yes — Business plan supports unlimited locations under one account, with per-location menus and staff.' },
  { q: 'How are payments collected?', a: 'CafeQR Pro generates UPI deep-links and shows your UPI QR. You verify transactions inside the dashboard. Stripe / Razorpay integrations are on our roadmap.' },
  { q: 'Will my customers need to download an app?', a: 'No. Customers scan the QR with their camera and order in the browser. Owners can install the dashboard as a PWA on phone/desktop.' },
];
