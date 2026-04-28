'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coffee, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    setLoading(false);
    if (r.ok) {
      setSent(true);
      // Dev: API returns the link directly when SMTP isn't configured
      if (data.resetUrl) setResetUrl(data.resetUrl);
      toast.success('Check your email');
    } else {
      toast.error('Could not send', data.error);
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
          <h1 className="font-display text-2xl font-bold text-coffee-900">Reset password</h1>
          <p className="text-sm text-coffee-600 mt-1">
            Enter your email and we'll send a reset link.
          </p>

          {sent ? (
            <div className="mt-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 flex gap-2">
                <Mail className="h-4 w-4 mt-0.5" /> If <b>{email}</b> exists in our system, you'll receive a reset link in a moment.
              </div>
              {resetUrl && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  <div className="font-bold mb-1">Dev mode — direct reset link:</div>
                  <a className="break-all underline" href={resetUrl}>{resetUrl}</a>
                </div>
              )}
              <Link href="/login" className="block text-center mt-4 text-coffee-700 hover:text-coffee-900 text-sm">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <div>
                <label className="label">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cafe.com" />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
              </Button>
              <Link href="/login" className="block text-center text-sm text-coffee-600 hover:text-coffee-900">
                Remembered? Sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
