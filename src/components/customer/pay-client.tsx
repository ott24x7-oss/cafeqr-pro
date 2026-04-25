'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function PayClient({ order }: { order: any }) {
  const cafe = order.cafe;
  const upiId = cafe.settings?.upiId ?? '';
  const upiQrUrl = cafe.settings?.upiQrUrl;
  const [txn, setTxn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(cafe.name)}&am=${order.totalAmount}&cu=INR&tn=${encodeURIComponent('Order ' + order.orderNumber)}`
    : '';

  const isPaid = order.paymentStatus === 'PAID';

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

            <div className="card-warm">
              <div className="font-semibold text-coffee-900 mb-3">After paying</div>
              <p className="text-sm text-coffee-600 mb-3">Enter the UPI transaction ID so we can verify quickly.</p>
              <div className="flex gap-2">
                <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="UPI Txn ID" />
                <Button onClick={submitTxn} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
