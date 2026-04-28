import Link from 'next/link';
import { Check, Circle, ArrowRight, Sparkles } from 'lucide-react';

interface ChecklistItem {
  done: boolean;
  enLabel: string;
  hiLabel: string;
  href: string;
}

/**
 * First-time setup checklist for cafe owners. Renders as a single card
 * on the dashboard overview when ANY step is incomplete; once everything
 * is ✓ the parent should hide it. Each row is bilingual EN / HI in
 * casual Devanagari.
 */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  if (doneCount === total) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="card-warm border-coffee-200 bg-gradient-to-br from-cream-100 to-cream-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg font-bold text-coffee-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-caramel-dark" />
            Set up your cafe
          </div>
          <div className="text-xs text-coffee-600">
            अपना कैफ़े सेट करें — {doneCount} of {total} done
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-bold text-coffee-900 leading-none">{pct}%</div>
          <div className="text-[10px] text-coffee-500">complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-cream-50 overflow-hidden mb-3">
        <div
          className="h-full bg-coffee-gradient transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="divide-y divide-coffee-100/60 -mx-1">
        {items.map((it) => (
          <li key={it.enLabel}>
            <Link
              href={it.href}
              className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-white/50 transition"
            >
              {it.done ? (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-cream-50 border border-coffee-200 text-coffee-400 shrink-0">
                  <Circle className="h-3 w-3" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${it.done ? 'text-coffee-500 line-through' : 'text-coffee-900'}`}>
                  {it.enLabel}
                </div>
                <div className={`text-xs ${it.done ? 'text-coffee-400' : 'text-coffee-600'}`}>
                  {it.hiLabel}
                </div>
              </div>
              {!it.done && <ArrowRight className="h-4 w-4 text-coffee-400 shrink-0" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
