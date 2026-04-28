import { Loader2 } from 'lucide-react';

/**
 * Menu manager skeleton. The real page loads categories with nested items,
 * variants and addons; this placeholder hides the fetch latency on tab swap.
 */
export default function MenuLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded bg-coffee-100 animate-pulse" />
          <div className="mt-2 h-4 w-56 rounded bg-coffee-100/70 animate-pulse" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-coffee-500" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-coffee-100/70 animate-pulse" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-warm flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-coffee-100 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-coffee-100 animate-pulse" />
              <div className="h-3 w-56 rounded bg-coffee-100/70 animate-pulse" />
              <div className="h-3 w-20 rounded bg-coffee-100/70 animate-pulse" />
            </div>
            <div className="h-7 w-16 rounded-lg bg-coffee-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
