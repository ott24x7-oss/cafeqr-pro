'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, Award, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxTables: number;
  maxMenuItems: number;
  maxOrdersPerMonth: number;
  whatsappEnabled: boolean;
  loyaltyEnabled: boolean;
  paymentEnabled: boolean;
  couponsEnabled: boolean;
  isPopular: boolean;
}

const FALLBACK_PLANS: Plan[] = [
  { id: 'free',    slug: 'free',    name: 'Free Lifetime', description: 'Get started for free.',          priceMonthly: 0,   priceYearly: 0,    maxTables: 2,  maxMenuItems: 10,  maxOrdersPerMonth: 30,   whatsappEnabled: false, loyaltyEnabled: false, paymentEnabled: false, couponsEnabled: false, isPopular: false },
  { id: 'startup', slug: 'startup', name: 'Startup',       description: 'For small cafes.',               priceMonthly: 199, priceYearly: 1200, maxTables: 10, maxMenuItems: 25,  maxOrdersPerMonth: 100,  whatsappEnabled: true,  loyaltyEnabled: true,  paymentEnabled: true,  couponsEnabled: true,  isPopular: false },
  { id: 'silver',  slug: 'silver',  name: 'Silver',        description: 'Most popular.',                  priceMonthly: 299, priceYearly: 1799, maxTables: 25, maxMenuItems: 50,  maxOrdersPerMonth: 200,  whatsappEnabled: true,  loyaltyEnabled: true,  paymentEnabled: true,  couponsEnabled: true,  isPopular: true  },
  { id: 'gold',    slug: 'gold',    name: 'Gold',          description: 'For high-volume cafes.',         priceMonthly: 499, priceYearly: 2999, maxTables: 50, maxMenuItems: 200, maxOrdersPerMonth: 1000, whatsappEnabled: true,  loyaltyEnabled: true,  paymentEnabled: true,  couponsEnabled: true,  isPopular: false },
];

export function PricingCards({ plans: serverPlans }: { plans: Plan[] }) {
  const plans = serverPlans.length === 4 ? serverPlans : FALLBACK_PLANS;
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Billing-cycle toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full bg-cream-200 p-1 text-sm font-semibold">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-full transition ${billing === 'monthly' ? 'bg-white text-coffee-900 shadow-soft' : 'text-coffee-600'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded-full transition flex items-center gap-1.5 ${billing === 'yearly' ? 'bg-white text-coffee-900 shadow-soft' : 'text-coffee-600'}`}
          >
            Yearly
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-bold">
              Save 50%
            </span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <PlanCard key={p.slug} plan={p} billing={billing} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: 'monthly' | 'yearly' }) {
  const isFree = plan.priceMonthly === 0;
  const yearlyMonthlyEquivalent = plan.priceYearly > 0 ? Math.round(plan.priceYearly / 12) : 0;

  const price = billing === 'yearly' && plan.priceYearly > 0 ? plan.priceYearly : plan.priceMonthly;
  const cycle = isFree ? '' : (billing === 'yearly' ? '/yr' : '/mo');

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col ${
        plan.isPopular
          ? 'border-coffee-700 bg-white shadow-coffee scale-[1.02]'
          : 'border-coffee-100 bg-white shadow-soft'
      }`}
    >
      {plan.isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-coffee-gradient text-cream-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <Award className="h-3 w-3" /> Most popular
        </span>
      )}

      <div className="text-center pb-4 border-b border-coffee-100">
        <h3 className="font-display text-xl font-bold text-coffee-900">{plan.name}</h3>
        {plan.description && <p className="text-xs text-coffee-500 mt-1 min-h-[2rem]">{plan.description}</p>}
      </div>

      <div className="text-center py-5">
        <div className="font-display font-bold text-coffee-900">
          {isFree ? (
            <span className="text-4xl">Free</span>
          ) : (
            <>
              <span className="text-4xl">₹{price}</span>
              <span className="text-base text-coffee-500 font-normal">{cycle}</span>
            </>
          )}
        </div>
        {billing === 'yearly' && plan.priceYearly > 0 && (
          <div className="text-[11px] text-coffee-500 mt-0.5">
            ≈ ₹{yearlyMonthlyEquivalent}/mo · billed annually
          </div>
        )}
        {billing === 'monthly' && plan.priceYearly > 0 && (
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            Save 50% with yearly →
          </div>
        )}
      </div>

      <ul className="space-y-2.5 text-sm flex-1">
        <Feat
          on
          label={
            plan.maxOrdersPerMonth === 0
              ? 'Unlimited orders'
              : `${plan.maxOrdersPerMonth.toLocaleString()} orders / month`
          }
        />
        <Feat on label={`${plan.maxMenuItems} menu items`} />
        <Feat on label={`${plan.maxTables} ${plan.maxTables === 1 ? 'table' : 'tables'}`} />
        <Feat on={plan.whatsappEnabled} label="WhatsApp integration" />
        <Feat on={plan.loyaltyEnabled} label="Loyalty points" />
        <Feat on={plan.paymentEnabled} label="UPI payments" />
        <Feat on={plan.couponsEnabled} label="Coupons" />
      </ul>

      <Link
        href={`/signup?plan=${plan.slug}${billing === 'yearly' ? '&cycle=yearly' : ''}`}
        className="mt-5 block"
      >
        <Button
          className="w-full"
          variant={plan.isPopular ? 'default' : isFree ? 'outline' : 'default'}
        >
          {isFree ? 'Start free' : 'Choose plan'} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function Feat({ on, label }: { on: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${on ? 'text-coffee-800' : 'text-coffee-400'}`}>
      {on ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : (
        <Lock className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className={on ? '' : 'line-through opacity-70'}>{label}</span>
    </li>
  );
}
