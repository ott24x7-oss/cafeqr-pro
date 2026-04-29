'use client';

import { useState } from 'react';
import { Plus, Save, Trash2, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { slugify } from '@/lib/utils';

export function PlansEditor({ initial }: { initial: any[] }) {
  const [plans, setPlans] = useState(initial);
  const [editing, setEditing] = useState<any | null>(null);
  const [reassignFor, setReassignFor] = useState<{ plan: any; using: number } | null>(null);

  async function saveOne(plan: any) {
    const r = await fetch(`/api/admin/plans${plan.id ? '/' + plan.id : ''}`, {
      method: plan.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...plan, slug: plan.slug || slugify(plan.name) }),
    });
    if (r.ok) {
      const data = await r.json();
      setPlans((cur) => plan.id ? cur.map((p) => p.id === plan.id ? data.plan : p) : [...cur, data.plan]);
      setEditing(null);
      toast.success('Saved');
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error('Failed', d.error ?? '');
    }
  }

  async function attemptDelete(plan: any) {
    if (!confirm(`Delete "${plan.name}"?`)) return;
    const r = await fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
    if (r.ok) {
      setPlans((c) => c.filter((p) => p.id !== plan.id));
      toast.success('Deleted');
      return;
    }
    const data = await r.json().catch(() => ({}));
    if (r.status === 409 && data.code === 'PLAN_IN_USE') {
      // Open the reassignment modal so the admin can pick a destination
      // plan and retry. We pass through the using-count for context.
      setReassignFor({ plan, using: data.using ?? 0 });
      return;
    }
    toast.error('Could not delete', data.error ?? `HTTP ${r.status}`);
  }

  async function reassignAndDelete(planId: string, reassignTo: string) {
    const r = await fetch(`/api/admin/plans/${planId}?reassignTo=${encodeURIComponent(reassignTo)}`, { method: 'DELETE' });
    if (r.ok) {
      const data = await r.json();
      setPlans((c) => c.filter((p) => p.id !== planId));
      setReassignFor(null);
      toast.success(`Deleted — moved ${data.moved} cafe${data.moved === 1 ? '' : 's'}`);
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error('Could not delete', d.error ?? '');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Plans</h1>
          <p className="text-coffee-600 text-sm">Pricing visible on /pricing — managed here</p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              name: '',
              slug: '',
              priceMonthly: 0,
              priceYearly: 0,
              maxTables: 10,
              maxMenuItems: 50,
              maxStaff: 3,
              maxOrdersPerMonth: 100,
              isActive: true,
              whatsappEnabled: true,
              loyaltyEnabled: true,
              paymentEnabled: true,
              couponsEnabled: true,
              description: '',
              features: [],
            })
          }
        >
          <Plus className="h-4 w-4" /> Add plan
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {plans.map((p) => (
          <div key={p.id} className="card-warm flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-xl font-bold text-coffee-900">{p.name}</div>
                <div className="text-xs text-coffee-500">/{p.slug}</div>
              </div>
              {p.isPopular && <span className="pill-amber"><Star className="h-3 w-3" /> Popular</span>}
            </div>
            <div className="font-display text-3xl font-bold text-coffee-900 mt-2">
              {p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}`}<span className="text-sm text-coffee-500">/mo</span>
            </div>
            {p.priceYearly > 0 && (
              <div className="text-xs text-coffee-500">₹{p.priceYearly}/yr</div>
            )}
            <p className="text-sm text-coffee-600 mt-2 min-h-[40px]">{p.description}</p>
            <div className="text-xs text-coffee-700 mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
              <span>Orders/mo: <b>{p.maxOrdersPerMonth || '∞'}</b></span>
              <span>Items: <b>{p.maxMenuItems}</b></span>
              <span>Tables: <b>{p.maxTables}</b></span>
              <span>Staff: <b>{p.maxStaff}</b></span>
              <span>WhatsApp: {p.whatsappEnabled ? '✓' : '—'}</span>
              <span>Loyalty: {p.loyaltyEnabled ? '✓' : '—'}</span>
              <span>Payment: {p.paymentEnabled ? '✓' : '—'}</span>
              <span>Coupons: {p.couponsEnabled ? '✓' : '—'}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`pill ${p.isActive ? 'pill-wa' : 'pill-rose'}`}>{p.isActive ? 'Active' : 'Hidden'}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => attemptDelete(p)}>
                <Trash2 className="h-3 w-3 text-rose-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PlanEditor plan={editing} onClose={() => setEditing(null)} onSave={saveOne} />
      )}

      {reassignFor && (
        <ReassignModal
          plan={reassignFor.plan}
          using={reassignFor.using}
          allPlans={plans}
          onClose={() => setReassignFor(null)}
          onConfirm={(toId) => reassignAndDelete(reassignFor.plan.id, toId)}
        />
      )}
    </div>
  );
}

function PlanEditor({ plan, onClose, onSave }: any) {
  const [form, setForm] = useState(plan);
  const [loading, setLoading] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: any) { setForm({ ...form, [k]: v }); }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full md:max-w-lg bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold text-coffee-900 mb-4">{plan.id ? 'Edit plan' : 'New plan'}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field l="Name" v={form.name} on={(v: string) => set('name', v)} />
            <Field l="Slug" v={form.slug} on={(v: string) => set('slug', v)} />
            <Field l="Price /mo (₹)" v={form.priceMonthly} on={(v: string) => set('priceMonthly', Number(v))} type="number" />
            <Field l="Price /year (₹)" v={form.priceYearly} on={(v: string) => set('priceYearly', Number(v))} type="number" />
          </div>
          <div>
            <label className="label">Description</label>
            <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Short tagline" />
          </div>

          {/* Limits row — Orders /month drives /api/orders/place enforcement
              (counted per calendar month, hard-block at 110% of cap, 0 = unlimited). */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field
              l="Orders /month"
              v={form.maxOrdersPerMonth}
              on={(v: string) => set('maxOrdersPerMonth', Number(v))}
              type="number"
              hint="0 = unlimited"
            />
            <Field l="Max items" v={form.maxMenuItems} on={(v: string) => set('maxMenuItems', Number(v))} type="number" />
            <Field l="Max tables" v={form.maxTables} on={(v: string) => set('maxTables', Number(v))} type="number" />
            <Field l="Max staff" v={form.maxStaff} on={(v: string) => set('maxStaff', Number(v))} type="number" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {[
              ['whatsappEnabled',  'WhatsApp'],
              ['loyaltyEnabled',   'Loyalty'],
              ['paymentEnabled',   'UPI Payments'],
              ['couponsEnabled',   'Coupons'],
              ['customBranding',   'Branding'],
              ['customSubdomain',  'Subdomain'],
              ['analytics',        'Analytics'],
              ['prioritySupport',  'Priority support'],
              ['multiLanguage',    'Multi-lang'],
              ['isPopular',        'Mark popular'],
              ['isActive',         'Active'],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-coffee-200 bg-white">
                <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k as any, e.target.checked)} className="accent-coffee-700" />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => { setLoading(true); await onSave(form); setLoading(false); }} disabled={loading || !form.name}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReassignModal({
  plan, using, allPlans, onClose, onConfirm,
}: {
  plan: any;
  using: number;
  allPlans: any[];
  onClose: () => void;
  onConfirm: (toId: string) => void;
}) {
  // Default: prefer Startup, then any active paid plan, then first other plan.
  const candidates = allPlans.filter((p) => p.id !== plan.id);
  const defaultId = candidates.find((p) => p.slug === 'startup' && p.isActive)?.id
    ?? candidates.find((p) => p.priceMonthly > 0 && p.isActive)?.id
    ?? candidates.find((p) => p.isActive)?.id
    ?? candidates[0]?.id
    ?? '';
  const [toId, setToId] = useState(defaultId);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-cream-50 rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold text-coffee-900 mb-1">Reassign cafes first</h3>
        <p className="text-sm text-coffee-600 mb-4">
          <b>{using}</b> cafe{using === 1 ? '' : 's'} {using === 1 ? 'is' : 'are'} on <b>{plan.name}</b>.
          Pick a plan to move them to before deleting.
        </p>
        <label className="label">Move cafes to</label>
        <select
          className="input"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
        >
          {candidates.length === 0 && <option value="">No other plan available</option>}
          {candidates.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (₹{p.priceMonthly}/mo)</option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!toId}
            onClick={() => onConfirm(toId)}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Trash2 className="h-4 w-4" /> Move &amp; delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ l, v, on, type = 'text', hint }: any) {
  return (
    <div>
      <label className="label">{l}</label>
      <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} />
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}
