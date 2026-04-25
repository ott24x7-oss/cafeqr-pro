'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Coffee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planSlug = params.get('plan') ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cafeName, setCafeName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, cafeName, password, planSlug }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Signup failed');
      await signIn('credentials', { email, password, redirect: false });
      toast.success('Welcome to CafeQR Pro!', 'Setting up your dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error('Signup failed', err?.message);
    } finally {
      setLoading(false);
    }
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
            <h2 className="font-display text-4xl font-bold leading-tight">Open your QR menu in 5 minutes ⚡</h2>
            <ul className="mt-5 space-y-2 text-cream-200/90">
              <li>✓ 14-day free trial, no card required</li>
              <li>✓ Beautiful menu, instantly</li>
              <li>✓ WhatsApp notifications built-in</li>
              <li>✓ Live orders, payments, reviews</li>
            </ul>
          </div>
          <div className="text-sm text-cream-200/70">Already have an account? <Link href="/login" className="underline">Sign in</Link></div>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6 bg-cream-50">
        <div className="w-full max-w-md">
          <Link href="/" className="md:hidden flex items-center gap-2 font-display text-xl font-bold text-coffee-900 mb-6">
            <Coffee className="h-5 w-5" /> CafeQR Pro
          </Link>
          <h1 className="font-display text-3xl font-bold text-coffee-900">Create your cafe account</h1>
          <p className="mt-1 text-sm text-coffee-600">Start free, no card required.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
            <div>
              <label className="label">Cafe / Restaurant name</label>
              <Input required value={cafeName} onChange={(e) => setCafeName(e.target.value)} placeholder="Cafe Mocha" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Your name</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya" />
              </div>
              <div>
                <label className="label">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cafe.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Start free trial
            </Button>
            {planSlug && <p className="helper">You'll be set up with the <b>{planSlug}</b> plan.</p>}
            <p className="helper text-center">
              By signing up you agree to our terms. Cancel anytime.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
