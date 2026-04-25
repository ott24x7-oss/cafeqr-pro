'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Coffee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (r?.error) {
      toast.error('Login failed', 'Check your email and password.');
      return;
    }
    toast.success('Welcome back!');
    router.push(r?.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex bg-coffee-gradient p-10 text-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="relative flex flex-col justify-between w-full">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Coffee className="h-5 w-5" /></span>
            CafeQR Pro
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">Welcome back, brew master ☕</h2>
            <p className="mt-3 text-cream-200/90 max-w-sm">
              Sign in to manage menu, take live orders and watch your cafe revenue grow.
            </p>
          </div>
          <div className="text-sm text-cream-200/70">© CafeQR Pro</div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 bg-cream-50">
        <div className="w-full max-w-md">
          <Link href="/" className="md:hidden flex items-center gap-2 font-display text-xl font-bold text-coffee-900 mb-6">
            <Coffee className="h-5 w-5" /> CafeQR Pro
          </Link>
          <h1 className="font-display text-3xl font-bold text-coffee-900">Sign in</h1>
          <p className="mt-1 text-sm text-coffee-600">Owner, staff or super admin — all sign in here.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cafe.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-coffee-600 hover:text-coffee-900">Forgot?</Link>
              </div>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-coffee-600">
            New here?{' '}
            <Link href="/signup" className="text-coffee-900 font-semibold hover:underline">Start your free trial</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
