'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Minus, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { calcCart, type CartItem } from '@/lib/order-utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function CustomerCart({
  cafe,
  table,
  cart,
  onAdjust,
  onClose,
  onClear,
}: {
  cafe: any;
  table: any;
  cart: CartItem[];
  onAdjust: (idx: number, delta: number) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [waLink, setWaLink] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [type, setType] = useState<'DINE_IN' | 'TAKEAWAY'>(table ? 'DINE_IN' : 'TAKEAWAY');
  const [submitting, setSubmitting] = useState(false);

  const totals = calcCart(cart, cafe.settings, type);

  async function requestOtp() {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('Enter valid phone number');
      return;
    }
    const r = await fetch('/api/auth/customer-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, cafeSlug: cafe.slug }),
    });
    const data = await r.json();
    if (!r.ok) {
      toast.error('Could not send OTP');
      return;
    }
    setOtpSent(true);
    setWaLink(data.waSendLink);
    if (data.otp) toast.info(`Demo OTP: ${data.otp}`, 'Auto-fill enabled');
    if (data.otp) setOtp(data.otp);
  }

  function verifyOtp() {
    if (!otp || otp.length < 4) {
      toast.error('Enter 4-digit code');
      return;
    }
    setPhoneVerified(true);
    toast.success('WhatsApp verified ✓');
  }

  async function placeOrder() {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const payload = {
        cafeSlug: cafe.slug,
        tableCode: table?.code,
        type,
        customerName: name || undefined,
        customerPhone: phoneVerified ? phone : undefined,
        customerNote: note || undefined,
        items: cart,
      };
      const r = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Could not place order');
      onClear();
      router.push(`/order/${data.order.id}?placed=1`);
    } catch (e: any) {
      toast.error('Order failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-lg bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream-50 z-10 px-5 py-4 border-b border-coffee-100 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-coffee-900">Your cart</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {cart.map((it, idx) => (
            <div key={idx} className="card-warm !p-3 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-coffee-900 leading-tight">{it.name}</div>
                <div className="text-xs text-coffee-500">
                  {it.variantName ? `${it.variantName} · ` : ''}
                  {(it.addons?.length ?? 0) > 0 && it.addons!.map((a) => a.name).join(', ')}
                </div>
                {it.note && <div className="text-xs text-coffee-600 italic mt-1">📝 {it.note}</div>}
                <div className="text-sm font-bold text-coffee-800 mt-1">
                  {formatCurrency(((it.variantPrice ?? it.unitPrice) + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0)) * it.quantity)}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white rounded-full border border-coffee-200">
                <button onClick={() => onAdjust(idx, -1)} className="h-8 w-8 grid place-items-center text-coffee-700">
                  {it.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <span className="w-6 text-center font-bold text-coffee-900 text-sm">{it.quantity}</span>
                <button onClick={() => onAdjust(idx, +1)} className="h-8 w-8 grid place-items-center text-coffee-700">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cafe.settings?.acceptDineIn && cafe.settings?.acceptTakeaway && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'DINE_IN', l: 'Dine in' },
                { v: 'TAKEAWAY', l: 'Takeaway' },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v as any)}
                  className={`rounded-xl border p-3 text-sm font-semibold ${type === t.v ? 'border-coffee-700 bg-cream-100 text-coffee-900' : 'border-coffee-200 bg-white text-coffee-600'}`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          )}

          <div className="card-warm !p-4">
            <div className="text-xs font-semibold text-coffee-700 mb-2">YOUR DETAILS</div>
            <div className="grid gap-2.5">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" />

              {!phoneVerified ? (
                <div>
                  <div className="flex gap-2">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number" inputMode="tel" />
                    <Button variant="wa" onClick={requestOtp} disabled={otpSent}>
                      <MessageSquare className="h-4 w-4" /> {otpSent ? 'Sent' : 'Verify'}
                    </Button>
                  </div>
                  {otpSent && (
                    <div className="mt-2 flex gap-2">
                      <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="4-digit code" inputMode="numeric" />
                      <Button onClick={verifyOtp}>Confirm</Button>
                    </div>
                  )}
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="text-xs text-wagreen-dark mt-2 inline-block">
                      Open WhatsApp to send code →
                    </a>
                  )}
                  <div className="helper">We'll send order updates here.</div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  ✓ Verified · {phone}
                </div>
              )}

              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special request? (optional)" />
            </div>
          </div>

          <div className="card-warm !p-4 space-y-1.5 text-sm">
            <Row l="Subtotal" v={formatCurrency(totals.subtotal)} />
            {totals.taxAmount > 0 && <Row l={`Tax (${cafe.settings?.taxPercent ?? 0}%)`} v={formatCurrency(totals.taxAmount)} />}
            {totals.serviceAmount > 0 && <Row l="Service charge" v={formatCurrency(totals.serviceAmount)} />}
            {totals.packingAmount > 0 && <Row l="Packing" v={formatCurrency(totals.packingAmount)} />}
            <div className="border-t border-coffee-100 pt-2 mt-1">
              <Row l={<span className="font-bold text-coffee-900">Total</span>} v={<span className="font-bold text-lg text-coffee-900">{formatCurrency(totals.totalAmount)}</span>} />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={submitting || cart.length === 0}
            onClick={placeOrder}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Place order · {formatCurrency(totals.totalAmount)}
          </Button>
          <p className="helper text-center">By placing the order, you confirm the items above.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: any; v: any }) {
  return (
    <div className="flex justify-between text-coffee-700">
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );
}
