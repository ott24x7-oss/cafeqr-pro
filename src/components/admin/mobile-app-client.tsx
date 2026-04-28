'use client';

// Mobile App Settings — drives the Android companion app's runtime config.
// Same upload/storage shape as Frontend Branding (base64 data URLs in
// Postgres) but with a 2 MB ceiling per image because app logos and splash
// art are larger than marketing logos. The values are exposed publicly
// through /api/mobile-app/config; this admin page never displays the
// public asset URL — instead the previews render the in-flight data URL so
// you can see the new image before saving.

import { useState } from 'react';
import {
  Save, Loader2, Upload, RotateCcw, Image as ImageIcon, Palette, Smartphone, Wrench,
  AlertTriangle, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

const IMG_MAX_BYTES = 2 * 1024 * 1024;
// 1.5 MB raw → ~2 MB encoded (base64 ≈ 4/3 of source). Block clearly oversize
// uploads in the browser before we ship them.
const RAW_SOFT_CAP = 1_500_000;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface Initial {
  appName: string;
  logoData: string;
  splashLogoData: string;
  splashBackgroundColor: string;
  primaryColor: string;
  tagline: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  forceUpdate: boolean;
  minimumVersionCode: number;
  amazonAppstoreUrl: string;
  playStoreUrl: string;
}

export function MobileAppClient({ initial }: { initial: Initial }) {
  const [form, setForm] = useState<Initial>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSplash, setUploadingSplash] = useState(false);

  async function pickImage(
    file: File,
    setBusy: (v: boolean) => void,
    apply: (dataUrl: string) => void,
  ) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported image', 'Use PNG, JPEG or WebP.');
      return;
    }
    if (file.size > RAW_SOFT_CAP) {
      toast.error('Image too large', `Keep under ~${Math.round(RAW_SOFT_CAP / 1024)} KB so it fits the 2 MB encoded limit.`);
      return;
    }
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      if (dataUrl.length > IMG_MAX_BYTES) {
        toast.error('Encoded image too large', `${Math.round(dataUrl.length / 1024)} KB exceeds 2 MB limit.`);
        return;
      }
      apply(dataUrl);
    } catch (e: any) {
      toast.error('Could not read file', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/mobile-app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({} as any));
      if (r.ok) {
        toast.success('Mobile app config saved', 'New installs and next-launch users will pick it up within ~60 s.');
      } else {
        toast.error('Save failed', data.error ?? `HTTP ${r.status}`);
      }
    } catch (e: any) {
      toast.error('Save failed', e?.message ?? '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 flex items-center gap-2">
          <Smartphone className="h-6 w-6" /> Mobile App Settings
        </h1>
        <p className="text-coffee-600 text-sm">
          Branding, splash and remote-control flags consumed by the Android companion app
          (<code>com.watshop.cafe</code>). Values are exposed at <code>/api/mobile-app/config</code>.
        </p>
      </div>

      <div className="card-warm space-y-6">
        {/* Identity */}
        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">App name</label>
            <Input
              value={form.appName}
              onChange={(e) => setForm({ ...form, appName: e.target.value })}
              placeholder="WatShop Cafe"
              maxLength={80}
            />
            <p className="helper">Shown on the Android splash screen and as the app's display name fallback.</p>
          </div>
          <div>
            <label className="label">Tagline</label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="QR Ordering for Cafes"
              maxLength={160}
            />
            <p className="helper">Optional one-liner under the splash logo.</p>
          </div>
        </section>

        {/* Logo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <ImageIcon className="h-4 w-4" /> App logo
          </div>
          <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
            <div className="rounded-2xl border border-dashed border-coffee-200 bg-cream-50 h-[120px] flex items-center justify-center overflow-hidden">
              {form.logoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoData} alt="App logo preview" className="max-h-[110px] max-w-[170px] object-contain" />
              ) : (
                <span className="text-xs text-coffee-500">No logo set</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickImage(f, setUploadingLogo, (dataUrl) => setForm({ ...form, logoData: dataUrl }));
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose image
                </span>
              </label>
              {form.logoData && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, logoData: '' })}>
                  <RotateCcw className="h-4 w-4" /> Clear
                </Button>
              )}
              <p className="helper">PNG / JPEG / WebP, ≤ 2 MB encoded. Square images render best.</p>
            </div>
          </div>
        </section>

        {/* Splash logo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <ImageIcon className="h-4 w-4" /> Splash logo
          </div>
          <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
            <div
              className="rounded-2xl h-[120px] flex items-center justify-center overflow-hidden"
              style={{ background: form.splashBackgroundColor || '#0B0F14' }}
            >
              {form.splashLogoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.splashLogoData} alt="Splash logo preview" className="max-h-[110px] max-w-[170px] object-contain" />
              ) : (
                <span className="text-xs text-white/70">No splash logo</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickImage(f, setUploadingSplash, (dataUrl) => setForm({ ...form, splashLogoData: dataUrl }));
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploadingSplash ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose image
                </span>
              </label>
              {form.splashLogoData && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, splashLogoData: '' })}>
                  <RotateCcw className="h-4 w-4" /> Clear
                </Button>
              )}
              <p className="helper">Centered on the splash screen. Use a transparent PNG that contrasts with the splash background.</p>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-coffee-900">
              <Palette className="h-4 w-4" /> Splash background
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.splashBackgroundColor) ? form.splashBackgroundColor : '#0B0F14'}
                onChange={(e) => setForm({ ...form, splashBackgroundColor: e.target.value })}
                className="h-11 w-14 rounded-xl border border-coffee-200 bg-white cursor-pointer"
                aria-label="Pick splash background color"
              />
              <Input
                value={form.splashBackgroundColor}
                onChange={(e) => setForm({ ...form, splashBackgroundColor: e.target.value })}
                placeholder="#0B0F14"
                maxLength={9}
                className="max-w-[180px] font-mono"
              />
            </div>
            <p className="helper">Solid color behind the splash logo.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-coffee-900">
              <Palette className="h-4 w-4" /> Primary color
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : '#22C55E'}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-11 w-14 rounded-xl border border-coffee-200 bg-white cursor-pointer"
                aria-label="Pick primary color"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                placeholder="#22C55E"
                maxLength={9}
                className="max-w-[180px] font-mono"
              />
            </div>
            <p className="helper">Drives the progress bar, retry buttons and accents inside the app.</p>
          </div>
        </section>

        {/* Maintenance */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <Wrench className="h-4 w-4" /> Maintenance mode
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
              className="h-4 w-4 accent-coffee-700"
            />
            Enable maintenance screen — blocks the WebView and shows the message below.
          </label>
          <Input
            value={form.maintenanceMessage}
            onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
            placeholder="App is under maintenance. Please try again later."
            maxLength={500}
          />
        </section>

        {/* Force update */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <AlertTriangle className="h-4 w-4" /> Force update
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.forceUpdate}
              onChange={(e) => setForm({ ...form, forceUpdate: e.target.checked })}
              className="h-4 w-4 accent-coffee-700"
            />
            Require users below the minimum version to update before they can use the app.
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Minimum versionCode</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.minimumVersionCode}
                onChange={(e) => setForm({ ...form, minimumVersionCode: Math.max(1, Number(e.target.value) || 1) })}
                className="max-w-[200px]"
              />
              <p className="helper">Bump this each time you publish a build that older clients must abandon.</p>
            </div>
            <div>
              <label className="label">Amazon Appstore URL <span className="text-coffee-500 text-[10px] font-normal">(primary)</span></label>
              <Input
                value={form.amazonAppstoreUrl}
                onChange={(e) => setForm({ ...form, amazonAppstoreUrl: e.target.value })}
                placeholder="https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe"
                maxLength={500}
              />
              <p className="helper">
                Used by the force-update screen on Fire OS / Amazon-installed builds.
                Web URL or <code>amzn://apps/android?p=…</code> URI both work.
              </p>
              {form.amazonAppstoreUrl && (
                <a
                  href={form.amazonAppstoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-coffee-700 hover:underline mt-1"
                >
                  <ExternalLink className="h-3 w-3" /> Test link
                </a>
              )}
            </div>
            <div>
              <label className="label">Play Store URL <span className="text-coffee-500 text-[10px] font-normal">(secondary)</span></label>
              <Input
                value={form.playStoreUrl}
                onChange={(e) => setForm({ ...form, playStoreUrl: e.target.value })}
                placeholder="https://play.google.com/store/apps/details?id=com.watshop.cafe"
                maxLength={500}
              />
              <p className="helper">Used when the build was installed via Google Play.</p>
              {form.playStoreUrl && (
                <a
                  href={form.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-coffee-700 hover:underline mt-1"
                >
                  <ExternalLink className="h-3 w-3" /> Test link
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-coffee-100 pt-4 flex justify-end">
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
