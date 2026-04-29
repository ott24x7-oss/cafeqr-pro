import Link from 'next/link';
import { Lock, ArrowUpRight } from 'lucide-react';

/**
 * Frosted overlay that drops on top of a dashboard panel whose feature
 * is locked by the cafe's current plan. Pure presentation; the actual
 * server-side enforcement lives in plan-limits.ts and the relevant API
 * routes — this is the UX nudge that lets owners see what they're
 * missing without being able to edit the values.
 */
export function FeatureLockOverlay({
  featureName,
  requiredPlan = 'Startup',
}: {
  featureName: string;
  requiredPlan?: string;
}) {
  return (
    <div
      className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-sm"
      // The wrapper absolutely positions; consumer should be `relative`.
    >
      <div className="text-center px-6 py-8 max-w-sm">
        <div className="mx-auto h-12 w-12 grid place-items-center rounded-2xl bg-coffee-gradient text-cream-50 shadow-coffee">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-coffee-900">
          {featureName} is on the {requiredPlan} plan
        </h3>
        <p className="mt-1 text-sm text-coffee-600">
          Upgrade to enable {featureName.toLowerCase()} for your cafe.
        </p>
        <Link
          href="/dashboard/billing"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-4 py-2 text-sm font-semibold hover:bg-coffee-800"
        >
          Upgrade plan <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
