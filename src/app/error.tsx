'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-coffee-900 mt-5">Something brewed wrong</h1>
        <p className="text-coffee-600 mt-2 text-sm">{error.message || 'An unexpected error occurred.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/"><Button variant="outline">Home</Button></Link>
        </div>
      </div>
    </div>
  );
}
