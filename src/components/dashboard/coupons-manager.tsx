'use client';

import { useState } from 'react';
import { Plus, Tag, Trash2, X, Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { formatDate } from '@/lib/utils';

export function CouponsManager({ initial }: { initial: any[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);

  async function toggle(c: any) {
    const r = await fetch(`/api/dashboard/coupons/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (r.ok) setCoupons((cur) => cur.map((x) => x.id === c.id ? { ...x, isActive: !c.isActive } : x));
  }

  async function del(id: string) {
    if (!confirm('Delete this coupon?')) return;
    const r = await fetch(`/api/dashboard/coupons/${id}`, { method: 'DELETE' });
    if (r.ok) setCoupons((cur) => cur.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Coupons</h1>
          <p className="text-coffee-600 text-sm">{coupons.length} discount codes</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {coupons.length === 0 && (
          <div className="card-warm col-span-full text-center text-coffee-500 py-10">
            <Tag className="mx-auto h-10 w-10 mb-2 text-coffee-300" />
            No coupons yet. Create promos to drive repeat visits.
          </div>
        )}
        {coupons.map((c) => (
          <div key={c.id} className="card-warm">
            <div className="flex items-center justify-between">
              <code className="font-bold text-coffee-900 text-lg bg-cream-100 px-3 py-1 rounded-lg">{c.code}</code>
              <span className={`pill ${c.isActive ? 'pill-wa' : 'pill-rose'}`}>{c.isActive ? 'Active' : 'Off'}</span>
            </div>
            <div className="mt-2 text-sm text-coffee-700">
              {c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
              {c.minOrder > 0 && <span className="text-coffee-500"> · min ₹{c.minOrder}</span>}
            </div>
            {c.description && <div className="text-xs text-coffee-500 mt-1">{c.description}</div>}
            <div className="text-xs text-coffee-500 mt-2">
              Used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ''} times
            </div>
            {c.validUntil && <div className="text-xs text-coffee-500">Until {formatDate(c.validUntil, { dateStyle: 'short', timeStyle: undefined })}</div>}
            <div className="mt-3 flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => toggle(c)}><Power className="h-3 w-3" /> {c.isActive ? 'Pause' : 'Activate'}</Button>
              <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-3 w-3 text-rose-500" /></Button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddCouponModal onClose={() => setShowAdd(false)} onSaved={(c) => { setCoupons((x) => [c, ...x]); setShowAdd(false); }} />}
    </div>
  );
}

function AddCouponModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({ code: '', description: '', discountType: 'percent', discountValue: 10, minOrder: 0, usageLimit: '', validUntil: '' });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.code) return toast.error('Enter a code');
    setLoading(true);
    const r = await fetch('/api/dashboard/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        code: form.code.toUpperCase(),
        discountValue: Number(form.discountValue),
        minOrder: Number(form.minOrder),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        validUntil: form.validUntil || null,
      }),
    });
    setLoading(false);
    if (r.ok) {
      const d = await r.json();
      onSaved(d.coupon);
      toast.success('Coupon created');
    } else {
      const d = await r.json();
      toast.error(d.error ?? 'Failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full md:max-w-md bg-cream-50 rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold text-coffee-900">New coupon</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field l="Code" v={form.code} on={(v: string) => setForm({ ...form, code: v.toUpperCase() })} placeholder="WELCOME10" />
          <Field l="Description" v={form.description} on={(v: string) => setForm({ ...form, description: v })} placeholder="Welcome offer" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Discount type</label>
              <select className="input" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percent">Percent</option>
                <option value="flat">Flat ₹</option>
              </select>
            </div>
            <Field l={form.discountType === 'percent' ? 'Percent off' : 'Amount off'} v={form.discountValue} on={(v: any) => setForm({ ...form, discountValue: v })} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field l="Min order ₹" v={form.minOrder} on={(v: any) => setForm({ ...form, minOrder: v })} type="number" />
            <Field l="Usage limit" v={form.usageLimit} on={(v: any) => setForm({ ...form, usageLimit: v })} type="number" placeholder="optional" />
          </div>
          <Field l="Valid until" v={form.validUntil} on={(v: string) => setForm({ ...form, validUntil: v })} type="date" />
          <Button className="w-full" onClick={save} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ l, v, on, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="label">{l}</label>
      <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
