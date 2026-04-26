'use client';

import { useState } from 'react';
import {
  Coffee, MessageSquare, CreditCard, Save, Loader2, Send, Plus, X,
  Mail, Lock, Eye, EyeOff, MailCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ImagePicker } from '@/components/ui/image-picker';
import { BaileysPair } from './baileys-pair';
import { toast } from '@/components/ui/toaster';

type Tab = 'profile' | 'tax' | 'whatsapp' | 'payment' | 'branding';
const SENTINEL = '__unchanged__';

// Sensible defaults for HDFC's UPI credit alerts (most common in India). The
// cafe owner can edit these — they're just a head-start so first save works.
const DEFAULT_GMAIL_SENDER = 'alerts@hdfcbank.net';
const DEFAULT_GMAIL_SUBJECT = 'received UPI';

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
    waCloudToken: cafe.settings?.waCloudToken ?? '',         // SENTINEL when set
    waCloudPhoneId: cafe.settings?.waCloudPhoneId ?? '',
    waCloudVerifyToken: cafe.settings?.waCloudVerifyToken ?? '',
    baileysSessionId: cafe.settings?.baileysSessionId ?? '',
    notifyNumbers: (cafe.settings?.notifyNumbers ?? []) as string[],
    upiId: cafe.settings?.upiId ?? '',
    upiQrUrl: cafe.settings?.upiQrUrl ?? '',
    paymentEnabled: cafe.settings?.paymentEnabled ?? true,
    paymentNote: cafe.settings?.paymentNote ?? '',
    gmailUser: cafe.settings?.gmailUser ?? '',
    gmailAppPassword: cafe.settings?.gmailAppPassword ?? '',
    gmailSenderFilter: cafe.settings?.gmailSenderFilter ?? DEFAULT_GMAIL_SENDER,
    gmailSubjectFilter: cafe.settings?.gmailSubjectFilter ?? DEFAULT_GMAIL_SUBJECT,
    paymentMatchWindowMinutes: cafe.settings?.paymentMatchWindowMinutes ?? 30,
    primaryColor: cafe.settings?.primaryColor ?? '#6B4E3D',
    accentColor: cafe.settings?.accentColor ?? '#D4A574',
    googleReviewUrl: cafe.settings?.googleReviewUrl ?? '',
    enableSound: cafe.settings?.enableSound ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [showGmailPass, setShowGmailPass] = useState(false);
  const [testTo, setTestTo] = useState(form.whatsappNo || '');
  const [testing, setTesting] = useState(false);
  const [imapTesting, setImapTesting] = useState(false);
  const [newNotifyNumber, setNewNotifyNumber] = useState('');

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

  async function testImap() {
    setImapTesting(true);
    try {
      // Save the latest settings first so the test endpoint sees the password
      // the user just typed in (instead of the SENTINEL stub).
      await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafe: form, settings }),
      });
      const r = await fetch('/api/dashboard/payments/test-imap', { method: 'POST' });
      const data = await r.json().catch(() => ({}));
      if (data.ok) {
        toast.success(`IMAP OK — ${data.inboxCount ?? 0} messages in INBOX`, `${data.latencyMs}ms · ${data.user}`);
      } else {
        toast.error('IMAP failed', data.error ?? 'Check credentials');
      }
    } catch (e: any) {
      toast.error('IMAP test error', e?.message);
    } finally {
      setImapTesting(false);
    }
  }

  async function testSend() {
    if (!testTo) return toast.error('Enter a destination phone first');
    setTesting(true);
    const r = await fetch('/api/dashboard/wa/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testTo }),
    });
    const data = await r.json().catch(() => ({}));
    setTesting(false);
    if (r.ok && data.ok) {
      toast.success(`Sent via ${data.provider}!`);
    } else if (data.link) {
      window.open(data.link, '_blank');
      toast.success('Opened wa.me — manual mode');
    } else {
      toast.error('Send failed', data.error ?? '');
    }
  }

  function addNotifyNumber() {
    const cleaned = newNotifyNumber.replace(/\D/g, '');
    if (cleaned.length < 10) return toast.error('Enter a valid phone (10+ digits)');
    if (settings.notifyNumbers.includes(cleaned)) return toast.error('Already added');
    setSettings({ ...settings, notifyNumbers: [...settings.notifyNumbers, cleaned] });
    setNewNotifyNumber('');
  }

  function removeNotifyNumber(n: string) {
    setSettings({ ...settings, notifyNumbers: settings.notifyNumbers.filter((x) => x !== n) });
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Settings</h1>
        <p className="text-coffee-600 text-sm">Manage your cafe profile, charges and integrations</p>
      </div>

      <div className="card-warm">
        <div className="flex flex-wrap gap-2 border-b border-coffee-100 pb-3 mb-4 overflow-x-auto -mx-1 px-1">
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
          <div className="space-y-4">
            <div className="grid md:grid-cols-[auto,1fr] gap-4 items-start">
              <div>
                <label className="label">Logo</label>
                <ImagePicker
                  value={form.logoUrl}
                  onChange={(v) => setForm({ ...form, logoUrl: v })}
                  aspect="square"
                  maxSize={256}
                  placeholder="Cafe logo"
                  hint="Square crop, ~256px. JPG/PNG."
                />
              </div>
              <div>
                <label className="label">Cover banner</label>
                <ImagePicker
                  value={form.coverUrl}
                  onChange={(v) => setForm({ ...form, coverUrl: v })}
                  aspect="cover"
                  maxSize={1600}
                  placeholder="Cover banner (16:6)"
                  hint="Wide banner shown on the public page. Long edge resized to ~1600px."
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field l="Cafe name" v={form.name} on={(v: string) => setForm({ ...form, name: v })} />
              <Field l="Email" v={form.email} on={(v: string) => setForm({ ...form, email: v })} />
              <Field l="Phone" v={form.phone} on={(v: string) => setForm({ ...form, phone: v })} />
              <Field l="WhatsApp number" v={form.whatsappNo} on={(v: string) => setForm({ ...form, whatsappNo: v })} />
              <Field l="GST number" v={form.gstNumber} on={(v: string) => setForm({ ...form, gstNumber: v })} />
              <Field l="FSSAI number" v={form.fssaiNumber} on={(v: string) => setForm({ ...form, fssaiNumber: v })} />
              <Field l="City" v={form.city} on={(v: string) => setForm({ ...form, city: v })} />
              <Field l="Address" v={form.address} on={(v: string) => setForm({ ...form, address: v })} className="md:col-span-2" />
              <Field l="Description" v={form.description} on={(v: string) => setForm({ ...form, description: v })} multiline className="md:col-span-2" />
            </div>
          </div>
        )}

        {tab === 'tax' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Field l="Tax / GST %" v={settings.taxPercent} on={(v: string) => setSettings({ ...settings, taxPercent: Number(v) })} type="number" />
            <Field l="Service charge %" v={settings.serviceCharge} on={(v: string) => setSettings({ ...settings, serviceCharge: Number(v) })} type="number" />
            <Field l="Packing charge ₹ (takeaway)" v={settings.packingCharge} on={(v: string) => setSettings({ ...settings, packingCharge: Number(v) })} type="number" />
            <Field l="Delivery charge ₹" v={settings.deliveryCharge} on={(v: string) => setSettings({ ...settings, deliveryCharge: Number(v) })} type="number" />
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
                <option value="manual">Manual (wa.me links — owner taps to send)</option>
                <option value="cloud_api">WhatsApp Cloud API (Meta — recommended)</option>
                <option value="baileys">Baileys (self-hosted, scan QR)</option>
              </select>
              <p className="helper">
                Cloud API = official, reliable, no QR. Baileys = WhatsApp-Web-style, requires the worker service deployed.
              </p>
            </div>

            {settings.whatsappProvider === 'cloud_api' && (
              <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="font-semibold text-coffee-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Cloud API credentials
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Permanent token</label>
                    <div className="relative">
                      <Input
                        type={showWaToken ? 'text' : 'password'}
                        value={settings.waCloudToken === SENTINEL ? '••••••••••••' : settings.waCloudToken}
                        onChange={(e) => setSettings({ ...settings, waCloudToken: e.target.value })}
                        onFocus={() => { if (settings.waCloudToken === SENTINEL) setSettings({ ...settings, waCloudToken: '' }); }}
                        placeholder="EAA…"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-coffee-500 hover:text-coffee-900"
                      >
                        {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Field
                    l="Phone Number ID"
                    v={settings.waCloudPhoneId}
                    on={(v: string) => setSettings({ ...settings, waCloudPhoneId: v })}
                    placeholder="123456789012345"
                  />
                  <Field
                    l="Verify token (optional, for incoming webhooks)"
                    v={settings.waCloudVerifyToken === SENTINEL ? '••••••••' : settings.waCloudVerifyToken}
                    on={(v: string) => setSettings({ ...settings, waCloudVerifyToken: v })}
                    className="md:col-span-2"
                  />
                </div>
                <p className="helper">
                  Get these from{' '}
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="underline">
                    developers.facebook.com → Your App → WhatsApp → API Setup
                  </a>. Tokens are encrypted at rest.
                </p>
              </div>
            )}

            {settings.whatsappProvider === 'baileys' && (
              <div className="md:col-span-2 space-y-3">
                <BaileysPair sessionId={settings.baileysSessionId || cafe.id} />
                <details className="rounded-xl border border-coffee-200 bg-white p-3 text-xs text-coffee-600">
                  <summary className="cursor-pointer font-semibold text-coffee-800">Advanced — session ID</summary>
                  <div className="mt-2 space-y-2">
                    <Field
                      l="Session ID"
                      v={settings.baileysSessionId}
                      on={(v: string) => setSettings({ ...settings, baileysSessionId: v })}
                      placeholder={cafe.id}
                    />
                    <p>
                      Defaults to your cafe id. Auth state lives at <code>/tmp/cafeqr-baileys/&lt;id&gt;</code>
                      on the server. Container restarts wipe it — re-pair if that happens. To survive
                      restarts mount a Railway volume at that path.
                    </p>
                  </div>
                </details>
              </div>
            )}

            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3">
              <div className="font-semibold text-coffee-900">Admin notify list</div>
              <p className="helper">
                Phone numbers (any format) that get a WhatsApp ping on every new order. Owner WhatsApp number is auto-included.
              </p>
              <div className="flex flex-wrap gap-2">
                {settings.notifyNumbers.length === 0 && (
                  <span className="text-xs text-coffee-500">No extra numbers added.</span>
                )}
                {settings.notifyNumbers.map((n) => (
                  <span key={n} className="inline-flex items-center gap-2 pill bg-white border border-coffee-200 text-coffee-800">
                    +{n}
                    <button onClick={() => removeNotifyNumber(n)} className="text-coffee-500 hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newNotifyNumber}
                  onChange={(e) => setNewNotifyNumber(e.target.value)}
                  placeholder="9876543210"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNotifyNumber(); } }}
                />
                <Button onClick={addNotifyNumber} variant="outline"><Plus className="h-4 w-4" /> Add</Button>
              </div>
            </div>

            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-white p-4 space-y-3">
              <div className="font-semibold text-coffee-900">Test send</div>
              <p className="helper">Sends a quick message using your current provider so you can confirm it works.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="Phone (e.g. 9876543210)"
                />
                <Button onClick={testSend} disabled={testing} className="shrink-0">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send test
                </Button>
              </div>
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
            <Field l="UPI ID" v={settings.upiId} on={(v: string) => setSettings({ ...settings, upiId: v })} placeholder="cafe@hdfc" />
            <Field l="UPI QR image URL" v={settings.upiQrUrl} on={(v: string) => setSettings({ ...settings, upiQrUrl: v })} placeholder="https://…" />
            <Field l="Note shown to customer" v={settings.paymentNote} on={(v: string) => setSettings({ ...settings, paymentNote: v })} multiline className="md:col-span-2" placeholder="Pay using any UPI app and submit txn ID" />
            <Field l="Google review URL" v={settings.googleReviewUrl} on={(v: string) => setSettings({ ...settings, googleReviewUrl: v })} placeholder="https://g.page/your-cafe/review" className="md:col-span-2" />

            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3">
              <div className="font-semibold text-coffee-900 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Auto-verify UPI payments from Gmail
              </div>
              <p className="helper">
                Add the cafe's Gmail address + an{' '}
                <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">app password</a>{' '}
                that can read incoming bank emails (HDFC/SBI/ICICI etc). The payments page gets a "Verify from email" button
                that pulls the latest emails on demand and auto-marks paid orders.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <Field l="Gmail address" v={settings.gmailUser} on={(v: string) => setSettings({ ...settings, gmailUser: v })} placeholder="cafe.upi@gmail.com" />
                <div>
                  <label className="label">App password</label>
                  <div className="relative">
                    <Input
                      type={showGmailPass ? 'text' : 'password'}
                      value={settings.gmailAppPassword === SENTINEL ? '••••••••••••' : settings.gmailAppPassword}
                      onChange={(e) => setSettings({ ...settings, gmailAppPassword: e.target.value })}
                      onFocus={() => { if (settings.gmailAppPassword === SENTINEL) setSettings({ ...settings, gmailAppPassword: '' }); }}
                      placeholder="abcd efgh ijkl mnop"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGmailPass(!showGmailPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-coffee-500 hover:text-coffee-900"
                    >
                      {showGmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Field
                  l="Sender filter (email or domain)"
                  v={settings.gmailSenderFilter}
                  on={(v: string) => setSettings({ ...settings, gmailSenderFilter: v })}
                  placeholder="alerts@hdfcbank.net"
                />
                <Field
                  l="Subject contains"
                  v={settings.gmailSubjectFilter}
                  on={(v: string) => setSettings({ ...settings, gmailSubjectFilter: v })}
                  placeholder="received UPI"
                />
                <Field
                  l="Match window (minutes)"
                  v={settings.paymentMatchWindowMinutes}
                  on={(v: string) => setSettings({ ...settings, paymentMatchWindowMinutes: Number(v) })}
                  type="number"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <p className="text-xs text-coffee-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> The app password is encrypted before storage.
                </p>
                <Button onClick={testImap} disabled={imapTesting} variant="outline" size="sm">
                  {imapTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  Test connection
                </Button>
              </div>
            </div>
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

        <div className="border-t border-coffee-100 pt-4 mt-6 flex justify-end sticky bottom-0 bg-cream-50/95 backdrop-blur md:static md:bg-transparent -mx-3 md:mx-0 px-3 md:px-0 py-3 md:py-0">
          <Button onClick={save} disabled={loading} size="lg" className="w-full md:w-auto">
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
