import { Loader2 } from 'lucide-react';

/**
 * Live Orders skeleton. The real page does several Prisma joins to assemble
 * order cards with items + payment status; rendering this placeholder
 * during the fetch makes the tab swap feel instant on slow networks.
 */
export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 rounded bg-coffee-100 animate-pulse" />
          <div className="mt-2 h-4 w-48 rounded bg-coffee-100/70 animate-pulse" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-coffee-500" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-warm space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-coffee-100 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-coffee-100/70 animate-pulse" />
            </div>
            <div className="h-3 w-32 rounded bg-coffee-100/70 animate-pulse" />
            <div className="h-3 w-24 rounded bg-coffee-100/70 animate-pulse" />
            <div className="h-3 w-28 rounded bg-coffee-100/70 animate-pulse" />
            <div className="pt-2 border-t border-coffee-50 flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-coffee-100 animate-pulse" />
              <div className="h-7 w-20 rounded-lg bg-coffee-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
