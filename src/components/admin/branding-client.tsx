'use client';

// Frontend Branding admin tab. Uploads convert to base64 data URLs in the
// browser so the server never deals with multipart and storage stays in a
// single Postgres row. The runtime patcher at /js/branding.js applies the
// saved values to every public/marketing page on next load — admin chrome
// is intentionally left alone. App-mockup fields (icon, splash, APK URLs)
// are read server-side by the landing page so they render with no flash.

import { useState } from 'react';
import { Save, Loader2, Upload, RotateCcw, Image as ImageIcon, Palette, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

const LOGO_MAX_BYTES = 614400;     // logo + app icon — keep in sync with API
const SPLASH_MAX_BYTES = 1258291;  // splash gets a larger cap
const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];

interface Initial {
  logoDataUrl: string;
  brandName: string;
  tagline: string;
  footerText: string;
  primaryColor: string;
  appIconDataUrl: string;
  splashImageDataUrl: string;
  apkUrlGoogle: string;
  apkUrlAmazon: string;
}

type ImageField = 'logoDataUrl' | 'appIconDataUrl' | 'splashImageDataUrl';

export function BrandingClient({ initial }: { initial: Initial }) {
  const [form, setForm] = useState<Initial>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageField | null>(null);

  async function pickImage(file: File, field: ImageField, max: number) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported image', 'Use SVG, PNG, JPEG or WebP.');
      return;
    }
    // Soft-cap raw bytes so the base64 result stays under the API limit
    // (base64 ~= 4/3 of source).
    const rawCap = Math.floor(max * 0.75);
    if (file.size > rawCap) {
      toast.error('Image too large', `Keep under ~${Math.round(rawCap / 1024)} KB.`);
      return;
    }
    setUploading(field);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      if (dataUrl.length > max) {
        toast.error('Encoded image too large', `${Math.round(dataUrl.length / 1024)} KB exceeds limit.`);
        return;
      }
      setForm({ ...form, [field]: dataUrl });
    } catch (e: any) {
      toast.error('Could not read file', e?.message ?? '');
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({} as any));
      if (r.ok) {
        toast.success('Branding saved', 'Public site updates within ~60 s.');
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
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Frontend Branding</h1>
        <p className="text-coffee-600 text-sm">
          Override the logo, brand name, tagline, footer note, primary color, app icon,
          splash screen and APK download links shown on the WatShop Cafe marketing site
          (cafe.watshop.in). Per-cafe branding is unaffected.
        </p>
      </div>

      <div className="card-warm space-y-6">
        {/* Logo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <ImageIcon className="h-4 w-4" /> Logo
          </div>
          <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
            <div className="rounded-2xl border border-dashed border-coffee-200 bg-cream-50 h-[120px] flex items-center justify-center overflow-hidden">
              {form.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoDataUrl} alt="Brand logo preview" className="max-h-[110px] max-w-[170px] object-contain" />
              ) : (
                <span className="text-xs text-coffee-500">No custom logo</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickImage(f, 'logoDataUrl', LOGO_MAX_BYTES);
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploading === 'logoDataUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose image
                </span>
              </label>
              {form.logoDataUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, logoDataUrl: '' })}>
                  <RotateCcw className="h-4 w-4" /> Use default
                </Button>
              )}
              <p className="helper">SVG, PNG, JPEG or WebP. Max ~450 KB raw / 600 KB encoded.</p>
            </div>
          </div>
        </section>

        {/* Text fields */}
        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Brand name</label>
            <Input
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="WatShop Cafe"
              maxLength={80}
            />
            <p className="helper">Replaces text inside <code>[data-brand-name]</code> elements.</p>
          </div>
          <div>
            <label className="label">Tagline</label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="QR ordering for cafes & restaurants"
              maxLength={200}
            />
            <p className="helper">Replaces text inside <code>[data-brand-tagline]</code>.</p>
          </div>
          <div className="md:col-span-2">
            <label className="label">Footer text</label>
            <Input
              value={form.footerText}
              onChange={(e) => setForm({ ...form, footerText: e.target.value })}
              placeholder="© WatShop Cafe — Brewed with care."
              maxLength={200}
            />
            <p className="helper">Replaces text inside <code>[data-brand-footer]</code> (e.g. footer copyright).</p>
          </div>
        </section>

        {/* Color */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <Palette className="h-4 w-4" /> Primary color
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor && /^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : '#6B4E3D'}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              className="h-11 w-14 rounded-xl border border-coffee-200 bg-white cursor-pointer"
              aria-label="Pick primary color"
            />
            <Input
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              placeholder="#6B4E3D"
              maxLength={9}
              className="max-w-[180px] font-mono"
            />
            {form.primaryColor && (
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, primaryColor: '' })}>
                Clear
              </Button>
            )}
          </div>
          <p className="helper">
            Sets the CSS variable <code>--brand-primary</code> on <code>:root</code> and tints any element with
            <code> [data-brand-color]</code>.
          </p>
        </section>

        {/* App showcase — icon + splash + APK URLs (rendered on landing page) */}
        <section className="space-y-4 border-t border-coffee-100 pt-5">
          <div className="flex items-center gap-2 font-semibold text-coffee-900">
            <Smartphone className="h-4 w-4" /> Mobile app showcase
          </div>
          <p className="text-xs text-coffee-600 -mt-2">
            Renders on the marketing landing page next to the APK download buttons.
            Leave any field blank to fall back to defaults / hide the element.
          </p>

          {/* App icon */}
          <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
            <div className="rounded-2xl border border-dashed border-coffee-200 bg-cream-50 h-[140px] flex items-center justify-center overflow-hidden">
              {form.appIconDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.appIconDataUrl} alt="App icon preview" className="h-[120px] w-[120px] object-contain rounded-3xl" />
              ) : (
                <span className="text-xs text-coffee-500 text-center px-2">No custom app icon<br/>(uses default mark)</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-coffee-900 text-sm">App icon</div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickImage(f, 'appIconDataUrl', LOGO_MAX_BYTES);
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploading === 'appIconDataUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose icon
                </span>
              </label>
              {form.appIconDataUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, appIconDataUrl: '' })}>
                  <RotateCcw className="h-4 w-4" /> Use default
                </Button>
              )}
              <p className="helper">Square, ~512×512. PNG / WebP recommended. Max ~450 KB raw.</p>
            </div>
          </div>

          {/* Splash */}
          <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
            <div className="rounded-2xl border border-dashed border-coffee-200 bg-cream-50 h-[200px] flex items-center justify-center overflow-hidden">
              {form.splashImageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.splashImageDataUrl} alt="Splash preview" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-coffee-500 text-center px-2">No custom splash<br/>(uses gradient fallback)</span>
              )}
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-coffee-900 text-sm">Splash screen</div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickImage(f, 'splashImageDataUrl', SPLASH_MAX_BYTES);
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploading === 'splashImageDataUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose splash
                </span>
              </label>
              {form.splashImageDataUrl && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, splashImageDataUrl: '' })}>
                  <RotateCcw className="h-4 w-4" /> Use default
                </Button>
              )}
              <p className="helper">Tall, ~1080×1920 (9:16). PNG / WebP. Max ~900 KB raw.</p>
            </div>
          </div>

          {/* APK URLs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <Download className="h-3 w-3 inline -mt-0.5 mr-1" /> Google APK URL
              </label>
              <Input
                value={form.apkUrlGoogle}
                onChange={(e) => setForm({ ...form, apkUrlGoogle: e.target.value })}
                placeholder="/downloads/app-google-debug.apk"
                maxLength={500}
              />
              <p className="helper">
                Path or full URL where the Google Play / generic Android APK is hosted.
                Self-hosted: place the file under <code>public/downloads/</code>.
                Leave blank to hide the Google download button.
              </p>
            </div>
            <div>
              <label className="label">
                <Download className="h-3 w-3 inline -mt-0.5 mr-1" /> Amazon APK URL
              </label>
              <Input
                value={form.apkUrlAmazon}
                onChange={(e) => setForm({ ...form, apkUrlAmazon: e.target.value })}
                placeholder="/downloads/app-amazon-debug.apk"
                maxLength={500}
              />
              <p className="helper">
                Path or full URL for the Amazon Appstore / Fire devices variant.
                Leave blank to hide the Amazon download button.
              </p>
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
