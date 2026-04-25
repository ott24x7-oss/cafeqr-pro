import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-coffee-gradient grid place-items-center text-cream-50 shadow-coffee">
          <Coffee className="h-8 w-8" />
        </div>
        <h1 className="font-display text-5xl font-bold text-coffee-900 mt-5">404</h1>
        <p className="text-coffee-600 mt-2">This page doesn't seem to be on the menu.</p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
