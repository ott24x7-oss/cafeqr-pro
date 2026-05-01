import Link from 'next/link';
import { Award, Check, Lock, ArrowUpRight, Sparkles } from 'lucide-react';
import type { PlanLimits } from '@/lib/plan-limits';

/**
 * Server card showing the cafe's currently-active plan + which features
 * it unlocks + a quick "Upgrade" / "Manage plan" affordance.
 *
 * Now a pure renderer — `limits` and `currentOrders` come in as props
 * from the parent so we don't double-fetch the same data the dashboard
 * page already has.
 */
export function PlanCard({ limits, current }: { limits: PlanLimits; current: number }) {
  const isFree = limits.planSlug === 'free' || limits.priceMonthly === 0;
  const features: { label: string; on: boolean }[] = [
    { label: 'WhatsApp integration', on: limits.features.whatsapp },
    { label: 'Loyalty points',       on: limits.features.loyalty },
    { label: 'UPI payments',         on: limits.features.payment },
    { label: 'Coupons',              on: limits.features.coupons },
    { label: 'Custom branding',      on: limits.features.customBranding },
    { label: 'Analytics',            on: limits.features.analytics },
  ];

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden ${
      isFree
        ? 'border-coffee-200 bg-cream-100'
        : 'border-coffee-200 bg-gradient-to-br from-cream-50 to-cream-100 shadow-soft'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`grid h-12 w-12 place-items-center rounded-2xl shrink-0 ${
            isFree ? 'bg-coffee-200 text-coffee-800' : 'bg-coffee-gradient text-cream-50 shadow-coffee'
          }`}>
            {isFree ? <Sparkles className="h-5 w-5" /> : <Award className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-coffee-500">Current plan</div>
            <div className="font-display text-xl sm:text-2xl font-bold text-coffee-900 leading-tight">
              {limits.planName ?? 'Free Lifetime'}
            </div>
            <div className="text-xs text-coffee-600 mt-0.5">
              {limits.maxOrdersPerMonth > 0
                ? `${current.toLocaleString()} / ${limits.maxOrdersPerMonth.toLocaleString()} orders this month`
                : `${current.toLocaleString()} orders this month · unlimited`}
              {' · '}
              {limits.maxMenuItems} items · {limits.maxTables} tables
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/billing"
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shrink-0 ${
            isFree
              ? 'bg-coffee-700 text-cream-50 hover:bg-coffee-800'
              : 'bg-white border border-coffee-200 text-coffee-800 hover:bg-cream-50'
          }`}
        >
          {isFree ? 'Upgrade' : 'Manage'} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Feature pills row — locked items get a Lock icon + line-through
          so the owner can see at a glance what they're missing. */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {features.map((f) => (
          <span
            key={f.label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              f.on
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-cream-200 text-coffee-500'
            }`}
            title={f.on ? 'Included in your plan' : 'Locked — upgrade to unlock'}
          >
            {f.on ? (
              <Check className="h-2.5 w-2.5" />
            ) : (
              <Lock className="h-2.5 w-2.5" />
            )}
            <span className={f.on ? '' : 'line-through opacity-80'}>{f.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
