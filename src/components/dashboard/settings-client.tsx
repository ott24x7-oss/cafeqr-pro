'use client';

import { useState } from 'react';
import { Coffee, MessageSquare, CreditCard, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

type Tab = 'profile' | 'tax' | 'whatsapp' | 'payment' | 'branding';

export function SettingsClient({ cafe }: { cafe: any }) {
  const [tab, setTab] = useState<Tab>('profile');
  const [form, setForm] = useState({
    name: cafe.name,
    description: cafe.description ?? '',
    address: cafe.address ?? '',
    city: cafe.city ?? '',
    phone: cafe.phone ?? '',
    whatsappNo: cafe.whatsappNo ?? '',
    email: cafe.email ?? '',
    gstNumber: cafe.gstNumber ?? '',
    fssaiNumber: cafe.fssaiNumber ?? '',
    logoUrl: cafe.logoUrl ?? '',
    coverUrl: cafe.coverUrl ?? '',
  });
  const [settings, setSettings] = useState({
    taxPercent: cafe.settings?.taxPercent ?? 5,
    serviceCharge: cafe.settings?.serviceCharge ?? 0,
    packingCharge: cafe.settings?.packingCharge ?? 0,
    deliveryCharge: cafe.settings?.deliveryCharge ?? 0,
    acceptDineIn: cafe.settings?.acceptDineIn ?? true,
    acceptTakeaway: cafe.settings?.acceptTakeaway ?? true,
    acceptDelivery: cafe.settings?.acceptDelivery ?? false,
    whatsappProvider: cafe.settings?.whatsappProvider ?? 'manual',
    notifyOwnerWA: cafe.settings?.notifyOwnerWA ?? true,
    notifyCustomerWA: cafe.settings?.notifyCustomerWA ?? true,
    upiId: cafe.settings?.upiId ?? '',
    upiQrUrl: cafe.settings?.upiQrUrl ?? '',
    paymentEnabled: cafe.settings?.paymentEnabled ?? true,
    paymentNote: cafe.settings?.paymentNote ?? '',
    primaryColor: cafe.settings?.primaryColor ?? '#6B4E3D',
    accentColor: cafe.settings?.accentColor ?? '#D4A574',
    googleReviewUrl: cafe.settings?.googleReviewUrl ?? '',
    enableSound: cafe.settings?.enableSound ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const r = await fetch('/api/dashboard/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cafe: form, settings }),
    });
    setLoading(false);
    if (r.ok) toast.success('Saved!');
    else toast.error('Could not save');
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Settings</h1>
        <p className="text-coffee-600 text-sm">Manage your cafe profile, charges and integrations</p>
      </div>

      <div className="card-warm">
        <div className="flex flex-wrap gap-2 border-b border-coffee-100 pb-3 mb-4 overflow-x-auto">
          {[
            { k: 'profile', l: 'Profile', i: Coffee },
            { k: 'tax', l: 'Tax & Charges', i: CreditCard },
            { k: 'whatsapp', l: 'WhatsApp', i: MessageSquare },
            { k: 'payment', l: 'Payment', i: CreditCard },
            { k: 'branding', l: 'Branding', i: Coffee },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`pill whitespace-nowrap ${tab === t.k ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}
            >
              <t.i className="h-3 w-3" /> {t.l}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Field l="Cafe name" v={form.name} on={(v) => setForm({ ...form, name: v })} />
            <Field l="Email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
            <Field l="Phone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
            <Field l="WhatsApp number" v={form.whatsappNo} on={(v) => setForm({ ...form, whatsappNo: v })} />
            <Field l="GST number" v={form.gstNumber} on={(v) => setForm({ ...form, gstNumber: v })} />
            <Field l="FSSAI number" v={form.fssaiNumber} on={(v) => setForm({ ...form, fssaiNumber: v })} />
            <Field l="City" v={form.city} on={(v) => setForm({ ...form, city: v })} />
            <Field l="Address" v={form.address} on={(v) => setForm({ ...form, address: v })} className="md:col-span-2" />
            <Field l="Description" v={form.description} on={(v) => setForm({ ...form, description: v })} multiline className="md:col-span-2" />
            <Field l="Logo URL" v={form.logoUrl} on={(v) => setForm({ ...form, logoUrl: v })} />
            <Field l="Cover image URL" v={form.coverUrl} on={(v) => setForm({ ...form, coverUrl: v })} />
          </div>
        )}

        {tab === 'tax' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Field l="Tax / GST %" v={settings.taxPercent} on={(v) => setSettings({ ...settings, taxPercent: Number(v) })} type="number" />
            <Field l="Service charge %" v={settings.serviceCharge} on={(v) => setSettings({ ...settings, serviceCharge: Number(v) })} type="number" />
            <Field l="Packing charge ₹ (takeaway)" v={settings.packingCharge} on={(v) => setSettings({ ...settings, packingCharge: Number(v) })} type="number" />
            <Field l="Delivery charge ₹" v={settings.deliveryCharge} on={(v) => setSettings({ ...settings, deliveryCharge: Number(v) })} type="number" />
            <div className="md:col-span-2 flex flex-wrap gap-3 text-sm">
              {[
                ['acceptDineIn', 'Dine in'],
                ['acceptTakeaway', 'Takeaway'],
                ['acceptDelivery', 'Delivery'],
              ].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(settings as any)[k]}
                    onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })}
                    className="accent-coffee-700"
                  />
                  Accept {l}
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Provider</label>
              <select
                className="input"
                value={settings.whatsappProvider}
                onChange={(e) => setSettings({ ...settings, whatsappProvider: e.target.value as any })}
              >
                <option value="manual">Manual (wa.me links)</option>
                <option value="cloud_api">WhatsApp Cloud API (Meta)</option>
                <option value="baileys">Baileys (self-hosted)</option>
              </select>
              <p className="helper">Switch to Cloud API or Baileys to automate sends. Add tokens in env.</p>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.notifyOwnerWA} onChange={(e) => setSettings({ ...settings, notifyOwnerWA: e.target.checked })} className="accent-coffee-700" />
                Notify owner on new orders
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.notifyCustomerWA} onChange={(e) => setSettings({ ...settings, notifyCustomerWA: e.target.checked })} className="accent-coffee-700" />
                Notify customer on status updates
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.enableSound} onChange={(e) => setSettings({ ...settings, enableSound: e.target.checked })} className="accent-coffee-700" />
                Play sound on new order
              </label>
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.paymentEnabled} onChange={(e) => setSettings({ ...settings, paymentEnabled: e.target.checked })} className="accent-coffee-700" />
              Show "Pay Now" button to customers
            </div>
            <Field l="UPI ID" v={settings.upiId} on={(v) => setSettings({ ...settings, upiId: v })} placeholder="cafe@hdfc" />
            <Field l="UPI QR image URL" v={settings.upiQrUrl} on={(v) => setSettings({ ...settings, upiQrUrl: v })} placeholder="https://…" />
            <Field l="Note shown to customer" v={settings.paymentNote} on={(v) => setSettings({ ...settings, paymentNote: v })} multiline className="md:col-span-2" placeholder="Pay using any UPI app and submit txn ID" />
            <Field l="Google review URL" v={settings.googleReviewUrl} on={(v) => setSettings({ ...settings, googleReviewUrl: v })} placeholder="https://g.page/your-cafe/review" className="md:col-span-2" />
          </div>
        )}

        {tab === 'branding' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Primary colour</label>
              <Input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} className="h-12" />
            </div>
            <div>
              <label className="label">Accent colour</label>
              <Input type="color" value={settings.accentColor} onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })} className="h-12" />
            </div>
            <p className="md:col-span-2 helper">Custom branding requires a Pro plan or higher.</p>
          </div>
        )}

        <div className="border-t border-coffee-100 pt-4 mt-6 flex justify-end">
          <Button onClick={save} disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ l, v, on, type = 'text', multiline, placeholder, className }: any) {
  return (
    <div className={className}>
      <label className="label">{l}</label>
      {multiline ? (
        <Textarea value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
      ) : (
        <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}
