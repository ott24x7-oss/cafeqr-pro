'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, KeyRound, Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export default function CustomerLoginPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || `/cafe/${params.slug}/account`;
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/customer-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, cafeSlug: params.slug }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Could not send code');
      setStep('otp');
      setWaLink(data.waSendLink ?? null);
      setDevOtp(data.otp ?? null);
      if (data.delivered) toast.success('Code sent on WhatsApp');
      else toast.success('Use the WhatsApp link below to send your code');
    } catch (err: any) {
      toast.error('Could not send code', err?.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/customer-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Wrong code');
      toast.success('Signed in');
      router.push(next);
      router.refresh();
    } catch (err: any) {
      toast.error('Sign-in failed', err?.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <div className="bg-coffee-gradient text-cream-50 px-4 py-5">
        <Link href={`/cafe/${params.slug}`} className="text-cream-200/90 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to cafe
        </Link>
        <h1 className="font-display text-2xl font-bold mt-2">Customer login</h1>
        <p className="text-cream-200/80 text-sm mt-0.5">
          Track orders, see your history, check loyalty points.
        </p>
      </div>

      <div className="container max-w-md py-6">
        {step === 'phone' && (
          <form onSubmit={sendOtp} className="card-warm space-y-4">
            <div>
              <label className="label">WhatsApp number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                required
                autoFocus
              />
              <p className="helper">We'll send a 4-digit code to verify.</p>
            </div>
            <Button type="submit" disabled={loading || phone.length < 10} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Send code
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} className="card-warm space-y-4">
            <div>
              <label className="label">Enter the 4-digit code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                maxLength={4}
                required
                autoFocus
                className="text-center text-2xl font-mono tracking-[0.5em]"
              />
              <p className="helper">Sent to {phone}.</p>
              {devOtp && (
                <p className="helper text-amber-700 mt-1">
                  Dev mode: your code is <b>{devOtp}</b>
                </p>
              )}
            </div>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-wagreen text-white px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 w-full"
              >
                <MessageSquare className="h-4 w-4" /> Open WhatsApp to send code
              </a>
            )}
            <Button type="submit" disabled={loading || code.length !== 4} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Verify & continue
            </Button>
            <button
              type="button"
              className="text-xs text-coffee-600 hover:text-coffee-900 underline w-full"
              onClick={() => { setStep('phone'); setCode(''); }}
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
