/**
 * 30-day revenue sparkline. Server-rendered SVG so it shows up instantly with
 * no JS — no recharts, no client hydration. Pre-bucketed values come from
 * the dashboard server component; we just lay out the polyline.
 */
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  buckets: number[];          // 30 daily totals, oldest → newest
  totalRevenue: number;
  avgPerDay: number;
  currency: string;
}

export function RevenueSparkline({ buckets, totalRevenue, avgPerDay, currency }: Props) {
  const W = 600;
  const H = 80;
  const PAD = 4;
  const max = Math.max(1, ...buckets);
  const dx = (W - PAD * 2) / Math.max(1, buckets.length - 1);
  const points = buckets.map((v, i) => {
    const x = PAD + i * dx;
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastPt = buckets.length ? `${(PAD + (buckets.length - 1) * dx).toFixed(1)},${(H - PAD - (buckets[buckets.length - 1] / max) * (H - PAD * 2)).toFixed(1)}` : '';

  // Compare last 7 days vs the 7 before that (week-on-week).
  const last7 = buckets.slice(-7).reduce((a, b) => a + b, 0);
  const prev7 = buckets.slice(-14, -7).reduce((a, b) => a + b, 0);
  const wow = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : null;

  return (
    <div className="card-warm">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
        <div>
          <div className="text-xs text-coffee-500">Revenue · last 30 days</div>
          <div className="font-display text-2xl md:text-3xl font-bold text-coffee-900 mt-0.5">
            {formatCurrency(totalRevenue, currency)}
          </div>
          <div className="text-xs text-coffee-600">
            {formatCurrency(avgPerDay, currency)} / day average
          </div>
        </div>
        {wow !== null && (
          <div className={`pill text-xs ${wow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {wow >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {wow >= 0 ? '+' : ''}{wow.toFixed(1)}% week-on-week
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4E3D" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6B4E3D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {buckets.length > 1 && (
          <>
            <polygon
              points={`${PAD},${H - PAD} ${points} ${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)}`}
              fill="url(#rev-grad)"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#6B4E3D"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {lastPt && (
              <circle
                cx={lastPt.split(',')[0]}
                cy={lastPt.split(',')[1]}
                r="3"
                fill="#D4A574"
                stroke="#6B4E3D"
                strokeWidth="1"
              />
            )}
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-coffee-400 mt-1">
        <span>30 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}
