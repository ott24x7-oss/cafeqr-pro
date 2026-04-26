'use client';

import { useState } from 'react';
import {
  Save, Loader2, Eye, EyeOff, Send, Globe, Mail, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

const SENTINEL = '__unchanged__';

type Tab = 'branding' | 'email' | 'content';

export function SiteSettingsClient({ initial }: { initial: any }) {
  const [tab, setTab] = useState<Tab>('branding');
  const [form, setForm] = useState({
    siteName: initial.siteName ?? 'CafeQR Pro',
    tagline: initial.tagline ?? '',
    supportEmail: initial.supportEmail ?? '',
    smtpHost: initial.smtpHost ?? '',
    smtpPort: initial.smtpPort ?? 587,
    smtpUser: initial.smtpUser ?? '',
    smtpPass: initial.smtpPass ?? '',
    smtpFrom: initial.smtpFrom ?? '',
  });
  const [contentText, setContentText] = useState(
    JSON.stringify(initial.content ?? defaultContent(), null, 2)
  );
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState<'verify' | 'send' | null>(null);

  async function save() {
    setSaving(true);
    let parsedContent: any = null;
    try {
      parsedContent = JSON.parse(contentText);
    } catch (e: any) {
      setSaving(false);
      toast.error('Content JSON invalid', e?.message ?? '');
      return;
    }
    const r = await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteName: form.siteName,
        tagline: form.tagline || null,
        supportEmail: form.supportEmail || null,
        smtpHost: form.smtpHost || null,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
        smtpUser: form.smtpUser || null,
        smtpPass: form.smtpPass,        // SENTINEL leaves it alone, '' clears
        smtpFrom: form.smtpFrom || null,
        content: parsedContent,
      }),
    });
    setSaving(false);
    if (r.ok) {
      toast.success('Saved');
    } else {
      const data = await r.json().catch(() => ({} as any));
      toast.error('Save failed', data.error ?? '');
    }
  }

  async function testSmtp(action: 'verify' | 'send') {
    setSmtpTesting(action);
    // Save first so the test endpoint sees the latest creds.
    await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpHost: form.smtpHost || null,
        smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
        smtpUser: form.smtpUser || null,
        smtpPass: form.smtpPass,
        smtpFrom: form.smtpFrom || null,
      }),
    });
    const r = await fetch('/api/admin/site-settings/test-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await r.json().catch(() => ({} as any));
    setSmtpTesting(null);
    if (data.ok) {
      toast.success(
        action === 'verify' ? 'SMTP credentials OK' : `Test sent via ${data.transport}`,
        action === 'send' && data.to ? `to ${data.to}` : ''
      );
    } else {
      toast.error('SMTP test failed', data.error ?? '');
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Site settings</h1>
        <p className="text-coffee-600 text-sm">Branding, email transport, marketing copy. Affects every cafe.</p>
      </div>

      <div className="card-warm">
        <div className="flex flex-wrap gap-2 border-b border-coffee-100 pb-3 mb-4 overflow-x-auto">
          {[
            { k: 'branding', l: 'Branding', i: Globe },
            { k: 'email', l: 'Email / SMTP', i: Mail },
            { k: 'content', l: 'Site content', i: FileText },
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

        {tab === 'branding' && (
          <div className="grid md:grid-cols-2 gap-4">
            <Field l="Site name" v={form.siteName} on={(v: string) => setForm({ ...form, siteName: v })} />
            <Field l="Tagline (optional)" v={form.tagline} on={(v: string) => setForm({ ...form, tagline: v })} placeholder="QR ordering for cafes & restaurants" />
            <Field l="Support email" v={form.supportEmail} on={(v: string) => setForm({ ...form, supportEmail: v })} placeholder="support@cafeqr.pro" className="md:col-span-2" />
          </div>
        )}

        {tab === 'email' && (
          <div className="grid md:grid-cols-2 gap-4">
            <p className="md:col-span-2 helper">
              Used for password-reset emails and any other system mail. Falls back to SMTP env vars
              and finally the PHP relay if these aren't set.
            </p>
            <Field l="SMTP host" v={form.smtpHost} on={(v: string) => setForm({ ...form, smtpHost: v })} placeholder="smtp.gmail.com" />
            <Field l="SMTP port" v={form.smtpPort} on={(v: string) => setForm({ ...form, smtpPort: Number(v) })} type="number" placeholder="587" />
            <Field l="SMTP user" v={form.smtpUser} on={(v: string) => setForm({ ...form, smtpUser: v })} placeholder="ensofter@gmail.com" />
            <div>
              <label className="label">SMTP password / app password</label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.smtpPass === SENTINEL ? '••••••••••••' : form.smtpPass}
                  onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                  onFocus={() => { if (form.smtpPass === SENTINEL) setForm({ ...form, smtpPass: '' }); }}
                  placeholder="abcd efgh ijkl mnop"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-coffee-500 hover:text-coffee-900"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="helper">Encrypted at rest. Use a Gmail app password if you're on a Google account.</p>
            </div>
            <Field l="From address" v={form.smtpFrom} on={(v: string) => setForm({ ...form, smtpFrom: v })} placeholder="CafeQR Pro <no-reply@cafeqr.pro>" className="md:col-span-2" />

            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2 border-t border-coffee-100">
              <Button onClick={() => testSmtp('verify')} variant="outline" size="sm" disabled={smtpTesting !== null}>
                {smtpTesting === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Verify connection
              </Button>
              <Button onClick={() => testSmtp('send')} variant="outline" size="sm" disabled={smtpTesting !== null}>
                {smtpTesting === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test email
              </Button>
            </div>
          </div>
        )}

        {tab === 'content' && (
          <div className="space-y-3">
            <p className="helper">
              Free-form JSON. The marketing pages can read these keys (e.g. <code>hero.headline</code>,
              <code>hero.sub</code>, <code>footer.note</code>) — edit here and the public site picks
              them up on next request, no redeploy.
            </p>
            <Textarea
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="font-mono text-xs min-h-[260px]"
            />
          </div>
        )}

        <div className="border-t border-coffee-100 pt-4 mt-6 flex justify-end">
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function defaultContent() {
  return {
    hero: {
      headline: 'Run a cafe? Stop juggling printers.',
      sub: 'QR menu, live orders, payments and WhatsApp updates — in one place.',
      cta: 'Start free trial',
    },
    footer: { note: '© CafeQR Pro' },
    faq: [],
  };
}

function Field({ l, v, on, type = 'text', placeholder, className }: any) {
  return (
    <div className={className}>
      <label className="label">{l}</label>
      <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
