import { Loader2 } from 'lucide-react';

/**
 * Tables & QR skeleton. Real page generates QR data URLs server-side which
 * can be slow on phones; this placeholder unblocks the tab swap.
 */
export default function TablesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 rounded bg-coffee-100 animate-pulse" />
          <div className="mt-2 h-4 w-48 rounded bg-coffee-100/70 animate-pulse" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-coffee-500" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-warm flex flex-col items-center gap-2 py-4">
            <div className="h-6 w-12 rounded bg-coffee-100 animate-pulse" />
            <div className="h-24 w-24 rounded-xl bg-coffee-100 animate-pulse" />
            <div className="h-3 w-16 rounded bg-coffee-100/70 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
