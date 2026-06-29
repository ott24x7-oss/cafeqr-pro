'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Loader2, Image as ImageIcon, Eye, EyeOff, Pencil, X, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ImagePicker } from '@/components/ui/image-picker';
import { toast } from '@/components/ui/toaster';

interface Poster {
  id: string;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  badge: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  linkType: string;
  linkValue: string | null;
  bgColor: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface LinkTarget { id: string; name: string }

export function PostersManager({
  posters: initial,
  categories,
  items,
}: {
  posters: Poster[];
  categories: LinkTarget[];
  items: LinkTarget[];
}) {
  const router = useRouter();
  const [posters, setPosters] = useState<Poster[]>(initial);
  const [editing, setEditing] = useState<Poster | null>(null);
  const [creating, setCreating] = useState(false);

  async function toggleActive(p: Poster) {
    const next = !p.isActive;
    setPosters((list) => list.map((x) => (x.id === p.id ? { ...x, isActive: next } : x)));
    try {
      const r = await fetch(`/api/dashboard/posters/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setPosters((list) => list.map((x) => (x.id === p.id ? { ...x, isActive: !next } : x)));
      toast.error('Could not update');
    }
  }

  async function remove(p: Poster) {
    if (!confirm('Delete this poster?')) return;
    setPosters((list) => list.filter((x) => x.id !== p.id));
    try {
      const r = await fetch(`/api/dashboard/posters/${p.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      toast.success('Poster deleted');
    } catch {
      toast.error('Could not delete');
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-coffee-900">Posters &amp; Slides</h1>
          <p className="text-sm text-coffee-600 mt-0.5">
            Promo banners shown in the carousel at the top of your customer app home screen.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New poster
        </Button>
      </div>

      {posters.length === 0 ? (
        <div className="card-warm text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-cream-200 grid place-items-center text-coffee-500">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="mt-3 font-semibold text-coffee-900">No posters yet</div>
          <p className="text-sm text-coffee-600 mt-1">
            Add your first promo slide — e.g. &ldquo;20% off on combo&rdquo;.
          </p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New poster
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posters.map((p) => (
            <div key={p.id} className="card-warm !p-0 overflow-hidden">
              <PosterPreview poster={p} />
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-coffee-900 truncate">
                    {p.title || p.subtitle || 'Untitled poster'}
                  </div>
                  <div className="text-[11px] text-coffee-500">
                    {p.isActive ? 'Visible' : 'Hidden'}
                    {p.linkType !== 'none' && ` · links to ${p.linkType}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn title={p.isActive ? 'Hide' : 'Show'} onClick={() => toggleActive(p)}>
                    {p.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn title="Edit" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn title="Delete" onClick={() => remove(p)} danger>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PosterEditor
          poster={editing}
          categories={categories}
          items={items}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(saved, isNew) => {
            setPosters((list) =>
              isNew ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x)),
            );
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 grid place-items-center rounded-lg border border-coffee-200 bg-white hover:bg-cream-50 ${
        danger ? 'text-rose-600' : 'text-coffee-700'
      }`}
    >
      {children}
    </button>
  );
}

/** Mini version of the live customer-app poster, so owners see what they ship. */
function PosterPreview({ poster: p }: { poster: Poster }) {
  return (
    <div
      className="relative aspect-[16/7] w-full overflow-hidden"
      style={{ background: p.bgColor || 'linear-gradient(135deg,#2c3a2c,#1c2a1c)' }}
    >
      {p.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
      <div className="relative h-full p-3 flex flex-col justify-center">
        {p.badge && (
          <span className="self-start inline-flex items-center gap-1 rounded-full bg-amber-400/90 text-coffee-950 text-[10px] font-bold px-2 py-0.5">
            <Tag className="h-2.5 w-2.5" /> {p.badge}
          </span>
        )}
        {p.title && <div className="text-cream-50 font-display font-bold text-lg leading-tight mt-1">{p.title}</div>}
        {p.subtitle && <div className="text-amber-200 font-display italic text-sm leading-tight">{p.subtitle}</div>}
        {p.caption && <div className="text-cream-100/80 text-[11px] mt-0.5">{p.caption}</div>}
        {p.ctaLabel && (
          <span className="self-start mt-2 rounded-full bg-cream-50 text-coffee-900 text-[11px] font-semibold px-2.5 py-1">
            {p.ctaLabel} →
          </span>
        )}
      </div>
      {!p.isActive && (
        <div className="absolute top-2 right-2 rounded-full bg-black/60 text-cream-50 text-[10px] px-2 py-0.5">Hidden</div>
      )}
    </div>
  );
}

const PRESET_BG = [
  'linear-gradient(135deg,#2c3a2c,#1c2a1c)',
  'linear-gradient(135deg,#3E2D24,#221812)',
  'linear-gradient(135deg,#7a4a2b,#3a2417)',
  'linear-gradient(135deg,#1f3a4d,#0e2230)',
  'linear-gradient(135deg,#4d1f2f,#2a0e18)',
];

function PosterEditor({
  poster,
  categories,
  items,
  onClose,
  onSaved,
}: {
  poster: Poster | null;
  categories: LinkTarget[];
  items: LinkTarget[];
  onClose: () => void;
  onSaved: (p: Poster, isNew: boolean) => void;
}) {
  const isNew = !poster;
  const [form, setForm] = useState({
    title: poster?.title ?? '',
    subtitle: poster?.subtitle ?? '',
    caption: poster?.caption ?? '',
    badge: poster?.badge ?? '',
    imageUrl: poster?.imageUrl ?? '',
    ctaLabel: poster?.ctaLabel ?? 'Order Now',
    linkType: poster?.linkType ?? 'none',
    linkValue: poster?.linkValue ?? '',
    bgColor: poster?.bgColor ?? PRESET_BG[0],
    isActive: poster?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title || null,
        subtitle: form.subtitle || null,
        caption: form.caption || null,
        badge: form.badge || null,
        imageUrl: form.imageUrl || null,
        ctaLabel: form.ctaLabel || null,
        linkValue: form.linkType === 'none' ? null : form.linkValue || null,
      };
      const r = await fetch(isNew ? '/api/dashboard/posters' : `/api/dashboard/posters/${poster!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Save failed');
      toast.success(isNew ? 'Poster created' : 'Poster updated');
      onSaved(data.poster, isNew);
    } catch (e: any) {
      toast.error('Could not save', e?.message);
    } finally {
      setSaving(false);
    }
  }

  const linkTargets = form.linkType === 'category' ? categories : form.linkType === 'item' ? items : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-lg bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-cream-50 z-10 px-5 py-4 border-b border-coffee-100 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-coffee-900">{isNew ? 'New poster' : 'Edit poster'}</h2>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <PosterPreview poster={{ ...(poster as any), ...form, id: 'preview', sortOrder: 0 }} />

          <div>
            <label className="label">Background image (optional)</label>
            <ImagePicker
              value={form.imageUrl}
              onChange={(v) => set('imageUrl', v)}
              aspect="cover"
              maxSize={1600}
              placeholder="Upload banner image"
              hint="Wide image works best (e.g. food photo). Leave empty to use a colour background."
            />
          </div>

          <div>
            <label className="label">Background colour</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_BG.map((bg) => (
                <button
                  key={bg}
                  onClick={() => set('bgColor', bg)}
                  className={`h-9 w-9 rounded-lg border-2 ${form.bgColor === bg ? 'border-coffee-700' : 'border-transparent'}`}
                  style={{ background: bg }}
                  aria-label="Pick background"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Badge">
              <Input value={form.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Limited Time Offer" />
            </Field>
            <Field label="CTA button text">
              <Input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Order Now" />
            </Field>
          </div>

          <Field label="Title (headline)">
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="20% off" />
          </Field>
          <Field label="Subtitle">
            <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="on combo" />
          </Field>
          <Field label="Caption (small line)">
            <Input value={form.caption} onChange={(e) => set('caption', e.target.value)} placeholder="Great taste. Better together." />
          </Field>

          <Field label="When tapped, go to">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.linkType}
                onChange={(e) => { set('linkType', e.target.value); set('linkValue', ''); }}
                className="rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm text-coffee-800"
              >
                <option value="none">Nothing</option>
                <option value="category">A menu category</option>
                <option value="item">A specific item</option>
                <option value="url">A web link</option>
              </select>
              {form.linkType === 'url' ? (
                <Input value={form.linkValue} onChange={(e) => set('linkValue', e.target.value)} placeholder="https://…" />
              ) : form.linkType !== 'none' ? (
                <select
                  value={form.linkValue}
                  onChange={(e) => set('linkValue', e.target.value)}
                  className="rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-sm text-coffee-800"
                >
                  <option value="">Choose…</option>
                  {linkTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : <div />}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-coffee-800">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 accent-coffee-700"
            />
            Visible to customers
          </label>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isNew ? 'Create poster' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
