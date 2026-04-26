'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import {
  CheckCircle2, Copy, Loader2, ShieldCheck, FileText, Clock, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const POLL_MS = 5_000;          // 5s scans while customer is verifying
const TIMEOUT_MS = 3 * 60_000;  // 3 minutes of polling, then offer manual fallback

type Stage = 'idle' | 'verifying' | 'timeout';

export function PayClient({ order: initialOrder }: { order: any }) {
  const [order, setOrder] = useState(initialOrder);
  const cafe = order.cafe;
  const upiId = cafe.settings?.upiId ?? '';
  const upiQrUrl = cafe.settings?.upiQrUrl;
  const canAutoVerify = !!cafe.settings?.gmailUser;

  const [stage, setStage] = useState<Stage>('idle');
  const [scans, setScans] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(TIMEOUT_MS / 1000));
  const [transport, setTransport] = useState<string | null>(null);
  const [lastErr, setLastErr] = useState<string | null>(null);
  const [txn, setTxn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pollRef = useRef<any>(null);
  const tickRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);

  const isPaid = order.paymentStatus === 'PAID';

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(cafe.name)}&am=${order.totalAmount}&cu=INR&tn=${encodeURIComponent('Order ' + order.orderNumber)}`
    : '';

  function clearTimers() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  async function checkOnce() {
    try {
      const r = await fetch(`/api/orders/${order.id}/auto-verify`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (!r.ok) return false;
      const data = await r.json();
      setScans((n) => n + 1);
      setTransport(data.scanSummary?.transport ?? null);
      setLastErr(data.scanSummary?.errors?.[0] ?? null);

      if (data.paid) {
        setOrder((o: any) => ({
          ...o,
          paymentStatus: 'PAID',
          payment: { ...(o.payment ?? {}), paidAt: data.paidAt, transactionId: data.transactionId },
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function startVerifying() {
    if (!canAutoVerify) {
      toast.error('Auto-verify not configured', 'Drop the UPI Txn ID below instead.');
      return;
    }
    setStage('verifying');
    setScans(0);
    setSecondsLeft(Math.round(TIMEOUT_MS / 1000));
    startedAtRef.current = Date.now();
    clearTimers();

    // Fire one scan immediately, then on interval.
    checkOnce();
    pollRef.current = setInterval(async () => {
      const found = await checkOnce();
      if (found) clearTimers();
    }, POLL_MS);
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const left = Math.max(0, TIMEOUT_MS - elapsed);
      setSecondsLeft(Math.round(left / 1000));
      if (left <= 0) {
        clearTimers();
        setStage('timeout');
      }
    }, 1000);
  }

  function cancelVerifying() {
    clearTimers();
    setStage('idle');
  }

  // Stop polling once paid.
  useEffect(() => {
    if (isPaid) clearTimers();
  }, [isPaid]);

  // Cleanup on unmount.
  useEffect(() => () => clearTimers(), []);

  async function submitTxn() {
    if (!txn) return toast.error('Enter UPI transaction ID');
    setSubmitting(true);
    try {
      const r = await fetch(`/api/orders/${order.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txn, amount: order.totalAmount, method: 'upi' }),
      });
      if (!r.ok) throw new Error('failed');
      toast.success('Payment recorded', 'Owner will verify shortly.');
    } catch {
      toast.error('Could not record payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      <div className="bg-coffee-gradient text-cream-50">
        <div className="container py-8 text-center">
          <div className="text-cream-200/80 text-sm">Order #{order.orderNumber}</div>
          <h1 className="font-display text-3xl font-bold mt-1">{cafe.name}</h1>
          <div className="text-2xl font-bold mt-3">{formatCurrency(order.totalAmount)}</div>
        </div>
      </div>

      <div className="container max-w-md -mt-4 relative space-y-4">
        {isPaid ? (
          <div className="card-warm text-center py-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="font-display text-2xl font-bold text-coffee-900 mt-3">Paid ✓</h2>
            <p className="text-coffee-600 mt-1">Thank you! Your payment has been confirmed.</p>
            <p className="text-coffee-500 text-xs mt-3 inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> Invoice sent to your WhatsApp
            </p>
            {order.payment?.transactionId && (
              <p className="text-coffee-500 text-[11px] mt-1">UTR: {order.payment.transactionId}</p>
            )}
            <Link href={`/order/${order.id}`} className="mt-4 inline-block">
              <Button>Back to order</Button>
            </Link>
          </div>
        ) : (
          <>
            {!upiId && (
              <div className="card-warm text-center text-coffee-600">
                Cafe has not configured UPI yet. Please pay at counter.
              </div>
            )}

            {upiId && (
              <div className="card-warm">
                <div className="font-semibold text-coffee-900 mb-3">Scan & Pay</div>
                <div className="flex justify-center">
                  {upiQrUrl ? (
                    <Image src={upiQrUrl} alt="UPI QR" width={220} height={220} className="rounded-xl" />
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-coffee-200">
                      <QRCodeCanvas value={upiLink} size={200} fgColor="#3E2D24" />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-xs text-coffee-500 mb-1">Or pay to UPI ID</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-cream-100 px-3 py-2 text-sm">{upiId}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(upiId);
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
              </div>
            )}

            {/* Stage 1 — idle: prompt the customer to confirm payment */}
            {stage === 'idle' && (
              <div className="card-warm">
                <div className="font-semibold text-coffee-900 mb-1">Already paid?</div>
                <p className="text-sm text-coffee-600 mb-3">
                  {canAutoVerify
                    ? "Tap below — we'll scan the cafe's bank inbox in real time and confirm within seconds."
                    : "Drop the UPI Txn ID and the cafe will verify manually."}
                </p>
                {canAutoVerify ? (
                  <Button onClick={startVerifying} variant="accent" className="w-full" size="lg">
                    <ShieldCheck className="h-4 w-4" /> I have paid · verify now
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="UPI Txn ID" />
                    <Button onClick={submitTxn} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Submit
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Stage 2 — verifying: live scan with countdown */}
            {stage === 'verifying' && (
              <div className="card-warm border-emerald-200 bg-emerald-50/40">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-coffee-900">Verifying payment…</div>
                    <p className="text-xs text-coffee-700">
                      Scanning the cafe's bank inbox every {Math.round(POLL_MS / 1000)}s. Looking for your UPI credit alert
                      from the last 10 minutes.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 items-center text-[11px] text-coffee-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {secondsLeft}s left
                      </span>
                      <span>Scans: {scans}</span>
                      {transport && (
                        <span className={`pill text-[10px] ${transport === 'relay' ? 'bg-amber-100 text-amber-800' : 'bg-coffee-100 text-coffee-700'}`}>
                          via {transport === 'relay' ? 'PHP relay' : 'direct IMAP'}
                        </span>
                      )}
                    </div>
                    {lastErr && (
                      <p className="text-[11px] text-rose-700 mt-1 truncate">{lastErr}</p>
                    )}
                  </div>
                  <button
                    onClick={cancelVerifying}
                    className="text-coffee-500 hover:text-coffee-900 shrink-0"
                    title="Stop verifying"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Stage 3 — timeout: didn't catch the email, fallback to manual UTR */}
            {stage === 'timeout' && (
              <div className="card-warm">
                <div className="font-semibold text-coffee-900 mb-1">Couldn't auto-verify yet</div>
                <p className="text-sm text-coffee-600 mb-3">
                  Bank emails sometimes take a couple of minutes. You can keep scanning, or drop your UPI Txn ID
                  and the cafe will verify manually within a minute.
                </p>
                <div className="flex gap-2 mb-3">
                  <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="UPI Txn ID (optional)" />
                  <Button onClick={submitTxn} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Submit
                  </Button>
                </div>
                <Button onClick={startVerifying} variant="outline" className="w-full">
                  <ShieldCheck className="h-4 w-4" /> Scan again for 3 min
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
