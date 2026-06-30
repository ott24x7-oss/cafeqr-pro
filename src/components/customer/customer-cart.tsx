'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Minus, Trash2, Loader2, MessageSquare, MapPin, Bike, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { calcCart, type CartItem } from '@/lib/order-utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface CustomerSession {
  phone: string;
  name: string | null;
  points: number;
  loyaltyEnabled: boolean;
}

export function CustomerCart({
  cafe,
  table,
  cart,
  customer,
  onAdjust,
  onClose,
  onClear,
}: {
  cafe: any;
  table: any;
  cart: CartItem[];
  customer?: CustomerSession | null;
  onAdjust: (idx: number, delta: number) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  // Pre-fill name + phone from the customer session when present so the
  // logged-in flow skips the OTP step entirely. The cookie was already
  // verified during login, so we trust it here.
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [linkSent, setLinkSent] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [waSendLink, setWaSendLink] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(Boolean(customer?.phone));
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pick a sensible default order type. Walk-ins go takeaway; tables default
  // to dine-in unless dine-in is disabled. If the cafe only does delivery
  // (rare but possible), start there.
  const defaultType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = (() => {
    if (table && cafe.settings?.acceptDineIn !== false) return 'DINE_IN';
    if (cafe.settings?.acceptTakeaway !== false) return 'TAKEAWAY';
    if (cafe.settings?.acceptDelivery) return 'DELIVERY';
    return 'TAKEAWAY';
  })();
  const [type, setType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>(defaultType);
  const [submitting, setSubmitting] = useState(false);

  const totals = calcCart(cart, cafe.settings, type);

  // Build the visible order-type buttons from the cafe's settings. When only
  // one mode is enabled we still show a single label so the customer knows
  // what's happening.
  const typeOptions: { v: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; l: string; icon: any }[] = [
    cafe.settings?.acceptDineIn !== false && table ? { v: 'DINE_IN' as const, l: 'Dine in', icon: null } : null,
    cafe.settings?.acceptTakeaway !== false ? { v: 'TAKEAWAY' as const, l: 'Takeaway', icon: null } : null,
    cafe.settings?.acceptDelivery ? { v: 'DELIVERY' as const, l: 'Delivery', icon: Bike } : null,
  ].filter(Boolean) as any;

  const nameValid = name.trim().length >= 2;
  const phoneValid = phoneVerified;
  const addressValid = type !== 'DELIVERY' || address.trim().length >= 6;
  const canPlace = nameValid && phoneValid && addressValid && cart.length > 0 && !submitting;

  // One-tap magic link: ping the customer with a WhatsApp login URL, then
  // poll /api/customer/me until the cqr_customer cookie shows up. The cookie
  // is set by the /m/[token] handler when the customer taps the link, so by
  // the time `me` returns 200 we know phone ownership is proven and the
  // checkout can proceed without an OTP step.
  async function requestLink() {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('Enter valid phone number');
      return;
    }
    setLinkLoading(true);
    try {
      const r = await fetch('/api/auth/customer-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, cafeSlug: cafe.slug }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error ?? 'Could not send login link');
      setLinkSent(true);
      setWaSendLink(data.waSendLink ?? null);
      if (data.delivered) toast.success('Login link sent on WhatsApp');
      else toast.info('Use the WhatsApp share link below');
    } catch (e: any) {
      toast.error('Could not send link', e?.message);
    } finally {
      setLinkLoading(false);
    }
  }

  // Watch for the cookie once we've sent the link. When it lands AND the
  // cookie's phone matches what the customer typed (compared by last-10
  // digits to absorb country-code differences), the cart flips to verified.
  // Mismatch means the customer is logged in as a different number — we
  // refuse to take that as proof and ask them to start over with the right
  // phone, which is a visible win over the OTP flow that didn't even try
  // to enforce this.
  useEffect(() => {
    if (!linkSent || phoneVerified) return;
    const tail = (s: string) => s.replace(/\D/g, '').slice(-10);
    const wanted = tail(phone);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/customer/me?cafeSlug=${cafe.slug}`, { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!data?.phone) return;
        if (tail(data.phone) === wanted) {
          setPhone(data.phone);
          setPhoneVerified(true);
          toast.success('WhatsApp verified ✓');
        } else {
          if (pollRef.current) clearInterval(pollRef.current);
          setLinkSent(false);
          toast.error(
            'Different number signed in',
            `That tab is logged in as ${data.phone}. Tap "Use a different number" to retry.`
          );
        }
      } catch {/* keep polling */}
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [linkSent, phoneVerified, cafe.slug, phone]);

  async function placeOrder() {
    if (!cart.length) return;
    if (!nameValid) return toast.error('Please enter your name');
    if (!phoneValid) return toast.error('Please verify your WhatsApp number');
    if (!addressValid) return toast.error('Please enter a delivery address');
    setSubmitting(true);
    try {
      const payload = {
        cafeSlug: cafe.slug,
        tableCode: table?.code,
        type,
        customerName: name.trim(),
        customerPhone: phone,
        customerAddress: type === 'DELIVERY' ? address.trim() : undefined,
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
    <div className="cafe-dark fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-lg bg-forest-850 text-cream-50 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-forest-850 z-10 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-gradient-gold">Your cart</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full text-cream-50 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {cart.map((it, idx) => (
            <div key={idx} className="cafe-card p-3 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-cream-50 leading-tight">{it.name}</div>
                <div className="text-xs text-forest-300">
                  {it.variantName ? `${it.variantName} · ` : ''}
                  {(it.addons?.length ?? 0) > 0 && it.addons!.map((a) => a.name).join(', ')}
                </div>
                {it.note && <div className="text-xs text-forest-300 italic mt-1">📝 {it.note}</div>}
                <div className="text-sm font-bold text-gold-light mt-1">
                  {formatCurrency(((it.variantPrice ?? it.unitPrice) + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0)) * it.quantity)}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-forest-800 rounded-full border border-white/10">
                <button onClick={() => onAdjust(idx, -1)} className="h-8 w-8 grid place-items-center text-gold">
                  {it.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </button>
                <span className="w-6 text-center font-bold text-cream-50 text-sm">{it.quantity}</span>
                <button onClick={() => onAdjust(idx, +1)} className="h-8 w-8 grid place-items-center text-gold">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {typeOptions.length > 1 && (
            <div className={`grid gap-2 ${typeOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {typeOptions.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v)}
                  className={`rounded-xl border p-3 text-sm font-semibold flex items-center justify-center gap-1.5 ${type === t.v ? 'border-gold bg-forest-700 text-cream-50' : 'border-white/10 bg-forest-800 text-forest-300'}`}
                >
                  {t.icon && <t.icon className="h-3.5 w-3.5" />}
                  {t.l}
                </button>
              ))}
            </div>
          )}

          <div className="cafe-card p-4">
            <div className="text-xs font-semibold text-gold-light mb-2">YOUR DETAILS *</div>
            <div className="grid gap-2.5">
              <div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name *"
                  aria-invalid={!nameValid}
                  className="bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
                />
                {!nameValid && name.length > 0 && (
                  <div className="text-xs text-rose-400 mt-1">Please enter at least 2 characters</div>
                )}
              </div>

              {!phoneVerified ? (
                <div>
                  <div className="flex gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="WhatsApp number *"
                      inputMode="tel"
                      disabled={linkSent}
                      className="bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
                    />
                    <Button variant="wa" onClick={requestLink} disabled={linkSent || linkLoading}>
                      {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      {linkSent ? 'Sent' : 'Verify'}
                    </Button>
                  </div>
                  {linkSent && (
                    <div className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-start gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5" />
                      <div className="flex-1">
                        Tap the WhatsApp link we sent to {phone}. Once you do, this page will mark your number as verified — keep this tab open.
                        {waSendLink && (
                          <a
                            href={waSendLink}
                            target="_blank"
                            rel="noreferrer"
                            className="block mt-1.5 underline font-semibold"
                          >
                            Open WhatsApp to receive the link →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="helper text-forest-300">Required — we'll send order updates here. {!phoneVerified && phone && !linkSent && <span className="text-rose-400 font-semibold">Please verify before placing the order.</span>}</div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3 text-sm text-emerald-300 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {customer?.phone === phone ? (
                    <>
                      Logged in as <span className="font-semibold">{phone}</span>
                      {customer.loyaltyEnabled && customer.points > 0 && (
                        <span className="ml-auto text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                          {customer.points.toLocaleString()} pts
                        </span>
                      )}
                    </>
                  ) : (
                    <>Verified · {phone}</>
                  )}
                </div>
              )}

              {type === 'DELIVERY' && (
                <div>
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-2 text-xs text-amber-300 mb-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Delivery address is needed so the rider can find you.</span>
                  </div>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Delivery address with landmark *"
                    aria-invalid={!addressValid}
                    rows={3}
                    className="bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
                  />
                  {!addressValid && address.length > 0 && (
                    <div className="text-xs text-rose-400 mt-1">Address looks too short</div>
                  )}
                </div>
              )}

              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any special request? (optional)"
                className="bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
              />
            </div>
          </div>

          <div className="cafe-card p-4 space-y-1.5 text-sm">
            <Row l="Subtotal" v={formatCurrency(totals.subtotal)} />
            {totals.taxAmount > 0 && <Row l={`Tax (${cafe.settings?.taxPercent ?? 0}%)`} v={formatCurrency(totals.taxAmount)} />}
            {totals.serviceAmount > 0 && <Row l="Service charge" v={formatCurrency(totals.serviceAmount)} />}
            {totals.packingAmount > 0 && <Row l="Packing" v={formatCurrency(totals.packingAmount)} />}
            {totals.deliveryAmount > 0 && <Row l="Delivery" v={formatCurrency(totals.deliveryAmount)} />}
            <div className="border-t border-white/10 pt-2 mt-1">
              <Row l={<span className="font-bold text-cream-50">Total</span>} v={<span className="font-bold text-lg text-gold-light">{formatCurrency(totals.totalAmount)}</span>} />
            </div>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="w-full"
            disabled={!canPlace}
            onClick={placeOrder}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Place order · {formatCurrency(totals.totalAmount)}
          </Button>
          {!canPlace && cart.length > 0 && !submitting && (
            <p className="helper text-center text-rose-400">
              {!nameValid ? 'Add your name to continue.'
                : !phoneValid ? 'Verify your WhatsApp number to continue.'
                  : !addressValid ? 'Add a delivery address to continue.'
                    : ''}
            </p>
          )}
          <p className="helper text-center text-forest-300">By placing the order, you confirm the items above.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: any; v: any }) {
  return (
    <div className="flex justify-between text-forest-300">
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );
}
