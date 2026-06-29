'use client';

import { useState } from 'react';
import {
  Coffee, MessageSquare, CreditCard, Save, Loader2, Send, Plus, X,
  Mail, Lock, Eye, EyeOff, MailCheck, Globe, Copy, Check, AlertCircle, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ImagePicker } from '@/components/ui/image-picker';
import { BaileysPair } from './baileys-pair';
import { toast } from '@/components/ui/toaster';
import { CURRENCIES } from '@/lib/utils';
import { COUNTRY_DIAL } from '@/lib/whatsapp';

type Tab = 'profile' | 'tax' | 'whatsapp' | 'payment' | 'loyalty' | 'branding' | 'domain';
const SENTINEL = '__unchanged__';

// Sensible defaults for HDFC's UPI credit alerts (most common in India). The
// cafe owner can edit these — they're just a head-start so first save works.
const DEFAULT_GMAIL_SENDER = 'alerts@hdfcbank.net';
const DEFAULT_GMAIL_SUBJECT = 'received UPI';

const NOTIFY_STATUSES: { key: string; label: string; help: string }[] = [
  { key: 'PLACED',     label: 'Order received',  help: 'Right after the customer places the order.' },
  { key: 'ACCEPTED',   label: 'Order accepted',  help: 'When you confirm the order.' },
  { key: 'PREPARING',  label: 'Preparing',       help: 'Kitchen has started cooking.' },
  { key: 'READY',      label: 'Ready',           help: 'Order is ready for pickup / serve.' },
  { key: 'SERVED',     label: 'Served',          help: 'Once the food is at the table.' },
  { key: 'COMPLETED',  label: 'Completed',       help: 'Closed-out orders.' },
  { key: 'CANCELLED',  label: 'Cancelled',       help: 'Cancelled orders.' },
  { key: 'PAID',       label: 'Payment received',help: 'Combined message with invoice PDF + review link.' },
];
const DEFAULT_NOTIFY_STATUSES = ['PLACED', 'ACCEPTED', 'SERVED', 'PAID'];

// Customer-app colour themes (mirrors globals.css .cafe-app[data-theme=...]).
const APP_THEMES: { k: string; label: string; bg: string; accent: string; text: string }[] = [
  { k: 'coffee',   label: 'Coffee (default)', bg: '#16110D', accent: '#E0A458', text: '#F2E9DD' },
  { k: 'maroon',   label: 'Maroon Wine',      bg: '#1b0d11', accent: '#E58A9B', text: '#F2E9DD' },
  { k: 'midnight', label: 'Midnight Blue',    bg: '#0a1726', accent: '#4FC3F7', text: '#EAF4FB' },
  { k: 'forest',   label: 'Forest Green',     bg: '#0d1a12', accent: '#74C98A', text: '#EAF6EE' },
  { k: 'latte',    label: 'Latte (light)',    bg: '#FBF6EE', accent: '#6B4E3D', text: '#2a1c12' },
];

const COUNTRY_OPTIONS = Object.entries(COUNTRY_DIAL)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([iso, dial]) => ({ iso, dial, label: `${iso} · +${dial}` }));

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
    currency: (cafe.currency ?? 'INR') as string,
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
    notifyOwnerInApp: cafe.settings?.notifyOwnerInApp ?? false,
    notifyOnStatuses: (cafe.settings?.notifyOnStatuses ?? DEFAULT_NOTIFY_STATUSES) as string[],
    waCloudToken: cafe.settings?.waCloudToken ?? '',         // SENTINEL when set
    waCloudPhoneId: cafe.settings?.waCloudPhoneId ?? '',
    waCloudVerifyToken: cafe.settings?.waCloudVerifyToken ?? '',
    baileysSessionId: cafe.settings?.baileysSessionId ?? '',
    notifyNumbers: (cafe.settings?.notifyNumbers ?? []) as string[],
    upiId: cafe.settings?.upiId ?? '',
    upiQrUrl: cafe.settings?.upiQrUrl ?? '',
    paymentEnabled: cafe.settings?.paymentEnabled ?? true,
    paymentTiming: (cafe.settings?.paymentTiming ?? 'prepaid') as 'prepaid' | 'postpaid',
    paymentNote: cafe.settings?.paymentNote ?? '',
    invoiceTemplate: (cafe.settings?.invoiceTemplate ?? 'classic') as string,
    gmailUser: cafe.settings?.gmailUser ?? '',
    gmailAppPassword: cafe.settings?.gmailAppPassword ?? '',
    gmailSenderFilter: cafe.settings?.gmailSenderFilter ?? DEFAULT_GMAIL_SENDER,
    gmailSubjectFilter: cafe.settings?.gmailSubjectFilter ?? DEFAULT_GMAIL_SUBJECT,
    paymentMatchWindowMinutes: cafe.settings?.paymentMatchWindowMinutes ?? 30,
    primaryColor: cafe.settings?.primaryColor ?? '#6B4E3D',
    accentColor: cafe.settings?.accentColor ?? '#D4A574',
    appTheme: (cafe.settings?.appTheme ?? 'coffee') as string,
    googleReviewUrl: cafe.settings?.googleReviewUrl ?? '',
    enableSound: cafe.settings?.enableSound ?? true,
    country: (cafe.settings?.country ?? 'IN') as string,
    deliveryPartnerPhone: cafe.settings?.deliveryPartnerPhone ?? '',
    loyaltyEnabled: cafe.settings?.loyaltyEnabled ?? false,
    loyaltyPercent: cafe.settings?.loyaltyPercent ?? 5,
    welcomeAutoReply: cafe.settings?.welcomeAutoReply ?? false,
    welcomeMessage: cafe.settings?.welcomeMessage ?? '',
    welcomeTriggers: (cafe.settings?.welcomeTriggers ?? ['hi', 'hello']) as string[],
  });

  const [newWelcomeTrigger, setNewWelcomeTrigger] = useState('');

  const [loading, setLoading] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);
  const [showGmailPass, setShowGmailPass] = useState(false);
  const [testTo, setTestTo] = useState(form.whatsappNo || '');
  const [testing, setTesting] = useState(false);
  const [imapTesting, setImapTesting] = useState(false);
  const [imapResult, setImapResult] = useState<any>(null);
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
    setImapResult(null);
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
      setImapResult(data);
      if (data.ok) {
        const note = (data.filter?.sender || data.filter?.subject)
          ? `Filter matched ${data.filteredCount}/${data.last24hCount} of last-24h emails`
          : `${data.last24hCount} emails in last 24h (no filter set)`;
        toast.success(`IMAP OK — ${data.inboxCount ?? 0} in INBOX`, note);
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
        <p className="text-coffee-600 text-sm">
          Manage your cafe profile, charges and integrations
          <span className="text-coffee-500"> · कैफ़े की profile, charges और integrations यहाँ से manage करें</span>
        </p>
      </div>

      <div className="card-warm">
        <div className="flex flex-wrap gap-2 border-b border-coffee-100 pb-3 mb-4 overflow-x-auto -mx-1 px-1">
          {[
            { k: 'profile', l: 'Profile', i: Coffee },
            { k: 'tax', l: 'Tax & Charges', i: CreditCard },
            { k: 'whatsapp', l: 'WhatsApp', i: MessageSquare },
            { k: 'payment', l: 'Payment', i: CreditCard },
            { k: 'loyalty', l: 'Loyalty', i: Star },
            { k: 'branding', l: 'Branding', i: Coffee },
            { k: 'domain', l: 'Custom Domain', i: Globe },
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

              <div>
                <label className="label">Country</label>
                <select
                  className="input"
                  value={settings.country}
                  onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.iso} value={c.iso}>{c.label}</option>
                  ))}
                </select>
                <p className="helper">Sets the dial code prefix used everywhere phone numbers are entered or sent.</p>
              </div>
              <div>
                <label className="label">Default currency</label>
                <select
                  className="input"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <p className="helper">All prices on the customer pages, dashboard and invoices use this.</p>
              </div>

              <div>
                <label className="label">Phone</label>
                <PhoneInput
                  iso={settings.country}
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
              </div>
              <div>
                <label className="label">WhatsApp number</label>
                <PhoneInput
                  iso={settings.country}
                  value={form.whatsappNo}
                  onChange={(v) => setForm({ ...form, whatsappNo: v })}
                />
              </div>

              <Field l="GST / Tax number" v={form.gstNumber} on={(v: string) => setForm({ ...form, gstNumber: v })} />
              <Field l="FSSAI / License number" v={form.fssaiNumber} on={(v: string) => setForm({ ...form, fssaiNumber: v })} />
              <Field l="City" v={form.city} on={(v: string) => setForm({ ...form, city: v })} />
              <Field l="Address" v={form.address} on={(v: string) => setForm({ ...form, address: v })} className="md:col-span-2" />
              <Field l="Description" v={form.description} on={(v: string) => setForm({ ...form, description: v })} multiline className="md:col-span-2" />
            </div>
          </div>
        )}

        {tab === 'tax' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 rounded-xl bg-cream-100 border border-coffee-100 p-3 text-sm leading-relaxed">
              <div className="text-coffee-800">
                These charges are added on top of the food price at checkout.
              </div>
              <div className="text-coffee-600 text-[13px]">
                ये charges खाने के दाम के ऊपर checkout पर जुड़ते हैं।
              </div>
            </div>
            <div>
              <Field l="Tax / GST %" v={settings.taxPercent} on={(v: string) => setSettings({ ...settings, taxPercent: Number(v) })} type="number" />
              <p className="helper">
                Standard GST in India is 5% for most cafes.
                <span className="block text-coffee-400">भारत में ज़्यादातर cafes के लिए 5% GST रहता है।</span>
              </p>
            </div>
            <div>
              <Field l="Service charge %" v={settings.serviceCharge} on={(v: string) => setSettings({ ...settings, serviceCharge: Number(v) })} type="number" />
              <p className="helper">
                Optional. 5–10% is common at sit-down cafes.
                <span className="block text-coffee-400">वैकल्पिक। sit-down cafes में 5–10% आम है।</span>
              </p>
            </div>
            <div>
              <Field l="Packing charge ₹ (takeaway)" v={settings.packingCharge} on={(v: string) => setSettings({ ...settings, packingCharge: Number(v) })} type="number" />
              <p className="helper">
                Flat fee on takeaway orders only.
                <span className="block text-coffee-400">सिर्फ़ takeaway पर लगता है।</span>
              </p>
            </div>
            <Field l="Delivery charge ₹" v={settings.deliveryCharge} on={(v: string) => setSettings({ ...settings, deliveryCharge: Number(v) })} type="number" />
            <div className="md:col-span-2 flex flex-wrap gap-3 text-sm">
              {[
                ['acceptDineIn', 'Dine in'],
                ['acceptTakeaway', 'Takeaway'],
                ['acceptDelivery', 'Home delivery'],
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

            {settings.acceptDelivery && (
              <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3">
                <div className="font-semibold text-coffee-900 flex items-center gap-2">
                  🛵 Home delivery
                </div>
                <p className="helper">
                  When a delivery order lands, the bot will WhatsApp this number with the customer's
                  name, phone, address and items so the partner can roll out immediately.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Delivery partner WhatsApp</label>
                    <PhoneInput
                      iso={settings.country}
                      value={settings.deliveryPartnerPhone}
                      onChange={(v) => setSettings({ ...settings, deliveryPartnerPhone: v })}
                    />
                  </div>
                  <Field
                    l="Default delivery charge"
                    v={settings.deliveryCharge}
                    on={(v: string) => setSettings({ ...settings, deliveryCharge: Number(v) })}
                    type="number"
                  />
                </div>
              </div>
            )}
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
                <span className="block text-coffee-400 mt-0.5">
                  Cloud API = official और reliable। Baileys = WhatsApp Web की तरह QR scan करना पड़ता है।
                  Manual में आपको हर बार खुद link tap करना होगा।
                </span>
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

            {/* Welcome auto-reply (Baileys only) */}
            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-coffee-900">Auto-reply on first contact</div>
                  <p className="helper">
                    When a customer DMs you with a trigger word, your bot replies with a welcome
                    message + your menu link. Sends only once per customer per 7 days.
                    {settings.whatsappProvider !== 'baileys' && (
                      <span className="block mt-1 text-amber-700">
                        Only works with the <b>Baileys</b> provider. Switch above to enable.
                      </span>
                    )}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-coffee-700"
                    checked={settings.welcomeAutoReply}
                    onChange={(e) => setSettings({ ...settings, welcomeAutoReply: e.target.checked })}
                    disabled={settings.whatsappProvider !== 'baileys'}
                  />
                  <span className="text-sm font-medium text-coffee-800">
                    {settings.welcomeAutoReply ? 'On' : 'Off'}
                  </span>
                </label>
              </div>

              <div>
                <label className="label">Welcome message</label>
                <Textarea
                  rows={4}
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                  placeholder="Hi 👋 Thanks for reaching out to *{cafeName}*. Browse our menu and order online: {cafeUrl}"
                  disabled={!settings.welcomeAutoReply}
                />
                <p className="helper">
                  Use <code>{'{cafeName}'}</code> for your cafe name and <code>{'{cafeUrl}'}</code>
                  {' '}for the menu link. Leave blank to use the default.
                </p>
              </div>

              <div>
                <label className="label">Trigger words</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newWelcomeTrigger}
                    onChange={(e) => setNewWelcomeTrigger(e.target.value)}
                    placeholder="hi, hello, start, menu…"
                    disabled={!settings.welcomeAutoReply}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = newWelcomeTrigger.trim().toLowerCase();
                        if (!v) return;
                        if (settings.welcomeTriggers.includes(v)) {
                          setNewWelcomeTrigger('');
                          return;
                        }
                        setSettings({
                          ...settings,
                          welcomeTriggers: [...settings.welcomeTriggers, v].slice(0, 12),
                        });
                        setNewWelcomeTrigger('');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!settings.welcomeAutoReply || !newWelcomeTrigger.trim()}
                    onClick={() => {
                      const v = newWelcomeTrigger.trim().toLowerCase();
                      if (!v || settings.welcomeTriggers.includes(v)) return;
                      setSettings({
                        ...settings,
                        welcomeTriggers: [...settings.welcomeTriggers, v].slice(0, 12),
                      });
                      setNewWelcomeTrigger('');
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {settings.welcomeTriggers.length === 0 && (
                    <span className="text-xs text-coffee-500">No triggers yet — add at least one.</span>
                  )}
                  {settings.welcomeTriggers.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-cream-200 text-coffee-800 px-2.5 py-1 text-xs font-medium"
                    >
                      {t}
                      <button
                        type="button"
                        className="text-coffee-600 hover:text-coffee-900"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            welcomeTriggers: settings.welcomeTriggers.filter((x) => x !== t),
                          })
                        }
                        disabled={!settings.welcomeAutoReply}
                        aria-label={`Remove ${t}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="helper">
                  Match is case-insensitive and "starts with" — so <b>hi</b> triggers on
                  &quot;hi there&quot; but not on &quot;please call hi&quot;.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.notifyOwnerWA} onChange={(e) => setSettings({ ...settings, notifyOwnerWA: e.target.checked })} className="accent-coffee-700" />
                Notify owner on new orders
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.notifyCustomerWA} onChange={(e) => setSettings({ ...settings, notifyCustomerWA: e.target.checked })} className="accent-coffee-700" />
                Customer notifications (master switch)
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-coffee-200 bg-white cursor-pointer">
                <input type="checkbox" checked={settings.enableSound} onChange={(e) => setSettings({ ...settings, enableSound: e.target.checked })} className="accent-coffee-700" />
                Play sound on new order
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-amber-300 bg-amber-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyOwnerInApp}
                  onChange={(e) => setSettings({ ...settings, notifyOwnerInApp: e.target.checked })}
                  className="accent-coffee-700"
                />
                <span>
                  Full-screen alert in WatShop Cafe Android app
                  <span className="block text-[11px] text-coffee-600 font-normal">
                    App rings + shows the order on a full-screen alert until you tap Accept or Dismiss.
                  </span>
                </span>
              </label>
            </div>

            <div className={`md:col-span-2 rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3 ${settings.notifyCustomerWA ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-coffee-900">Customer message moments</div>
                  <p className="helper">Pick which steps actually fire a WhatsApp to the customer. Off = silent for that step.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, notifyOnStatuses: [...DEFAULT_NOTIFY_STATUSES] })}
                  className="text-xs text-coffee-600 hover:text-coffee-900 underline underline-offset-4"
                >
                  Reset to defaults
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {NOTIFY_STATUSES.map((s) => {
                  const checked = settings.notifyOnStatuses.includes(s.key);
                  return (
                    <label
                      key={s.key}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                        checked ? 'border-coffee-300 bg-white' : 'border-coffee-200 bg-white/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!settings.notifyCustomerWA}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...settings.notifyOnStatuses, s.key]))
                            : settings.notifyOnStatuses.filter((x) => x !== s.key);
                          setSettings({ ...settings, notifyOnStatuses: next });
                        }}
                        className="accent-coffee-700 mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="font-semibold text-coffee-900 text-sm">{s.label}</span>
                        <span className="block text-[11px] text-coffee-600">{s.help}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-coffee-500">
                Tip: leave <b>Payment received</b> on — it's the combined message that delivers the invoice PDF and the review link from your settings.
              </p>
            </div>
          </div>
        )}

        {tab === 'payment' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.paymentEnabled} onChange={(e) => setSettings({ ...settings, paymentEnabled: e.target.checked })} className="accent-coffee-700" />
              Show "Pay Now" button to customers
            </div>

            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-white p-4">
              <div className="font-semibold text-coffee-900 mb-1">When does the customer pay?</div>
              <p className="helper mb-3">
                Postpaid sends a pay-link WhatsApp the moment you mark the order <b>Served</b> — handy for sit-down service.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  {
                    v: 'prepaid',
                    title: 'Pay before order served',
                    desc: 'Customer pays from the QR / pay page during the order. The "Send feedback" button on the order detail screen lets you fire the review link manually as the customer leaves.',
                  },
                  {
                    v: 'postpaid',
                    title: 'Pay after order served',
                    desc: 'When you mark the order Served, the bot WhatsApps the customer a payment link. After they pay, they automatically get the invoice + thank-you + review link in one message.',
                  },
                ].map((opt) => {
                  const active = settings.paymentTiming === opt.v;
                  return (
                    <label
                      key={opt.v}
                      className={`flex items-start gap-3 px-3 py-3 rounded-xl border cursor-pointer transition ${
                        active ? 'border-coffee-700 bg-cream-50 ring-2 ring-coffee-200' : 'border-coffee-200 bg-white hover:bg-cream-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentTiming"
                        checked={active}
                        onChange={() => setSettings({ ...settings, paymentTiming: opt.v as any })}
                        className="accent-coffee-700 mt-1"
                      />
                      <span className="min-w-0">
                        <span className="font-semibold text-coffee-900 text-sm">{opt.title}</span>
                        <span className="block text-[11px] text-coffee-600 mt-0.5">{opt.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Field l="UPI ID" v={settings.upiId} on={(v: string) => setSettings({ ...settings, upiId: v })} placeholder="cafe@hdfc" />
              <p className="helper">
                Format like <code>name@bank</code> — e.g. mocha@hdfcbank or 9876543210@paytm.
                <span className="block text-coffee-400">
                  जैसे <code>name@bank</code> — मतलब आपकी UPI ID। GPay/PhonePe/Paytm पर देख लें।
                </span>
              </p>
            </div>
            <Field l="UPI QR image URL" v={settings.upiQrUrl} on={(v: string) => setSettings({ ...settings, upiQrUrl: v })} placeholder="https://…" />
            <Field l="Note shown to customer" v={settings.paymentNote} on={(v: string) => setSettings({ ...settings, paymentNote: v })} multiline className="md:col-span-2" placeholder="Pay using any UPI app and submit txn ID" />
            <Field l="Google review URL" v={settings.googleReviewUrl} on={(v: string) => setSettings({ ...settings, googleReviewUrl: v })} placeholder="https://g.page/your-cafe/review" className="md:col-span-2" />

            <div className="md:col-span-2">
              <InvoiceTemplatePicker
                value={settings.invoiceTemplate}
                onChange={(v) => setSettings({ ...settings, invoiceTemplate: v })}
              />
            </div>

            <div className="md:col-span-2 rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3">
              <div className="font-semibold text-coffee-900 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Auto-verify UPI payments from Gmail
              </div>
              <p className="helper">
                Add the cafe's Gmail address + an{' '}
                <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">app password</a>{' '}
                that receives credit alerts from your bank/UPI app. The matcher already knows about Paytm,
                PhonePe, GPay, HDFC, Axis, SBI and ICICI — just paste the credentials and we'll handle the rest.
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

              {imapResult && (
                <div className={`rounded-xl border p-3 text-xs ${imapResult.ok ? 'border-coffee-200 bg-white' : 'border-rose-200 bg-rose-50'}`}>
                  {!imapResult.ok ? (
                    <div className="text-rose-700">
                      <div className="font-semibold">Connection failed</div>
                      <div className="mt-1 break-words">{imapResult.error}</div>
                      <div className="mt-2 text-coffee-600">
                        Tip: with 2-factor on, paste a 16-char Gmail{' '}
                        <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">app password</a>,
                        not the regular Gmail password.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-coffee-800">
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className="pill bg-emerald-100 text-emerald-800">Connected</span>
                        <span className={`pill text-[10px] ${imapResult.transport === 'relay' ? 'bg-amber-100 text-amber-800' : 'bg-coffee-100 text-coffee-700'}`}>
                          via {imapResult.transport === 'relay' ? 'PHP relay' : 'direct IMAP'}
                        </span>
                        {imapResult.inboxCount != null && (
                          <span className="text-coffee-600">INBOX: <b>{imapResult.inboxCount}</b></span>
                        )}
                        {imapResult.last24hCount != null && (
                          <span className="text-coffee-600">Last 24h: <b>{imapResult.last24hCount}</b></span>
                        )}
                        <span className={`text-coffee-700 ${imapResult.filteredCount === 0 ? 'text-rose-700 font-semibold' : ''}`}>
                          Credit alerts matched: <b>{imapResult.filteredCount}</b>
                        </span>
                      </div>
                      {imapResult.note && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                          {imapResult.note}
                        </div>
                      )}

                      {imapResult.filteredCount === 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                          The built-in matcher (Paytm / PhonePe / GPay / HDFC / Axis / SBI / ICICI + subjects:
                          paid · received · deposit · credit) found 0 hits in the last 24 hours. That's normal
                          if you haven't received a payment yet — once a customer pays, the next bank credit
                          alert in this inbox will be auto-matched.
                        </div>
                      )}

                      {imapResult.recent?.length > 0 && (
                        <div>
                          <div className="font-semibold text-coffee-900 mb-1">Recent senders (last 24h):</div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {imapResult.recent.map((r: any, i: number) => (
                              <div key={i} className="rounded-md border border-coffee-100 bg-cream-50 px-2 py-1.5">
                                <div className="font-mono text-[11px] text-coffee-900 truncate">{r.from || '(no sender)'}</div>
                                <div className="text-[11px] text-coffee-600 truncate">{r.subject || '(no subject)'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'loyalty' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-coffee-100 bg-cream-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-coffee-900 flex items-center gap-2">
                    <Star className="h-4 w-4 text-caramel-dark" /> Loyalty programme
                  </div>
                  <p className="helper">
                    Award points on paid online orders. Customers see their balance after they log in
                    on your cafe page. 1 point = 1 {form.currency || 'INR'}.
                    <span className="block text-coffee-400 mt-0.5">
                      हर paid order पर ग्राहक को points मिलते हैं। वो login करके अपना balance देख
                      सकते हैं। 1 point = 1 {form.currency || 'INR'}।
                    </span>
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={settings.loyaltyEnabled}
                    onChange={(e) => setSettings({ ...settings, loyaltyEnabled: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-coffee-800">{settings.loyaltyEnabled ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Earn rate (% of subtotal)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={settings.loyaltyPercent}
                    onChange={(e) => setSettings({ ...settings, loyaltyPercent: Number(e.target.value) })}
                    disabled={!settings.loyaltyEnabled}
                  />
                  <span className="text-sm text-coffee-700">%</span>
                </div>
                <p className="helper">
                  Example: at 5%, an order with subtotal ₹600 credits 30 points. Capped at 50%.
                  <span className="block text-coffee-400 mt-0.5">
                    जैसे 5% पर ₹600 के order पर 30 points मिलेंगे। ज़्यादा से ज़्यादा 50% तक रख सकते हैं।
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-cream-100 p-4">
                <div className="text-xs uppercase tracking-wide text-coffee-500">Preview</div>
                <div className="mt-1 font-display text-2xl font-bold text-coffee-900">
                  {settings.loyaltyEnabled
                    ? `${Math.round(600 * (settings.loyaltyPercent || 0) / 100)} pts`
                    : '— pts'}
                </div>
                <div className="text-xs text-coffee-600">on a ₹600 order</div>
              </div>
            </div>

            <div className="rounded-xl border border-coffee-100 bg-white p-3 text-xs text-coffee-600 leading-relaxed">
              Points credit automatically once the customer's payment is confirmed (paymentStatus = PAID).
              They never credit twice for the same order. View customer balances and the points ledger
              under <b>Loyalty</b> in the sidebar.
            </div>
          </div>
        )}

        {tab === 'branding' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 rounded-xl bg-cream-100 border border-coffee-100 p-3 text-sm leading-relaxed">
              <div className="text-coffee-800">
                These colours show on your cafe's customer-facing menu page.
              </div>
              <div className="text-coffee-600 text-[13px]">
                ये रंग आपके cafe के menu page पर ग्राहकों को दिखेंगे।
              </div>
            </div>
            <div>
              <label className="label">Primary colour</label>
              <Input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} className="h-12" />
              <p className="helper text-coffee-400">Buttons, headings — main colour</p>
            </div>
            <div>
              <label className="label">Accent colour</label>
              <Input type="color" value={settings.accentColor} onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })} className="h-12" />
              <p className="helper text-coffee-400">Highlights, prices — accent</p>
            </div>
            <p className="md:col-span-2 helper">
              Custom branding requires a Pro plan or higher.
              <span className="block text-coffee-400">अपने रंग सेट करने के लिए Pro plan ज़रूरी है।</span>
            </p>

            <div className="md:col-span-2 mt-2">
              <label className="label">Customer app theme</label>
              <p className="helper text-coffee-400 mb-3">Pick the colour theme for your customer ordering app (the dark glass UI customers see after scanning the QR).</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {APP_THEMES.map((t) => {
                  const active = settings.appTheme === t.k;
                  return (
                    <button
                      key={t.k}
                      type="button"
                      onClick={() => setSettings({ ...settings, appTheme: t.k })}
                      className={`relative rounded-2xl p-3 text-left border-2 transition ${active ? 'border-coffee-700' : 'border-transparent hover:border-coffee-200'}`}
                      style={{ background: t.bg }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full" style={{ background: t.accent }} />
                        <span className="h-4 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                      </div>
                      <div className="mt-3 text-sm font-semibold" style={{ color: t.text }}>{t.label}</div>
                      {active && (
                        <span className="absolute top-2 right-2 h-5 w-5 rounded-full grid place-items-center text-[11px] font-bold" style={{ background: t.accent, color: t.bg }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'domain' && <CustomDomainSection cafe={cafe} />}

        <div className="border-t border-coffee-100 pt-4 mt-6 flex justify-end sticky bottom-0 bg-cream-50/95 backdrop-blur md:static md:bg-transparent -mx-3 md:mx-0 px-3 md:px-0 py-3 md:py-0">
          <Button onClick={save} disabled={loading} size="lg" className="w-full md:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomDomainSection({ cafe }: { cafe: any }) {
  const initial = cafe.customDomain ?? '';
  const [host, setHost] = useState<string>(initial);
  const [status, setStatus] = useState<string | null>(cafe.customDomainStatus ?? null);
  const [note, setNote] = useState<string | null>(cafe.customDomainNote ?? null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const target = 'cafe.watshop.in'; // CNAME target for cafe owners
  const dirty = host.trim().toLowerCase() !== initial.toLowerCase();

  async function submit() {
    setBusy(true);
    const r = await fetch('/api/dashboard/settings/custom-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: host.trim() }),
    });
    const data = await r.json().catch(() => ({} as any));
    setBusy(false);
    if (!r.ok) {
      toast.error('Could not save', data.error ?? `HTTP ${r.status}`);
      return;
    }
    if (data.cleared) {
      setStatus(null); setNote(null);
      toast.success('Custom domain cleared');
      return;
    }
    setStatus(data.status ?? 'pending');
    setNote(null);
    toast.success('Request submitted', 'Add the CNAME below — we\'ll verify within 24h.');
  }

  async function clearDomain() {
    if (!confirm('Remove the custom domain request?')) return;
    setBusy(true);
    const r = await fetch('/api/dashboard/settings/custom-domain', { method: 'DELETE' });
    setBusy(false);
    if (r.ok) {
      setHost(''); setStatus(null); setNote(null);
      toast.success('Cleared');
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const statusPill = status === 'verified'
    ? <span className="pill bg-emerald-100 text-emerald-700"><Check className="h-3 w-3" /> Live</span>
    : status === 'failed'
      ? <span className="pill bg-rose-100 text-rose-700"><AlertCircle className="h-3 w-3" /> Rejected</span>
      : status === 'pending'
        ? <span className="pill-amber">Pending verification</span>
        : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-coffee-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-coffee-600" /> Custom domain
        </h3>
        <p className="helper">
          Serve your menu from your own domain — e.g. <b>menu.your-cafe.com</b> instead of cafe.watshop.in/cafe/your-slug.
          Free with any plan; we issue the SSL certificate.
          <span className="block text-coffee-400 mt-0.5">
            अपना खुद का domain (जैसे <b>menu.your-cafe.com</b>) use कर सकते हैं — किसी भी plan पर
            मुफ़्त। SSL certificate हम लगाएंगे।
          </span>
        </p>
      </div>

      <div className="rounded-2xl border border-coffee-200 bg-cream-50 p-4 space-y-3">
        <div>
          <label className="label">Your domain</label>
          <div className="flex gap-2">
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="menu.your-cafe.com"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button onClick={submit} disabled={busy || !dirty || host.trim().length < 4}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {initial ? 'Update' : 'Request'}
            </Button>
          </div>
          {status && (
            <div className="mt-2 flex items-center gap-2">
              {statusPill}
              {note && <span className="text-xs text-coffee-600">{note}</span>}
            </div>
          )}
        </div>

        {host && (
          <div className="rounded-xl border border-coffee-100 bg-white p-3 space-y-2">
            <div className="text-sm font-semibold text-coffee-900">Add this DNS record at your domain provider</div>
            <div className="grid grid-cols-[80px,1fr,1fr] gap-2 text-xs">
              <div className="font-semibold text-coffee-500 uppercase tracking-wider">Type</div>
              <div className="font-semibold text-coffee-500 uppercase tracking-wider">Host / Name</div>
              <div className="font-semibold text-coffee-500 uppercase tracking-wider">Value / Target</div>
              <div className="font-mono">CNAME</div>
              <div className="font-mono break-all">{host || 'menu.your-cafe.com'}</div>
              <div className="font-mono break-all flex items-center gap-1">
                {target}
                <button
                  type="button"
                  className="text-coffee-400 hover:text-coffee-700 ml-auto"
                  onClick={() => copy(target)}
                  title="Copy"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
            <p className="helper">
              Apex domains (no subdomain) won't work with CNAME — use a subdomain like
              <b> menu</b>, <b>order</b> or <b>shop</b>. Cloudflare users can flatten CNAME at the apex with "CNAME flattening".
            </p>
          </div>
        )}

        {status === 'verified' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Live at <a href={`https://${host}`} target="_blank" rel="noreferrer" className="font-semibold underline">https://{host}</a> — your store-link card now points here.
          </div>
        )}

        {status === 'pending' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            We'll verify the CNAME and issue an SSL cert within 24 hours. You'll get a notification when it goes live.
          </div>
        )}

        {initial && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearDomain}
              disabled={busy}
              className="text-xs text-coffee-500 hover:text-rose-600 underline"
            >
              Remove custom domain
            </button>
          </div>
        )}
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

interface TplOpt { key: string; name: string; blurb: string; preview: React.ReactNode; }
const TEMPLATE_OPTIONS: TplOpt[] = [
  { key: 'classic', name: 'Classic', blurb: 'Coffee + cream brand colours', preview: <ThumbClassic /> },
  { key: 'modern',  name: 'Modern',  blurb: 'Teal accent stripe, sans-serif', preview: <ThumbModern /> },
  { key: 'minimal', name: 'Minimal', blurb: 'Black-and-white, ultra-clean', preview: <ThumbMinimal /> },
  { key: 'receipt', name: 'Receipt', blurb: 'Thermal-printer style (80mm)', preview: <ThumbReceipt /> },
  { key: 'elegant', name: 'Elegant', blurb: 'Italic accents, serif', preview: <ThumbElegant /> },
  { key: 'bold',    name: 'Bold',    blurb: 'Charcoal block + amber accent', preview: <ThumbBold /> },
];

function InvoiceTemplatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-coffee-200 bg-cream-50 p-4">
      <div className="font-semibold text-coffee-900 mb-1">Invoice template</div>
      <p className="helper mb-3">
        The PDF style your customer receives on WhatsApp after a successful payment. Saved on Save changes.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {TEMPLATE_OPTIONS.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`text-left rounded-xl border p-2 transition active:scale-[0.99] ${
                active ? 'border-coffee-700 bg-white ring-2 ring-coffee-200' : 'border-coffee-200 bg-white hover:bg-cream-100'
              }`}
            >
              <div className="aspect-[5/7] rounded-md overflow-hidden bg-cream-100 grid place-items-center">
                {t.preview}
              </div>
              <div className="mt-2 px-1">
                <div className="text-sm font-semibold text-coffee-900 flex items-center justify-between">
                  {t.name}
                  {active && <span className="pill text-[9px] bg-coffee-700 text-cream-50">Active</span>}
                </div>
                <div className="text-[10px] text-coffee-500">{t.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// SVG mock-up thumbnails — not pixel-perfect renders of the PDF, just
// "vibe" representations so the cafe owner can pick visually.
function ThumbClassic() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#FFFBF5" />
      <text x="8" y="18" fontSize="9" fontWeight="bold" fill="#6B4E3D" fontFamily="serif">Cafe Mocha</text>
      <line x1="8" y1="26" x2="92" y2="26" stroke="#E8D5BE" strokeDasharray="2 2" />
      <text x="8" y="38" fontSize="6" fill="#85604A">Receipt #1234</text>
      <rect x="8" y="48" width="84" height="0.6" fill="#E8D5BE" />
      <g fontSize="5" fill="#3E2D24">
        <text x="8" y="58">Cappuccino</text><text x="86" y="58" textAnchor="end">₹180</text>
        <text x="8" y="68">Latte</text><text x="86" y="68" textAnchor="end">₹200</text>
        <text x="8" y="78">Croissant</text><text x="86" y="78" textAnchor="end">₹150</text>
      </g>
      <line x1="8" y1="90" x2="92" y2="90" stroke="#E8D5BE" />
      <text x="8" y="102" fontSize="7" fontWeight="bold" fill="#3E2D24">Total</text>
      <text x="92" y="102" textAnchor="end" fontSize="7" fontWeight="bold" fill="#3E2D24">₹530</text>
      <rect x="8" y="110" width="22" height="8" rx="2" fill="#DCFCE7" />
      <text x="19" y="116" textAnchor="middle" fontSize="5" fill="#166534" fontWeight="bold">PAID</text>
    </svg>
  );
}
function ThumbModern() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#fff" />
      <rect width="100" height="28" fill="#0F766E" />
      <text x="8" y="18" fontSize="9" fontWeight="bold" fill="#fff">Cafe Mocha</text>
      <text x="92" y="14" textAnchor="end" fontSize="6" fill="#A7F3D0">RECEIPT</text>
      <text x="92" y="22" textAnchor="end" fontSize="5" fill="#fff">#1234</text>
      <g fontSize="5" fill="#0F172A">
        <text x="8" y="48" fill="#64748B">ITEM</text><text x="92" y="48" textAnchor="end" fill="#64748B">AMOUNT</text>
        <line x1="8" y1="52" x2="92" y2="52" stroke="#0F766E" />
        <text x="8" y="62">Cappuccino</text><text x="92" y="62" textAnchor="end">₹180</text>
        <text x="8" y="72">Latte</text><text x="92" y="72" textAnchor="end">₹200</text>
        <text x="8" y="82">Croissant</text><text x="92" y="82" textAnchor="end">₹150</text>
      </g>
      <line x1="8" y1="94" x2="92" y2="94" stroke="#E2E8F0" />
      <text x="8" y="106" fontSize="8" fontWeight="bold">Total</text>
      <text x="92" y="106" textAnchor="end" fontSize="8" fontWeight="bold">₹530</text>
      <rect x="8" y="114" width="22" height="8" rx="2" fill="#0F766E" />
      <text x="19" y="120" textAnchor="middle" fontSize="5" fill="#fff" fontWeight="bold">PAID</text>
    </svg>
  );
}
function ThumbMinimal() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#fff" />
      <text x="8" y="14" fontSize="6" fontWeight="bold" fill="#000" letterSpacing="2">CAFE MOCHA</text>
      <line x1="8" y1="22" x2="92" y2="22" stroke="#000" strokeWidth="0.4" />
      <text x="8" y="32" fontSize="5" fill="#000">Receipt #1234</text>
      <text x="92" y="32" textAnchor="end" fontSize="5" fill="#000">Table 4</text>
      <line x1="8" y1="38" x2="92" y2="38" stroke="#000" strokeWidth="0.4" />
      <g fontSize="5" fill="#000">
        <text x="8" y="50">Cappuccino</text><text x="92" y="50" textAnchor="end">₹180</text>
        <text x="8" y="60">Latte</text><text x="92" y="60" textAnchor="end">₹200</text>
        <text x="8" y="70">Croissant</text><text x="92" y="70" textAnchor="end">₹150</text>
      </g>
      <line x1="8" y1="84" x2="92" y2="84" stroke="#000" strokeWidth="0.4" />
      <text x="8" y="96" fontSize="7" fontWeight="bold">Total</text>
      <text x="92" y="96" textAnchor="end" fontSize="7" fontWeight="bold">₹530</text>
      <text x="8" y="112" fontSize="6" fontWeight="bold">PAID</text>
    </svg>
  );
}
function ThumbReceipt() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#FFFBF5" />
      <rect x="30" y="6" width="40" height="128" fill="#fff" stroke="#E2E8F0" />
      <text x="50" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#000">CAFE MOCHA</text>
      <text x="50" y="26" textAnchor="middle" fontSize="3.5" fill="#444">Brigade Rd · 9876543210</text>
      <text x="50" y="36" textAnchor="middle" fontSize="3.5">- - - - - - - - -</text>
      <g fontSize="3.5" fill="#000" fontFamily="monospace">
        <text x="32" y="46">Cappuccino  1  ₹180</text>
        <text x="32" y="54">Latte       1  ₹200</text>
        <text x="32" y="62">Croissant   1  ₹150</text>
      </g>
      <text x="50" y="72" textAnchor="middle" fontSize="3.5">- - - - - - - - -</text>
      <text x="32" y="82" fontSize="4" fontFamily="monospace" fontWeight="bold">TOTAL    ₹530.00</text>
      <text x="50" y="98" textAnchor="middle" fontSize="5" fontWeight="bold">* * PAID * *</text>
      <text x="50" y="116" textAnchor="middle" fontSize="3.5" fill="#666">Thank you!</text>
    </svg>
  );
}
function ThumbElegant() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#fff" />
      <text x="8" y="22" fontSize="14" fontStyle="italic" fill="#8B6F47" fontFamily="serif">Cafe Mocha</text>
      <text x="8" y="32" fontSize="4.5" fill="#7A6E63" fontFamily="serif">12 Brigade Rd · 9876543210</text>
      <line x1="8" y1="40" x2="92" y2="40" stroke="#8B6F47" strokeWidth="0.3" />
      <text x="8" y="52" fontSize="5" fontStyle="italic" fill="#7A6E63" fontFamily="serif">Receipt</text>
      <text x="8" y="62" fontSize="6" fill="#1A1A1A" fontFamily="serif">#1234</text>
      <g fontSize="5" fill="#1A1A1A" fontFamily="serif">
        <text x="8" y="78">Cappuccino</text><text x="92" y="78" textAnchor="end">₹180</text>
        <text x="8" y="88">Latte</text><text x="92" y="88" textAnchor="end">₹200</text>
        <text x="8" y="98">Croissant</text><text x="92" y="98" textAnchor="end">₹150</text>
      </g>
      <line x1="8" y1="106" x2="92" y2="106" stroke="#8B6F47" strokeWidth="0.3" />
      <text x="8" y="118" fontSize="7" fontWeight="bold" fontFamily="serif">Total</text>
      <text x="92" y="118" textAnchor="end" fontSize="7" fontWeight="bold" fontFamily="serif">₹530</text>
      <text x="50" y="132" textAnchor="middle" fontSize="5" fontStyle="italic" fill="#8B6F47" fontFamily="serif">— Paid with thanks —</text>
    </svg>
  );
}
function ThumbBold() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <rect width="100" height="140" fill="#fff" />
      <rect width="100" height="44" fill="#0F172A" />
      <rect y="44" width="100" height="2" fill="#F59E0B" />
      <text x="8" y="18" fontSize="11" fontWeight="bold" fill="#fff">Cafe Mocha</text>
      <text x="8" y="30" fontSize="5" fill="#F59E0B" letterSpacing="1.5">RECEIPT</text>
      <text x="8" y="38" fontSize="4.5" fill="#fff">#1234 · 26 Apr 2026</text>
      <g fontSize="5" fill="#0F172A">
        <text x="8" y="60" fill="#64748B">ITEM</text>
        <text x="92" y="60" textAnchor="end" fill="#64748B">AMOUNT</text>
        <line x1="8" y1="64" x2="92" y2="64" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="8" y="74" fontWeight="bold">Cappuccino</text><text x="92" y="74" textAnchor="end">₹180</text>
        <text x="8" y="84" fontWeight="bold">Latte</text><text x="92" y="84" textAnchor="end">₹200</text>
        <text x="8" y="94" fontWeight="bold">Croissant</text><text x="92" y="94" textAnchor="end">₹150</text>
      </g>
      <line x1="8" y1="102" x2="92" y2="102" stroke="#E2E8F0" />
      <text x="8" y="114" fontSize="9" fontWeight="bold">TOTAL</text>
      <text x="92" y="114" textAnchor="end" fontSize="9" fontWeight="bold">₹530</text>
      <rect x="8" y="120" width="84" height="12" fill="#F59E0B" />
      <text x="50" y="129" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0F172A" letterSpacing="2">PAID</text>
    </svg>
  );
}

/** Phone input with a country-code prefix prefilled from the cafe's country
 *  setting. We persist a digits-only national number; the dial code is added
 *  at send-time by `normalizePhone`. */
function PhoneInput({ iso, value, onChange }: { iso: string; value: string; onChange: (v: string) => void }) {
  const dial = COUNTRY_DIAL[(iso ?? 'IN').toUpperCase()] ?? '91';
  return (
    <div className="flex">
      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-coffee-200 bg-cream-100 text-sm text-coffee-700 font-mono">
        +{dial}
      </span>
      <Input
        type="tel"
        inputMode="tel"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        placeholder="9876543210"
        className="rounded-l-none"
      />
    </div>
  );
}
