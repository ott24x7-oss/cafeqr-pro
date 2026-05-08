'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, Loader2, ArrowLeft, MessageSquare, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

/**
 * One-tap WhatsApp magic-link customer login.
 *
 * Step 1: customer types phone → POST /api/auth/customer-magic-link sends
 * a 10-min one-shot URL via WhatsApp.
 * Step 2: customer taps the link in WhatsApp → /m/[token] sets the cookie
 * server-side and redirects to /account.
 *
 * While they're in WhatsApp we poll /api/customer/me; the moment the
 * cookie is alive (i.e. they tapped the link in another tab) we forward
 * them to `next` automatically.
 */
export default function CustomerLoginPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || `/cafe/${params.slug}/account`;
  const errorParam = search.get('error');

  const [step, setStep] = useState<'phone' | 'sent'>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [waSendLink, setWaSendLink] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);

  // Poll for the cookie once we've sent a link. Tapping the WhatsApp URL
  // sets the cookie on the same browser; this loop catches it within ~3s
  // and forwards the user without a manual page refresh.
  useEffect(() => {
    if (step !== 'sent') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/customer/me?cafeSlug=${params.slug}`, { cache: 'no-store' });
        if (cancelled) return;
        if (r.ok) {
          toast.success('Signed in');
          router.push(next);
          router.refresh();
        }
      } catch {/* keep polling */}
    };
    const id = setInterval(tick, 2500);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [step, params.slug, router, next]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch('/api/auth/customer-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, cafeSlug: params.slug }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Could not send login link');
      setStep('sent');
      setDelivered(Boolean(data.delivered));
      setWaSendLink(data.waSendLink ?? null);
      setDevUrl(data.devUrl ?? null);
      if (data.delivered) toast.success('Login link sent on WhatsApp');
      else toast.success('Use the WhatsApp link below to receive your login URL');
    } catch (err: any) {
      toast.error('Could not send link', err?.message);
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
          Sign in with one tap — we'll WhatsApp you a login link.
        </p>
      </div>

      <div className="container max-w-md py-6">
        {errorParam && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {errorParam === 'link_invalid'
                ? 'That login link is no longer valid. Request a new one below.'
                : 'Something went wrong with that link. Please try again.'}
            </span>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={sendLink} className="card-warm space-y-4">
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
              <p className="helper">We'll WhatsApp you a one-tap login link. No code to type.</p>
            </div>
            <Button type="submit" disabled={loading || phone.length < 10} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Send login link
            </Button>
          </form>
        )}

        {step === 'sent' && (
          <div className="card-warm space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-semibold text-coffee-900">Check WhatsApp on {phone}</div>
              <p className="helper mt-1">
                {delivered
                  ? 'We just sent a login link. Tap it and you\'re in — this page will refresh automatically.'
                  : 'WhatsApp delivery is not configured for this cafe. Use the share button below to forward the link to yourself.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-coffee-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for tap…
            </div>

            {waSendLink && (
              <a
                href={waSendLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-wagreen text-white px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 w-full"
              >
                <MessageSquare className="h-4 w-4" /> Open WhatsApp to send link
              </a>
            )}

            {devUrl && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-left">
                <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Dev mode</div>
                <a href={devUrl} className="text-xs text-amber-900 break-all underline">{devUrl}</a>
              </div>
            )}

            <button
              type="button"
              className="text-xs text-coffee-600 hover:text-coffee-900 underline w-full inline-flex items-center justify-center gap-1"
              onClick={() => setStep('phone')}
            >
              <Phone className="h-3 w-3" /> Use a different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
