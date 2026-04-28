import { Loader2 } from 'lucide-react';

/**
 * Default loading skeleton for any /dashboard/* route that hasn't shipped a
 * more specific one. Renders the moment the user taps a nav link, so the
 * tab swap feels instant instead of frozen while the server fetches data.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div>
        <div className="h-7 w-40 rounded bg-coffee-100 animate-pulse" />
        <div className="mt-2 h-4 w-64 rounded bg-coffee-100/70 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-warm">
            <div className="h-4 w-4 rounded bg-coffee-100 animate-pulse" />
            <div className="mt-2 h-3 w-20 rounded bg-coffee-100/70 animate-pulse" />
            <div className="mt-1 h-7 w-24 rounded bg-coffee-100 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="card-warm">
        <div className="flex items-center justify-center py-10 text-coffee-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    </div>
  );
}
