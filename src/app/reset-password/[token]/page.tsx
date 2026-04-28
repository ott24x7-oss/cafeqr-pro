'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coffee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords don\'t match');
    if (password.length < 6) return toast.error('Min 6 characters');
    setLoading(true);
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, password }),
    });
    setLoading(false);
    if (r.ok) {
      toast.success('Password updated — please sign in');
      router.push('/login');
    } else {
      const d = await r.json();
      toast.error('Failed', d.error ?? 'Token invalid or expired');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-coffee-900 mb-6">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg bg-coffee-gradient text-cream-50 bg-cover bg-center"
            data-brand-logo
          >
            <Coffee className="h-4 w-4" data-brand-logo-icon />
          </span>
          <span data-brand-name>CafeQR Pro</span>
        </Link>
        <div className="card-warm">
          <h1 className="font-display text-2xl font-bold text-coffee-900">Set new password</h1>
          <p className="text-sm text-coffee-600 mt-1">Create a new password to access your account.</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="label">New password</label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm</label>
              <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
