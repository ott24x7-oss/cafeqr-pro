'use client';

// Frontend Branding admin tab. Uploads convert to base64 data URLs in the
// browser so the server never deals with multipart and storage stays in a
// single Postgres row. The runtime patcher at /js/branding.js applies the
// saved values to every public/marketing page on next load — admin chrome
// is intentionally left alone.

import { useState } from 'react';
import { Save, Loader2, Upload, RotateCcw, Image as ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

const LOGO_MAX_BYTES = 614400; // keep in lockstep with the API guard
const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];

interface Initial {
  logoDataUrl: string;
  brandName: string;
  tagline: string;
  footerText: string;
  primaryColor: string;
}

export function BrandingClient({ initial }: { initial: Initial }) {
  const [form, setForm] = useState<Initial>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onPickLogo(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported image', 'Use SVG, PNG, JPEG or WebP.');
      return;
    }
    // Soft-cap raw bytes so the base64 result stays under the API limit
    // (base64 ~= 4/3 of source). 450 KB raw → ~600 KB encoded.
    if (file.size > 460000) {
      toast.error('Image too large', 'Keep under ~450 KB so it fits the data URL limit.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      if (dataUrl.length > LOGO_MAX_BYTES) {
        toast.error('Encoded image too large', `${Math.round(dataUrl.length / 1024)} KB exceeds 600 KB limit.`);
        return;
      }
      setForm({ ...form, logoDataUrl: dataUrl });
    } catch (e: any) {
      toast.error('Could not read file', e?.message ?? '');
    } finally {
      setUploading(false);
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

  function clearLogo() {
    setForm({ ...form, logoDataUrl: '' });
  }

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Frontend Branding</h1>
        <p className="text-coffee-600 text-sm">
          Override the logo, brand name, tagline, footer note and primary color shown on the WatShop Cafe
          marketing site (cafe.watshop.in). Per-cafe branding is unaffected.
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
                    if (f) onPickLogo(f);
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-coffee-700 text-cream-50 px-3 py-2 text-sm font-medium hover:bg-coffee-800">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Choose image
                </span>
              </label>
              {form.logoDataUrl && (
                <Button type="button" variant="outline" size="sm" onClick={clearLogo}>
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
