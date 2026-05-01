import Link from 'next/link';
import { ArrowUpRight, Sparkles, AlertTriangle } from 'lucide-react';
import type { PlanLimits, OrderLimitDecision } from '@/lib/plan-limits';

/**
 * Top-of-dashboard banner showing the cafe's monthly order usage and a
 * prominent upgrade CTA when they're nearing or at their plan's limit.
 *
 * Now a pure renderer — `plan` and `decision` come in from the parent
 * so we share the single plan + order-count fetch with PlanCard and
 * the rest of the dashboard.
 *
 * Renders nothing for cafes on Gold (1000/mo) until they reach 70% — for
 * everyone else it's always visible so the owner has a constant sense
 * of where they stand. State levels (least-to-most urgent):
 *   - hidden     : <70% usage AND not on Free
 *   - info       : 70-99% usage; just informational
 *   - warn       : 100-109% (soft window); owner should upgrade soon
 *   - blocked    : 110%+; new orders rejected at /api/orders/place
 *   - free-pitch : Always shown for Free Lifetime (regardless of usage)
 */
export function UsageBanner({ plan, decision }: { plan: PlanLimits; decision: OrderLimitDecision }) {

  // Unlimited or no plan resolution — render nothing.
  if (decision.limit === 0) return null;

  const isFree = plan.planSlug === 'free';
  const ratio = decision.ratio;
  const pct = Math.min(100, Math.round(ratio * 100));

  if (!isFree && ratio < 0.7) return null;

  let level: 'info' | 'warn' | 'blocked' | 'free' = 'info';
  if (decision.blocked) level = 'blocked';
  else if (decision.warn) level = 'warn';
  else if (isFree) level = 'free';

  const styles: Record<typeof level, { bg: string; ring: string; text: string; icon: any; label: string }> = {
    info:    { bg: 'bg-cream-100',    ring: 'border-coffee-200',  text: 'text-coffee-800',  icon: Sparkles,        label: 'Heads up' },
    warn:    { bg: 'bg-amber-50',     ring: 'border-amber-300',   text: 'text-amber-900',   icon: AlertTriangle,   label: 'Almost at the limit' },
    blocked: { bg: 'bg-rose-50',      ring: 'border-rose-300',    text: 'text-rose-900',    icon: AlertTriangle,   label: 'Limit reached' },
    free:    { bg: 'bg-cream-100',    ring: 'border-coffee-200',  text: 'text-coffee-800',  icon: Sparkles,        label: `On Free Lifetime` },
  };
  const s = styles[level];
  const Icon = s.icon;

  const message =
    level === 'blocked'
      ? `Customers can\'t place new orders right now. Upgrade your plan to keep taking orders.`
      : level === 'warn'
        ? `You\'re ${decision.current} / ${decision.limit} orders this month — buffer running out. Upgrade to keep accepting orders.`
        : level === 'free'
          ? `${decision.current} / ${decision.limit} orders used. Upgrade to unlock loyalty, WhatsApp, payments and more.`
          : `${decision.current} / ${decision.limit} orders this month — ${decision.limit - decision.current} left.`;

  return (
    <div className={`rounded-2xl border ${s.ring} ${s.bg} p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3`}>
      <div className={`grid h-9 w-9 place-items-center rounded-xl bg-white/80 shrink-0 ${s.text}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-wider ${s.text} opacity-80`}>{s.label}</div>
        <div className={`text-sm ${s.text} mt-0.5`}>{message}</div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              level === 'blocked' ? 'bg-rose-500' : level === 'warn' ? 'bg-amber-500' : 'bg-coffee-700'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link
        href="/dashboard/billing"
        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shrink-0 transition ${
          level === 'blocked'
            ? 'bg-rose-600 text-white hover:bg-rose-700'
            : level === 'warn'
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-coffee-700 text-cream-50 hover:bg-coffee-800'
        }`}
      >
        Upgrade <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
