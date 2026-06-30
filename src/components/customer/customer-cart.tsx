'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Plus, Minus, Trash2, Loader2, MessageSquare, Bike, Check, ArrowRight,
  ArrowLeft, Leaf, Info, ShoppingCart, Users, Smartphone, CreditCard, Banknote, QrCode,
} from 'lucide-react';
import { calcCart, type CartItem } from '@/lib/order-utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface CustomerSession { phone: string; name: string | null; points: number; loyaltyEnabled: boolean }

export function CustomerCart({
  cafe, table, cart, customer, onAdjust, onClose, onClear,
}: {
  cafe: any; table: any; cart: CartItem[]; customer?: CustomerSession | null;
  onAdjust: (idx: number, delta: number) => void; onClose: () => void; onClear: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [linkSent, setLinkSent] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [waSendLink, setWaSendLink] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(Boolean(customer?.phone));
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [pay, setPay] = useState<'upi' | 'card' | 'cash' | 'table'>('upi');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const defaultType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = (() => {
    if (table && cafe.settings?.acceptDineIn !== false) return 'DINE_IN';
    if (cafe.settings?.acceptTakeaway !== false) return 'TAKEAWAY';
    if (cafe.settings?.acceptDelivery) return 'DELIVERY';
    return 'TAKEAWAY';
  })();
  const [type, setType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>(defaultType);
  const [submitting, setSubmitting] = useState(false);

  const totals = calcCart(cart, cafe.settings, type);

  const typeOptions: { v: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; l: string; icon: any }[] = [
    cafe.settings?.acceptDineIn !== false && table ? { v: 'DINE_IN' as const, l: 'Dine-in', icon: Users } : null,
    cafe.settings?.acceptTakeaway !== false ? { v: 'TAKEAWAY' as const, l: 'Takeaway', icon: ShoppingCart } : null,
    cafe.settings?.acceptDelivery ? { v: 'DELIVERY' as const, l: 'Delivery', icon: Bike } : null,
  ].filter(Boolean) as any;

  const nameValid = name.trim().length >= 2;
  const addressValid = type !== 'DELIVERY' || address.trim().length >= 6;
  const canPlace = nameValid && phoneVerified && addressValid && cart.length > 0 && !submitting;

  async function requestLink() {
    if (!phone || phone.replace(/\D/g, '').length < 10) { toast.error('Enter valid phone number'); return; }
    setLinkLoading(true);
    try {
      const r = await fetch('/api/auth/customer-magic-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, cafeSlug: cafe.slug }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error ?? 'Could not send login link');
      setLinkSent(true);
      setWaSendLink(data.waSendLink ?? null);
      if (data.delivered) toast.success('Login link sent on WhatsApp');
      else toast.info('Use the WhatsApp share link below');
    } catch (e: any) { toast.error('Could not send link', e?.message); }
    finally { setLinkLoading(false); }
  }

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
          setPhone(data.phone); setPhoneVerified(true); toast.success('WhatsApp verified ✓');
        } else {
          if (pollRef.current) clearInterval(pollRef.current);
          setLinkSent(false);
          toast.error('Different number signed in', `That tab is logged in as ${data.phone}.`);
        }
      } catch {}
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [linkSent, phoneVerified, cafe.slug, phone]);

  async function placeOrder() {
    if (!cart.length) return;
    if (!nameValid) return toast.error('Please enter your name');
    if (!phoneVerified) return toast.error('Please verify your WhatsApp number');
    if (!addressValid) return toast.error('Please enter a delivery address');
    setSubmitting(true);
    try {
      const payload = {
        cafeSlug: cafe.slug, tableCode: table?.code, type,
        customerName: name.trim(), customerPhone: phone,
        customerAddress: type === 'DELIVERY' ? address.trim() : undefined,
        customerNote: note || undefined, items: cart,
      };
      const r = await fetch('/api/orders/place', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Could not place order');
      onClear();
      // Only route to the online /pay screen for UPI on a prepaid cafe — that
      // page is UPI-only (PayClient submits method 'upi'). Card / Cash / At
      // Table are settled in person, and postpaid cafes send the pay link via
      // WhatsApp after the order is SERVED (notifyCustomerStatus), so those all
      // go straight to order tracking.
      const payNowOnline =
        pay === 'upi' &&
        cafe.settings?.paymentEnabled &&
        cafe.settings?.paymentTiming !== 'postpaid';
      router.push(payNowOnline ? `/pay/${data.order.id}` : `/order/${data.order.id}?placed=1`);
    } catch (e: any) { toast.error('Order failed', e?.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="cafe-app w-full md:max-w-lg !min-h-0 rounded-t-3xl md:rounded-3xl max-h-[94vh] overflow-y-auto animate-fade-up" data-theme={cafe.settings?.appTheme || 'coffee'} style={{ background: 'var(--app-bg)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3" style={{ background: 'var(--app-nav)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => (step === 'checkout' ? setStep('cart') : onClose())} className="glass-chip h-10 w-10 rounded-full grid place-items-center">
            {step === 'checkout' ? <ArrowLeft className="h-5 w-5 text-cream-50" /> : <X className="h-5 w-5 text-cream-50" />}
          </button>
          <h2 className="font-display text-xl font-bold text-cream-50 flex-1">{step === 'cart' ? 'Your Cart' : 'Checkout'}</h2>
          <span className="glass-chip rounded-xl px-3 py-1.5 text-sm font-semibold text-cream-50">{table ? `Table ${table.number}` : 'Takeaway'}</span>
        </div>

        {cart.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-cream-200/30" />
            <div className="mt-3 text-cream-100 font-semibold">Your cart is empty</div>
            <button onClick={onClose} className="mt-4 btn-amber rounded-full px-5 py-2.5 font-semibold">Browse menu</button>
          </div>
        ) : step === 'cart' ? (
          <div className="px-4 pb-40 space-y-4">
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-cream-200/60">{totals.itemCount} items</span>
              <button onClick={onClear} className="text-sm app-amber inline-flex items-center gap-1"><Trash2 className="h-4 w-4" /> Clear Cart</button>
            </div>

            {cart.map((it, idx) => (
              <div key={idx} className="glass-card p-3 flex gap-3 items-center">
                <div className="h-16 w-16 rounded-xl bg-black/30 grid place-items-center shrink-0 overflow-hidden">
                  <ShoppingCart className="h-6 w-6 text-cream-200/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-cream-50 leading-tight truncate">{it.name}</div>
                  <div className="text-xs text-cream-200/55 line-clamp-1">
                    {it.variantName ? `${it.variantName}` : ''}
                    {(it.addons?.length ?? 0) > 0 && `${it.variantName ? ' · ' : ''}${it.addons!.map((a) => a.name).join(', ')}`}
                  </div>
                  {it.note && <div className="text-xs text-cream-200/45 italic">📝 {it.note}</div>}
                  <div className="font-bold text-cream-50 mt-1">{formatCurrency(((it.variantPrice ?? it.unitPrice) + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0)) * it.quantity)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="glass-chip rounded-full flex items-center">
                    <button onClick={() => onAdjust(idx, -1)} className="h-8 w-8 grid place-items-center text-cream-100"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center font-bold text-cream-50 text-sm">{it.quantity}</span>
                    <button onClick={() => onAdjust(idx, +1)} className="h-8 w-8 grid place-items-center text-cream-100"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => onAdjust(idx, -it.quantity)} className="text-cream-200/40 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}

            <div>
              <div className="text-sm font-semibold text-cream-100 mb-1.5">Special instructions <span className="text-cream-200/40 font-normal">(optional)</span></div>
              <div className="glass-card flex items-center gap-2 px-3 py-3">
                <MessageSquare className="h-4 w-4 text-cream-200/40 shrink-0" />
                <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="E.g. No onion, extra sauce, make it spicy…" className="flex-1 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40" />
                <span className="text-[11px] text-cream-200/40">{note.length}/120</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Bill Breakdown</div>
              <div className="space-y-2 text-sm border-t border-white/10 pt-3">
                <Row l={`Subtotal (${totals.itemCount} items)`} v={formatCurrency(totals.subtotal)} />
                {totals.taxAmount > 0 && <Row l="Taxes & Charges" v={formatCurrency(totals.taxAmount + totals.serviceAmount)} muted />}
                {totals.packingAmount > 0 ? <Row l="Restaurant Packaging" v={formatCurrency(totals.packingAmount)} /> : <Row l="Restaurant Packaging" v={<span className="text-emerald-400 font-bold text-xs">FREE</span>} />}
                {totals.deliveryAmount > 0 && <Row l="Delivery" v={formatCurrency(totals.deliveryAmount)} />}
                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                  <span className="font-bold app-amber text-lg">Total</span>
                  <span className="font-bold app-amber text-lg">{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-3 flex items-center gap-3">
              <Leaf className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="flex-1 text-xs text-cream-200/70">Thank you for helping us go green. No cutlery will be provided unless requested.</div>
              <span className="h-5 w-9 rounded-full bg-amber-500/80 relative"><span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-cream-50" /></span>
            </div>
          </div>
        ) : (
          /* ── CHECKOUT ── */
          <div className="px-4 pb-44 space-y-5">
            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Delivery Mode</div>
              <div className={`grid gap-2 ${typeOptions.length >= 3 ? 'grid-cols-3' : typeOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {typeOptions.map((t) => (
                  <button key={t.v} onClick={() => setType(t.v)} className={`rounded-xl p-3 flex flex-col items-center gap-1 border ${type === t.v ? 'btn-amber border-transparent' : 'glass-chip border-white/10'}`}>
                    <t.icon className={`h-5 w-5 ${type === t.v ? 'on-acc' : 'app-amber'}`} />
                    <span className={`text-xs font-semibold ${type === t.v ? 'on-acc' : 'text-cream-50'}`}>{t.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Your details</div>
              <div className="space-y-2.5">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name *" className="glass-card w-full px-4 py-3 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40" />
                {!phoneVerified ? (
                  <div>
                    <div className="flex gap-2">
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={linkSent} inputMode="tel" placeholder="WhatsApp number *" className="glass-card flex-1 px-4 py-3 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40 disabled:opacity-60" />
                      <button onClick={requestLink} disabled={linkSent || linkLoading} className="rounded-xl px-4 font-semibold text-sm inline-flex items-center gap-1.5 bg-wagreen text-white disabled:opacity-60">
                        {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                        {linkSent ? 'Sent' : 'Verify'}
                      </button>
                    </div>
                    {linkSent && (
                      <div className="mt-2 glass-card p-3 text-xs text-cream-100 flex items-start gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5 app-amber" />
                        <div className="flex-1">
                          Tap the WhatsApp link we sent to {phone} — keep this tab open.
                          {waSendLink && <a href={waSendLink} target="_blank" rel="noreferrer" className="block mt-1.5 underline font-semibold app-amber">Open WhatsApp to receive the link →</a>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-3 text-sm text-emerald-300 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Verified · {phone}
                    {customer?.loyaltyEnabled && (customer?.points ?? 0) > 0 && (
                      <span className="ml-auto text-xs font-bold bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">{customer!.points.toLocaleString()} pts</span>
                    )}
                  </div>
                )}
                {type === 'DELIVERY' && (
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Delivery address with landmark *" className="glass-card w-full px-4 py-3 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40 resize-none" />
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Order Summary <span className="text-cream-200/40 font-normal float-right">{totals.itemCount} items</span></div>
              <div className="glass-card divide-y divide-white/10">
                {cart.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <span className="text-cream-100 truncate pr-2">{it.quantity}× {it.name}{it.variantName ? ` (${it.variantName})` : ''}</span>
                    <span className="text-cream-200/70 shrink-0">{formatCurrency((it.variantPrice ?? it.unitPrice) * it.quantity + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0) * it.quantity)}</span>
                  </div>
                ))}
                <div className="p-3 space-y-1.5 text-sm">
                  <Row l="Subtotal" v={formatCurrency(totals.subtotal)} muted />
                  {(totals.taxAmount + totals.serviceAmount) > 0 && <Row l="Taxes & Charges" v={formatCurrency(totals.taxAmount + totals.serviceAmount)} muted />}
                  {totals.deliveryAmount > 0 && <Row l="Delivery" v={formatCurrency(totals.deliveryAmount)} muted />}
                  <div className="flex justify-between font-bold app-amber pt-1"><span>Total</span><span>{formatCurrency(totals.totalAmount)}</span></div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Payment Method</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { k: 'upi', l: 'UPI', icon: QrCode },
                  { k: 'card', l: 'Card', icon: CreditCard },
                  { k: 'cash', l: 'Cash', icon: Banknote },
                  { k: 'table', l: 'At Table', icon: Smartphone },
                ].map((p) => (
                  <button key={p.k} onClick={() => setPay(p.k as any)} className={`rounded-xl p-2.5 flex flex-col items-center gap-1 border ${pay === p.k ? 'btn-amber border-transparent' : 'glass-chip border-white/10'}`}>
                    <p.icon className={`h-5 w-5 ${pay === p.k ? 'on-acc' : 'app-amber'}`} />
                    <span className={`text-[11px] font-semibold ${pay === p.k ? 'on-acc' : 'text-cream-100'}`}>{p.l}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-cream-200/45 mt-2 flex items-center gap-1"><Info className="h-3 w-3" /> {pay === 'upi' && cafe.settings?.paymentEnabled && cafe.settings?.paymentTiming !== 'postpaid' ? 'You\'ll complete UPI payment on the next screen.' : 'Pay at the counter / table when your order is served.'}</p>
            </div>
          </div>
        )}

        {/* Sticky footer */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 px-4 py-3 border-t border-white/10" style={{ background: 'var(--app-nav)', backdropFilter: 'blur(12px)' }}>
            {step === 'cart' ? (
              <div className="flex items-center gap-3">
                <div className="leading-tight">
                  <div className="text-[11px] text-cream-200/55">Total Payable</div>
                  <div className="font-bold app-amber text-lg">{formatCurrency(totals.totalAmount)}</div>
                  <div className="text-[10px] text-cream-200/45">Inclusive of all taxes</div>
                </div>
                <button onClick={() => setStep('checkout')} className="btn-amber flex-1 rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2">
                  Proceed to Checkout <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={placeOrder} disabled={!canPlace} className="btn-amber w-full rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  Place Order · {formatCurrency(totals.totalAmount)} <ArrowRight className="h-5 w-5" />
                </button>
                {!canPlace && !submitting && (
                  <p className="text-center text-xs text-rose-300 mt-2">
                    {!nameValid ? 'Add your name to continue.' : !phoneVerified ? 'Verify your WhatsApp number to continue.' : !addressValid ? 'Add a delivery address to continue.' : ''}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ l, v, muted }: { l: any; v: any; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-cream-200/60' : 'text-cream-100'}>{l}</span>
      <span className={muted ? 'text-cream-200/70' : 'text-cream-50 font-medium'}>{v}</span>
    </div>
  );
}
