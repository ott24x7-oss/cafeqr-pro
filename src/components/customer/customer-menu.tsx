'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Search, ShoppingCart, X, Plus, Minus, Coffee, Leaf, Drumstick, Flame, Star, MapPin, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { calcCart, type CartItem } from '@/lib/order-utils';
import { formatCurrency } from '@/lib/utils';
import { CustomerCart } from './customer-cart';

type CafeWithMenu = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  settings?: any;
  categories: {
    id: string;
    name: string;
    slug: string;
    items: any[];
  }[];
};

export function CustomerMenu({ cafe, table }: { cafe: CafeWithMenu; table: any }) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Persist cart per table in localStorage
  const cartKey = `cart_${cafe.slug}_${table?.code ?? 'walkin'}`;
  useEffect(() => {
    const stored = localStorage.getItem(cartKey);
    if (stored) {
      try { setCart(JSON.parse(stored)); } catch {}
    }
  }, [cartKey]);
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  const allItems = useMemo(() => cafe.categories.flatMap((c) => c.items.map((i) => ({ ...i, _cat: c.name }))), [cafe.categories]);
  const filtered = useMemo(() => {
    let items = activeCat === 'all' ? allItems : (cafe.categories.find((c) => c.id === activeCat)?.items ?? []);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    return items;
  }, [activeCat, allItems, cafe.categories, search]);

  const totals = calcCart(cart, cafe.settings, 'DINE_IN');

  function addToCart(item: any, variant?: any, addons: any[] = [], note?: string, qty = 1) {
    const next: CartItem = {
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.discountedPrice ?? item.price,
      quantity: qty,
      variantName: variant?.name,
      variantPrice: variant?.price,
      addons: addons.map((a) => ({ name: a.name, price: a.price })),
      note,
    };
    setCart((c) => {
      const idx = c.findIndex(
        (x) =>
          x.menuItemId === next.menuItemId &&
          x.variantName === next.variantName &&
          JSON.stringify(x.addons) === JSON.stringify(next.addons) &&
          (x.note ?? '') === (next.note ?? '')
      );
      if (idx >= 0) {
        const cp = [...c];
        cp[idx] = { ...cp[idx], quantity: cp[idx].quantity + qty };
        return cp;
      }
      return [...c, next];
    });
  }

  function adjust(idx: number, delta: number) {
    setCart((c) => {
      const cp = [...c];
      cp[idx] = { ...cp[idx], quantity: cp[idx].quantity + delta };
      return cp.filter((x) => x.quantity > 0);
    });
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-32">
      {/* Hero header */}
      <div className="relative">
        <div className="h-44 md:h-56 bg-coffee-gradient relative overflow-hidden">
          {cafe.coverUrl && (
            <Image src={cafe.coverUrl} alt="" fill className="object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-pattern opacity-20" />
        </div>
        <div className="container -mt-12 relative">
          <div className="card-warm flex items-center gap-4 max-w-3xl mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-coffee-gradient grid place-items-center text-cream-50 shadow-soft shrink-0">
              {cafe.logoUrl ? (
                <Image src={cafe.logoUrl} alt={cafe.name} width={64} height={64} className="rounded-2xl object-cover" />
              ) : (
                <Coffee className="h-7 w-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl md:text-2xl font-bold text-coffee-900 truncate">{cafe.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coffee-600 mt-0.5">
                {table ? (
                  <span className="pill bg-coffee-700 text-cream-50">Table {table.number}</span>
                ) : (
                  <span className="pill bg-cream-200 text-coffee-800">Takeaway</span>
                )}
                {cafe.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {cafe.city}</span>}
                {cafe.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {cafe.phone}</span>}
                <span className="flex items-center gap-1 text-emerald-700"><Clock className="h-3 w-3" /> Open</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container max-w-3xl mt-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes…"
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="container max-w-3xl mt-4 sticky top-0 z-30 -mx-4 px-4 py-3 bg-cream-50/90 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto scroll-snap-x scrollbar-none -mx-4 px-4 pb-1">
          <CategoryChip active={activeCat === 'all'} onClick={() => setActiveCat('all')}>
            All ({allItems.length})
          </CategoryChip>
          {cafe.categories.map((c) => (
            <CategoryChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
              {c.name} ({c.items.length})
            </CategoryChip>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="container max-w-3xl mt-2 space-y-3">
        {filtered.length === 0 && (
          <div className="card-warm text-center text-coffee-600">No items match your search.</div>
        )}
        {filtered.map((it) => (
          <MenuItemCard key={it.id} item={it} onAdd={() => setSelectedItem(it)} />
        ))}
      </div>

      {/* Sticky cart */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-coffee-gradient text-cream-50 px-5 py-3.5 rounded-2xl shadow-coffee flex items-center gap-3 font-semibold animate-fade-up"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'} · {formatCurrency(totals.totalAmount)}</span>
          <span className="opacity-80">View cart →</span>
        </button>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(variant, addons, note, qty) => {
            addToCart(selectedItem, variant, addons, note, qty);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Cart drawer */}
      {showCart && (
        <CustomerCart
          cafe={cafe}
          table={table}
          cart={cart}
          onAdjust={adjust}
          onClose={() => setShowCart(false)}
          onClear={() => { setCart([]); setShowCart(false); }}
        />
      )}
    </div>
  );
}

function CategoryChip({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 snap-start rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
        active ? 'bg-coffee-700 text-cream-50' : 'bg-white border border-coffee-200 text-coffee-700'
      }`}
    >
      {children}
    </button>
  );
}

function MenuItemCard({ item, onAdd }: { item: any; onAdd: () => void }) {
  const price = item.discountedPrice ?? item.price;
  return (
    <button onClick={onAdd} className="w-full card-warm flex gap-4 hover:-translate-y-0.5 transition text-left active:scale-[0.99]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.diet === 'VEG' || item.diet === 'VEGAN' ? (
            <span className="veg-dot" title="Veg" />
          ) : (
            <span className="nonveg-dot" title="Non-veg" />
          )}
          {item.spicy === 'HOT' || item.spicy === 'EXTRA_HOT' ? (
            <Flame className="h-3.5 w-3.5 text-rose-500" />
          ) : null}
          {item.isPopular && <span className="pill-amber"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />Bestseller</span>}
          {!item.inStock && <span className="pill-rose">Out of stock</span>}
        </div>
        <div className="font-bold text-coffee-900 leading-tight">{item.name}</div>
        {item.description && <div className="text-xs text-coffee-600 mt-1 line-clamp-2">{item.description}</div>}
        <div className="mt-2 flex items-center gap-2">
          {item.discountedPrice ? (
            <>
              <span className="font-bold text-coffee-900">{formatCurrency(item.discountedPrice)}</span>
              <span className="text-sm text-coffee-400 line-through">{formatCurrency(item.price)}</span>
            </>
          ) : (
            <span className="font-bold text-coffee-900">{formatCurrency(price)}</span>
          )}
          {item.prepMinutes && <span className="text-[11px] text-coffee-500">· {item.prepMinutes} min</span>}
        </div>
      </div>
      <div className="relative shrink-0">
        <div className="h-24 w-24 md:h-28 md:w-28 rounded-xl bg-coffee-gradient grid place-items-center overflow-hidden">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} width={112} height={112} className="object-cover h-full w-full" />
          ) : (
            <Coffee className="h-7 w-7 text-cream-50" />
          )}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-coffee-800 border border-coffee-200 rounded-full px-3 py-1 text-xs font-bold shadow-soft flex items-center gap-1">
          <Plus className="h-3 w-3" /> ADD
        </div>
      </div>
    </button>
  );
}

function ItemDetail({ item, onClose, onAdd }: any) {
  const [variant, setVariant] = useState(item.variants?.find((v: any) => v.isDefault) ?? item.variants?.[0] ?? null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>(item.addons?.filter((a: any) => a.isRequired) ?? []);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  const base = variant?.price ?? item.discountedPrice ?? item.price;
  const addonSum = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
  const total = (base + addonSum) * qty;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-md bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="h-44 bg-coffee-gradient grid place-items-center">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            ) : (
              <Coffee className="h-14 w-14 text-cream-50" />
            )}
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-white/90 text-coffee-800 shadow">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            {item.diet === 'VEG' || item.diet === 'VEGAN' ? <span className="veg-dot" /> : <span className="nonveg-dot" />}
            {item.spicy && item.spicy !== 'NONE' && <span className="pill-rose"><Flame className="h-3 w-3" />{item.spicy}</span>}
          </div>
          <h2 className="font-display text-2xl font-bold text-coffee-900">{item.name}</h2>
          {item.description && <p className="mt-1 text-sm text-coffee-600">{item.description}</p>}

          {item.variants?.length > 0 && (
            <div className="mt-4">
              <label className="label">Choose size</label>
              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`rounded-xl border p-3 text-left ${variant?.id === v.id ? 'border-coffee-700 bg-cream-100' : 'border-coffee-200 bg-white'}`}
                  >
                    <div className="font-semibold text-coffee-900">{v.name}</div>
                    <div className="text-sm text-coffee-600">{formatCurrency(v.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.addons?.length > 0 && (
            <div className="mt-4">
              <label className="label">Add-ons (optional)</label>
              <div className="space-y-2">
                {item.addons.map((a: any) => {
                  const checked = selectedAddons.some((x) => x.id === a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-3 rounded-xl border border-coffee-200 bg-white p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedAddons((x) => checked ? x.filter((y) => y.id !== a.id) : [...x, a])}
                        className="h-4 w-4 accent-coffee-700"
                      />
                      <div className="flex-1 flex justify-between">
                        <span className="text-coffee-800">{a.name}</span>
                        <span className="text-sm text-coffee-600">+ {formatCurrency(a.price)}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="label">Special request <span className="text-xs text-coffee-500 font-normal">(optional)</span></label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. less spicy, no onion…" />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white rounded-full border border-coffee-200">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 grid place-items-center text-coffee-700">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold text-coffee-900">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="h-9 w-9 grid place-items-center text-coffee-700">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" onClick={() => onAdd(variant, selectedAddons, note, qty)}>
              Add · {formatCurrency(total)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
