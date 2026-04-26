'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Coffee, X, Power, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { formatCurrency, slugify } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { BulkMenuImport } from '@/components/dashboard/bulk-menu-import';

export function MenuManager({ categories: initialCats, items: initialItems }: { categories: any[]; items: any[] }) {
  const [cats, setCats] = useState(initialCats);
  const [items, setItems] = useState(initialItems);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<any | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const filtered = items.filter((i) => {
    if (activeCat !== 'all' && i.categoryId !== activeCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    const r = await fetch(`/api/dashboard/menu/items/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setItems((x) => x.filter((i) => i.id !== id));
      toast.success('Deleted');
    }
  }

  async function toggleAvailability(item: any) {
    const r = await fetch(`/api/dashboard/menu/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    if (r.ok) {
      setItems((x) => x.map((i) => (i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i)));
    }
  }

  async function deleteCat(id: string) {
    if (!confirm('Delete this category? Items will be uncategorized.')) return;
    const r = await fetch(`/api/dashboard/menu/categories/${id}`, { method: 'DELETE' });
    if (r.ok) setCats((x) => x.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Menu</h1>
          <p className="text-coffee-600 text-sm">{items.length} items in {cats.length} categories</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button variant="outline" onClick={() => { setEditCat(null); setShowCatModal(true); }}>
            <Plus className="h-4 w-4" /> Category
          </Button>
          <Button onClick={() => { setEditItem(null); setShowItemModal(true); }}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>
      </div>

      <div className="card-warm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCat('all')}
            className={`pill ${activeCat === 'all' ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}
          >
            All ({items.length})
          </button>
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-1">
              <button onClick={() => setActiveCat(c.id)} className={`pill ${activeCat === c.id ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-800'}`}>
                {c.name} ({items.filter((i) => i.categoryId === c.id).length})
              </button>
              <button onClick={() => { setEditCat(c); setShowCatModal(true); }} className="text-coffee-500 hover:text-coffee-900"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => deleteCat(c.id)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
          <Input placeholder="Search items…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="card-warm col-span-full text-center text-coffee-500 py-10">
            <Coffee className="mx-auto h-10 w-10 mb-3 text-coffee-300" />
            No items yet. Click "Add item" to create your first menu item.
          </div>
        )}
        {filtered.map((it) => (
          <div key={it.id} className={`card-warm relative ${!it.isAvailable ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 rounded-xl bg-coffee-gradient grid place-items-center shrink-0">
                <Coffee className="h-6 w-6 text-cream-50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {it.diet === 'VEG' || it.diet === 'VEGAN' ? <span className="veg-dot" /> : <span className="nonveg-dot" />}
                  {!it.isAvailable && <span className="pill-rose">Hidden</span>}
                  {it.isPopular && <span className="pill-amber">Bestseller</span>}
                </div>
                <div className="font-bold text-coffee-900 truncate">{it.name}</div>
                <div className="text-xs text-coffee-500 truncate">{it.category?.name}</div>
                <div className="font-semibold text-coffee-800 mt-1">{formatCurrency(it.discountedPrice ?? it.price)}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => { setEditItem(it); setShowItemModal(true); }}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleAvailability(it)}>
                <Power className="h-3 w-3" /> {it.isAvailable ? 'Hide' : 'Show'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteItem(it.id)}>
                <Trash2 className="h-3 w-3 text-rose-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {showBulkImport && (
        <BulkMenuImport
          onClose={() => setShowBulkImport(false)}
          onImported={(count) => {
            // Refresh the page to show newly imported items
            if (count > 0) window.location.reload();
          }}
        />
      )}
      {showCatModal && (
        <CategoryModal
          cat={editCat}
          onClose={() => setShowCatModal(false)}
          onSaved={(c: any) => {
            setCats((cur) => editCat ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, c]);
            setShowCatModal(false);
          }}
        />
      )}
      {showItemModal && (
        <ItemModal
          cats={cats}
          item={editItem}
          onClose={() => setShowItemModal(false)}
          onSaved={(i: any) => {
            setItems((cur) => editItem ? cur.map((x) => (x.id === i.id ? i : x)) : [...cur, i]);
            setShowItemModal(false);
          }}
        />
      )}
    </div>
  );
}

function CategoryModal({ cat, onClose, onSaved }: any) {
  const [name, setName] = useState(cat?.name ?? '');
  const [loading, setLoading] = useState(false);
  async function save() {
    setLoading(true);
    const r = await fetch(`/api/dashboard/menu/categories${cat ? '/' + cat.id : ''}`, {
      method: cat ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: slugify(name) }),
    });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      onSaved(data.category);
      toast.success(cat ? 'Updated' : 'Added');
    } else toast.error('Failed');
  }
  return (
    <Modal onClose={onClose} title={cat ? 'Edit category' : 'New category'}>
      <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button className="w-full mt-3" onClick={save} disabled={loading || !name.trim()}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </Button>
    </Modal>
  );
}

function ItemModal({ cats, item, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(
    item ?? {
      name: '',
      categoryId: cats[0]?.id ?? '',
      price: 0,
      discountedPrice: undefined,
      description: '',
      diet: 'VEG',
      spicy: 'NONE',
      prepMinutes: 15,
      imageUrl: '',
      isAvailable: true,
      isPopular: false,
    }
  );
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.name || !form.categoryId || !form.price) return toast.error('Fill required fields');
    setLoading(true);
    const payload = { ...form, price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined, prepMinutes: Number(form.prepMinutes) };
    const r = await fetch(`/api/dashboard/menu/items${item ? '/' + item.id : ''}`, {
      method: item ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (r.ok) {
      const data = await r.json();
      onSaved(data.item);
      toast.success(item ? 'Updated' : 'Added');
    } else toast.error('Failed');
  }

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm({ ...form, [k]: v });
  }

  return (
    <Modal onClose={onClose} title={item ? 'Edit item' : 'New menu item'}>
      <div className="space-y-3">
        <div>
          <label className="label">Name *</label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Cappuccino" />
        </div>
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <Textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Rich espresso with foamed milk" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Price (₹) *</label>
            <Input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div>
            <label className="label">Discounted price (₹)</label>
            <Input type="number" value={form.discountedPrice ?? ''} onChange={(e) => set('discountedPrice', e.target.value || undefined)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Diet</label>
            <select className="input" value={form.diet} onChange={(e) => set('diet', e.target.value)}>
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-veg</option>
              <option value="EGG">Egg</option>
              <option value="VEGAN">Vegan</option>
            </select>
          </div>
          <div>
            <label className="label">Spicy</label>
            <select className="input" value={form.spicy} onChange={(e) => set('spicy', e.target.value)}>
              <option value="NONE">No</option>
              <option value="MILD">Mild</option>
              <option value="MEDIUM">Medium</option>
              <option value="HOT">Hot</option>
              <option value="EXTRA_HOT">Extra hot</option>
            </select>
          </div>
          <div>
            <label className="label">Prep (min)</label>
            <Input type="number" value={form.prepMinutes} onChange={(e) => set('prepMinutes', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Image URL (optional)</label>
          <Input value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
        </div>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} className="accent-coffee-700" />
            Available
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPopular} onChange={(e) => set('isPopular', e.target.checked)} className="accent-coffee-700" />
            Bestseller
          </label>
        </div>
        <Button className="w-full" onClick={save} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save item
        </Button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="w-full md:max-w-md bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-cream-50 z-10">
          <h3 className="font-display text-lg font-bold text-coffee-900">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
