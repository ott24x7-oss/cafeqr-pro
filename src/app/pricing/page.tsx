import { Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { prisma } from '@/lib/prisma';
import { JsonLd } from '@/components/seo/json-ld';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { PricingCards } from './pricing-cards';

export const metadata: Metadata = {
  title: 'Pricing — pay only for the orders you take',
  description:
    'Simple, usage-based pricing for WatShop Cafe. Free for life on your first 30 orders a month, then pick a plan as you grow — no card required, upgrade anytime.',
  alternates: { canonical: '/pricing' },
};
// 60s matches the landing page so plan changes propagate consistently.
// Admin mutations also call revalidatePath('/pricing') for instant updates;
// this is just the safety net for edits made outside the admin flow
// (direct DB writes, migrations).
export const revalidate = 60;

async function getPlans() {
  try {
    // Pull every active plan the super admin has set up — no slug
    // whitelist. Whatever lives in /admin/plans → Active surfaces here.
    return await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
    });
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const plans = await getPlans();

  const prices = plans.map((p: any) => Number(p.priceMonthly) || 0);
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android',
    url: `${SITE_URL}/pricing`,
    ...(plans.length
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: String(Math.min(...prices)),
            highPrice: String(Math.max(...prices)),
            offerCount: String(plans.length),
            offers: plans.map((p: any) => ({
              '@type': 'Offer',
              name: p.name,
              price: String(Number(p.priceMonthly) || 0),
              priceCurrency: 'INR',
              url: `${SITE_URL}/pricing`,
            })),
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <JsonLd data={softwareSchema} />
      <PublicNavbar />

      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-30" />
        <div className="container relative pt-12 md:pt-16 pb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Pay only for what you use
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-coffee-900 max-w-3xl mx-auto leading-[1.05]">
            Pricing that grows with your cafe.
          </h1>
          <p className="mt-3 text-lg text-coffee-700 max-w-xl mx-auto">
            Free for life on your first 30 orders a month. Pick a plan when you outgrow it.
          </p>
        </div>
      </section>

      <section className="container pb-16">
        <PricingCards plans={plans as any} />
      </section>

      <section className="container max-w-3xl py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-coffee-900 text-center mb-10">
          Frequently asked
        </h2>
        <dl className="space-y-5">
          {faqs.map((q) => (
            <div key={q.q} className="card-warm">
              <dt className="font-bold text-coffee-900">{q.q}</dt>
              <dd className="text-coffee-700 mt-1.5 text-sm leading-relaxed">{q.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <PublicFooter />
    </div>
  );
}

const faqs: { q: string; a: string }[] = [
  {
    q: 'How does the order limit work?',
    a: 'Each plan caps the number of paid customer orders you can take per calendar month. The counter resets on the 1st of every month. Cancelled orders don\'t count.',
  },
  {
    q: 'What happens if I exceed my limit?',
    a: 'You get a soft warning at 100% of the limit and have a small buffer to finish in-progress checkouts. New orders are blocked once you cross 110%. Upgrade in one click and the limit lifts immediately.',
  },
  {
    q: 'Is the Free plan really free forever?',
    a: 'Yes. 30 orders a month, 10 menu items, 2 tables — no card required, no time limit. Loyalty / WhatsApp / payment / coupons stay locked until you upgrade.',
  },
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes. Upgrade is instant; downgrade takes effect at the end of your current billing cycle so you don\'t lose any paid time.',
  },
  {
    q: 'Do annual plans really save 50%?',
    a: 'Yes. Annual pricing is roughly 50% off the equivalent monthly cost — you pay for the year up front. Renew manually via WhatsApp UPI link, no auto-charge surprises.',
  },
];
