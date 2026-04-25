import { Coffee } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-coffee-gradient grid place-items-center text-cream-50 animate-float">
          <Coffee className="h-6 w-6" />
        </div>
        <div className="mt-3 text-sm text-coffee-600 animate-pulse-dot">Brewing…</div>
      </div>
    </div>
  );
}
