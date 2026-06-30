'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, Loader2, ArrowLeft, MessageSquare, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

/**
 * One-tap WhatsApp magic-link customer login (dark coffee app theme).
 *
 * Step 1: customer types phone → POST /api/auth/customer-magic-link sends a
 * 5-min one-shot URL via WhatsApp ("🔓 Tap to sign in to …").
 * Step 2: customer taps the link → /m/[token] sets the cookie + redirects.
 * While they're in WhatsApp we poll /api/customer/me and forward on success.
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

  useEffect(() => {
    if (step !== 'sent') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/customer/me?cafeSlug=${params.slug}`, { cache: 'no-store' });
        if (cancelled) return;
        if (r.ok) { toast.success('Signed in'); router.push(next); router.refresh(); }
      } catch {}
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    <div className="cafe-app flex flex-col px-5 py-8">
      <Link href={`/cafe/${params.slug}`} className="text-cream-200/70 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to cafe
      </Link>

      <div className="mt-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-full grid place-items-center ring-amber bg-black/30">
          <Sparkles className="h-8 w-8 app-amber" />
        </div>
        <h1 className="font-display text-3xl font-bold text-cream-50 mt-4">Sign in with Magic Link</h1>
        <p className="text-cream-200/60 text-sm mt-1.5 max-w-xs mx-auto">
          No password. We&rsquo;ll WhatsApp you a one-tap login link — it works once and expires in 5 minutes.
        </p>
      </div>

      <div className="max-w-md w-full mx-auto mt-8">
        {errorParam && (
          <div className="mb-4 glass-card p-3 text-sm text-rose-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {errorParam === 'link_expired' ? 'That login link expired. Request a fresh one below — it\'s good for 5 minutes.'
                : errorParam === 'link_used' ? 'That login link was already used. Request a new one below.'
                : errorParam === 'link_invalid' ? 'That login link isn\'t valid. Request a new one below.'
                : 'Something went wrong with that link. Please try again.'}
            </span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={sendLink} className="glass-card p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-cream-100 mb-2 block">WhatsApp number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                required
                autoFocus
                className="glass-chip w-full rounded-xl px-4 py-3 bg-transparent outline-none text-cream-50 placeholder:text-cream-200/40"
              />
              <p className="text-xs text-cream-200/45 mt-1.5">We&rsquo;ll WhatsApp you a one-tap login link. No code to type.</p>
            </div>
            <button type="submit" disabled={loading || phone.length < 10} className="btn-amber w-full rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
              Send login link
            </button>
          </form>
        ) : (
          <div className="glass-card p-5 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/15 grid place-items-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-cream-50">Check WhatsApp on {phone}</div>
              <p className="text-xs text-cream-200/55 mt-1">
                {delivered
                  ? 'We just sent a login link. Tap it and you\'re in — this page refreshes automatically.'
                  : 'WhatsApp delivery isn\'t configured for this cafe. Use the button below to forward the link to yourself.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-cream-200/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for tap…
            </div>
            {waSendLink && (
              <a href={waSendLink} target="_blank" rel="noreferrer" className="rounded-xl bg-wagreen text-white px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 w-full">
                <MessageSquare className="h-4 w-4" /> Open WhatsApp to send link
              </a>
            )}
            {devUrl && (
              <div className="glass-chip rounded-lg p-2 text-left">
                <div className="text-[11px] font-semibold app-amber uppercase tracking-wider">Dev mode</div>
                <a href={devUrl} className="text-xs text-cream-100 break-all underline">{devUrl}</a>
              </div>
            )}
            <button type="button" className="text-xs text-cream-200/60 hover:text-cream-50 underline w-full inline-flex items-center justify-center gap-1" onClick={() => setStep('phone')}>
              <Phone className="h-3 w-3" /> Use a different number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
