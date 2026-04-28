'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';
import {
  CheckCircle2, Copy, Loader2, ShieldCheck, Clock, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const POLL_MS = 5_000;
const TIMEOUT_MS = 5 * 60_000;

interface SubInfo {
  id: string;
  amount: number;
  payableAmount: number;
  billing: string;
  status: string;
  transactionId: string | null;
  plan: { name: string; slug: string };
}
interface PlatformInfo {
  siteName: string;
  upiId: string;
  upiQrUrl: string | null;
  canAutoVerify: boolean;
}

type Stage = 'idle' | 'verifying' | 'timeout';

export function SubscriptionPayClient({
  subscription, platform, cafeName,
}: {
  subscription: SubInfo;
  platform: PlatformInfo;
  cafeName: string;
}) {
  const [sub, setSub] = useState(subscription);
  const [stage, setStage] = useState<Stage>('idle');
  const [scans, setScans] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(TIMEOUT_MS / 1000));

  const pollRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);

  const isPaid = sub.status === 'active';
  const charge = sub.payableAmount;

  const upiLink = platform.upiId
    ? `upi://pay?pa=${encodeURIComponent(platform.upiId)}&pn=${encodeURIComponent(platform.siteName)}&am=${charge}&cu=INR&tn=${encodeURIComponent(`${cafeName} · ${sub.plan.name}`)}`
    : '';

  function clearTimers() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  async function checkOnce() {
    try {
      const r = await fetch(`/api/dashboard/billing/auto-verify/${sub.id}`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!r.ok) return false;
      const data = await r.json();
      setScans((n) => n + 1);
      if (data.paid) {
        setSub((s) => ({ ...s, status: 'active', transactionId: data.transactionId ?? s.transactionId }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function startVerifying() {
    if (!platform.canAutoVerify) {
      toast.error('Platform Gmail not configured', 'Super admin needs to set it up first.');
      return;
    }
    setStage('verifying');
    setScans(0);
    setSecondsLeft(Math.round(TIMEOUT_MS / 1000));
    startedAtRef.current = Date.now();
    clearTimers();

    checkOnce();
    pollRef.current = setInterval(async () => {
      const found = await checkOnce();
      if (found) clearTimers();
    }, POLL_MS);
    tickRef.current = setInterval(() => {
      const left = Math.max(0, TIMEOUT_MS - (Date.now() - startedAtRef.current));
      setSecondsLeft(Math.round(left / 1000));
      if (left <= 0) { clearTimers(); setStage('timeout'); }
    }, 1000);
  }

  function cancelVerifying() {
    clearTimers();
    setStage('idle');
  }

  useEffect(() => () => clearTimers(), []);
  useEffect(() => { if (isPaid) clearTimers(); }, [isPaid]);

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">
            Pay subscription
          </h1>
          <p className="text-coffee-600 text-sm">
            {sub.plan.name} plan · {sub.billing} · {cafeName}
          </p>
        </div>
        <Link href="/dashboard/billing" className="text-sm text-coffee-600 hover:text-coffee-900">
          ← Back
        </Link>
      </div>

      {isPaid ? (
        <div className="card-warm text-center py-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="font-display text-2xl font-bold text-coffee-900 mt-3">Plan active ✓</h2>
          <p className="text-coffee-600 mt-1">
            Your <b>{sub.plan.name}</b> plan is now active. Thank you!
          </p>
          {sub.transactionId && (
            <p className="text-coffee-500 text-[11px] mt-2">UTR: {sub.transactionId}</p>
          )}
          <Link href="/dashboard/billing" className="mt-4 inline-block">
            <Button>Back to billing</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: amount + UPI QR */}
          <div className="card-warm">
            <div className="text-coffee-500 text-xs">Amount due</div>
            <div className="font-display text-3xl font-bold text-coffee-900 mt-1">
              {formatCurrency(charge)}
            </div>
            {sub.amount !== charge && (
              <div className="text-[11px] text-coffee-500 mt-0.5">
                ({formatCurrency(sub.amount)} + auto-verify tag)
              </div>
            )}

            {!platform.upiId ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Online payment isn't enabled yet. Please contact the platform team
                so they can finish setting it up.
              </div>
            ) : (
              <>
                <div className="mt-4 flex justify-center">
                  {platform.upiQrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={platform.upiQrUrl} alt="UPI QR" className="rounded-xl w-[220px] h-[220px] object-contain" />
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-coffee-200">
                      <QRCodeCanvas value={upiLink} size={200} fgColor="#3E2D24" />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-xs text-coffee-500 mb-1">Or pay to UPI ID</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-cream-100 px-3 py-2 text-sm">{platform.upiId}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(platform.upiId);
                        toast.success('UPI ID copied');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <a href={upiLink} className="mt-3 block">
                  <Button variant="accent" className="w-full" size="lg">Open UPI app</Button>
                </a>
                <p className="text-[11px] text-coffee-500 mt-3">
                  Pay <b>exactly {formatCurrency(charge)}</b> — the paise are unique to your subscription so we can
                  auto-detect your payment.
                </p>
              </>
            )}
          </div>

          {/* Right: verify */}
          <div className="card-warm">
            {stage === 'idle' && (
              <>
                <div className="font-semibold text-coffee-900">After paying</div>
                <p className="text-sm text-coffee-600 mt-1">
                  Tap below — we'll watch the platform's bank inbox in real time and activate your plan within seconds.
                </p>
                {platform.canAutoVerify ? (
                  <Button onClick={startVerifying} variant="accent" className="w-full mt-3" size="lg" disabled={!platform.upiId}>
                    <ShieldCheck className="h-4 w-4" /> I have paid · verify now
                  </Button>
                ) : (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Auto-verify isn't configured. Pay anyway and the platform admin will activate your plan
                    manually within a few minutes.
                  </div>
                )}
              </>
            )}

            {stage === 'verifying' && (
              <div className="border-emerald-200 bg-emerald-50/40 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-coffee-900">Verifying payment…</div>
                    <p className="text-xs text-coffee-700">
                      Scanning the platform's bank inbox every {Math.round(POLL_MS / 1000)}s for a UPI
                      credit alert at <b>{formatCurrency(charge)}</b>.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 items-center text-[11px] text-coffee-600">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {secondsLeft}s left</span>
                      <span>Scans: {scans}</span>
                    </div>
                  </div>
                  <button onClick={cancelVerifying} className="text-coffee-500 hover:text-coffee-900 shrink-0" title="Stop">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {stage === 'timeout' && (
              <div>
                <div className="font-semibold text-coffee-900">Couldn't verify yet</div>
                <p className="text-sm text-coffee-600 mt-1">
                  Bank emails sometimes take a couple of minutes. Either keep scanning, or reach out to the
                  platform admin if your payment was successful.
                </p>
                <Button onClick={startVerifying} variant="outline" className="w-full mt-3">
                  <ShieldCheck className="h-4 w-4" /> Scan again for {Math.round(TIMEOUT_MS / 60_000)} min
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
