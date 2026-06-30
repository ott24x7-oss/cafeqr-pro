'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Search, ShoppingCart, X, Plus, Minus, Coffee, Leaf, Drumstick, Flame, Star,
  MapPin, Phone, Clock, ChevronDown, ChevronUp, Menu as MenuIcon,
} from 'lucide-react';
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

export function CustomerMenu({
  cafe,
  table,
  customer,
}: {
  cafe: CafeWithMenu;
  table: any;
  customer?: { phone: string; name: string | null; points: number; loyaltyEnabled: boolean } | null;
}) {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showMenuJump, setShowMenuJump] = useState(false);
  // Track which sections are expanded — collapsible like Swiggy.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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

  // Filter items per section by the search query so each category that has
  // matches keeps its header.
  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cafe.categories
      .map((c) => ({
        ...c,
        items: q
          ? c.items.filter(
              (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description ?? '').toLowerCase().includes(q)
            )
          : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [search, cafe.categories]);

  const totalMatchedItems = sections.reduce((s, c) => s + c.items.length, 0);

  function jumpTo(catId: string) {
    setShowMenuJump(false);
    setCollapsed((c) => ({ ...c, [catId]: false }));
    requestAnimationFrame(() => {
      const el = sectionRefs.current[catId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function toggleSection(catId: string) {
    setCollapsed((c) => ({ ...c, [catId]: !c[catId] }));
  }

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
    <div className="cafe-dark min-h-screen bg-forest-900 text-cream-50 bg-forest-glow bg-fixed pb-32">
      {/* Hero header — short on desktop, the cover image (if any) does the
          heavy lifting; lots of empty gradient on a 1080p screen looked
          dead. */}
      <div className="relative">
        <div className="h-40 sm:h-32 md:h-36 bg-forest-gradient relative overflow-hidden">
          {cafe.coverUrl && (
            <Image src={cafe.coverUrl} alt="" fill className="object-cover opacity-30" />
          )}
          <div className="absolute inset-0 bg-pattern opacity-20" />
        </div>
        <div className="container -mt-12 relative">
          <div className="cafe-card p-5 flex items-center gap-4 max-w-3xl mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-gold-gradient grid place-items-center text-forest-950 shadow-soft shrink-0">
              {cafe.logoUrl ? (
                <Image src={cafe.logoUrl} alt={cafe.name} width={64} height={64} className="rounded-2xl object-cover" />
              ) : (
                <Coffee className="h-7 w-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl md:text-2xl font-bold text-gradient-gold truncate">{cafe.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest-300 mt-0.5">
                {table ? (
                  <span className="cafe-pill-gold">Table {table.number}</span>
                ) : (
                  <span className="cafe-pill-muted">Takeaway</span>
                )}
                {cafe.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {cafe.city}</span>}
                {cafe.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {cafe.phone}</span>}
                {((cafe as any).isOpen ?? true) ? (
                  <span className="flex items-center gap-1 text-emerald-400"><Clock className="h-3 w-3" /> Open</span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400"><Clock className="h-3 w-3" /> Closed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky compact top bar — name + delivery hint on the left, search
          icon on the right. Mirrors Swiggy's restaurant page header. */}
      <div className="sticky top-0 z-30 bg-forest-900/90 backdrop-blur border-b border-white/10">
        <div className="container max-w-3xl py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-cream-50 truncate text-sm">{cafe.name}</div>
            <div className="text-[11px] text-forest-300 truncate">
              {table ? `Table ${table.number}` : 'Takeaway'}
              {' · '}
              {((cafe as any).isOpen ?? true) ? (
                <span className="text-emerald-400">Open</span>
              ) : (
                <span className="text-rose-400">Closed</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="h-9 w-9 grid place-items-center rounded-full border border-white/10 bg-forest-800 text-gold hover:bg-forest-700"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {showSearch && (
          <div className="container max-w-3xl pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-300" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="pl-9 bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-300 hover:text-gold"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sections — single column even on PC, like Swiggy. Each category is a
          collapsible block; the floating MENU button below jumps to a section. */}
      <div className="container max-w-3xl mt-3 space-y-3">
        {sections.length === 0 ? (
          <div className="cafe-card p-5 text-center text-forest-300">No items match your search.</div>
        ) : (
          sections.map((section) => {
            const isCollapsed = !!collapsed[section.id];
            return (
              <section
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className="bg-forest-800 rounded-2xl border border-white/10 overflow-hidden scroll-mt-20"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/5 transition"
                >
                  <span className="font-bold text-cream-50 text-base">
                    {section.name} <span className="text-forest-300 font-normal">({section.items.length})</span>
                  </span>
                  {isCollapsed ? <ChevronDown className="h-4 w-4 text-gold" /> : <ChevronUp className="h-4 w-4 text-gold" />}
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-white/5">
                    {section.items.map((it: any) => (
                      <MenuItemCard key={it.id} item={it} onAdd={() => setSelectedItem(it)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* Floating MENU button (bottom-right). When the cart bar is up we
          lift the button above it so the two don't overlap. */}
      {sections.length > 1 && (
        <button
          onClick={() => setShowMenuJump(true)}
          className={`fixed right-4 z-40 h-14 w-14 rounded-full bg-gold-gradient text-forest-950 shadow-coffee flex items-center justify-center hover:scale-105 active:scale-95 transition ${
            cart.length > 0 ? 'bottom-24' : 'bottom-4'
          }`}
          aria-label="Menu sections"
        >
          <div className="flex flex-col items-center gap-0.5">
            <MenuIcon className="h-4 w-4" />
            <span className="text-[9px] font-semibold tracking-wider">MENU</span>
          </div>
        </button>
      )}

      {/* Sticky cart bar — full-width (with side margin), Swiggy-style. */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
          <button
            onClick={() => setShowCart(true)}
            className="pointer-events-auto w-full max-w-3xl mx-auto bg-forest-800/95 backdrop-blur border border-gold/30 text-cream-50 px-4 py-3 rounded-2xl shadow-coffee flex items-center gap-3 font-semibold animate-fade-up"
          >
            <div className="h-9 w-9 rounded-full bg-gold/15 text-gold grid place-items-center shrink-0">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left leading-tight min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-forest-300">
                {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
              </div>
              <div className="text-base font-bold text-cream-50">{formatCurrency(totals.totalAmount)}</div>
            </div>
            <span className="bg-gold-gradient text-forest-950 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap">View cart →</span>
          </button>
        </div>
      )}

      {/* Category jump sheet (Swiggy-style — slides up from bottom). */}
      {showMenuJump && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center p-4"
          onClick={() => setShowMenuJump(false)}
        >
          <div
            className="w-full max-w-md bg-forest-850 border border-white/10 text-cream-50 rounded-2xl overflow-hidden animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 flex items-center justify-between border-b border-white/10">
              <span className="font-bold tracking-wider text-xs uppercase text-gold-light">Menu · {totalMatchedItems} items</span>
              <button onClick={() => setShowMenuJump(false)} className="text-forest-300 hover:text-gold">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto divide-y divide-white/5">
              {sections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => jumpTo(c.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition"
                >
                  <span className="text-sm">{c.name}</span>
                  <span className="text-sm text-forest-300">{c.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdd={(variant: any, addons: any[], note: string, qty: number) => {
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
          customer={customer ?? null}
          onAdjust={adjust}
          onClose={() => setShowCart(false)}
          onClear={() => { setCart([]); setShowCart(false); }}
        />
      )}
    </div>
  );
}

/** Swiggy-style menu row: text left, image right with the ADD button
 *  overlapping the bottom of the image. Lives inside a section card so it
 *  shares dividers with siblings. */
function MenuItemCard({ item, onAdd }: { item: any; onAdd: () => void }) {
  const isVeg = item.diet === 'VEG' || item.diet === 'VEGAN';
  const customisable = (item.variants?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0;
  const soldOut = item.inStock === false;

  return (
    <div className={`flex gap-4 px-4 pt-4 ${customisable && !soldOut ? 'pb-9' : 'pb-6'} ${soldOut ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        {/* Veg / non-veg square indicator */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center justify-center h-3.5 w-3.5 border-2 ${
              isVeg ? 'border-emerald-500' : 'border-rose-500'
            }`}
            title={isVeg ? 'Veg' : 'Non-veg'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </span>
          {item.isPopular && (
            <span className="inline-flex items-center gap-1 text-gold-light text-[11px] font-semibold">
              <Star className="h-3 w-3 fill-gold text-gold" /> Bestseller
            </span>
          )}
          {item.spicy === 'HOT' || item.spicy === 'EXTRA_HOT' ? (
            <Flame className="h-3 w-3 text-rose-400" />
          ) : null}
        </div>

        <div className="font-semibold text-cream-50 leading-snug">{item.name}</div>

        <div className="mt-1 flex items-center gap-2">
          {item.discountedPrice ? (
            <>
              <span className="font-semibold text-gold-light">{formatCurrency(item.discountedPrice)}</span>
              <span className="text-xs text-forest-400 line-through">{formatCurrency(item.price)}</span>
            </>
          ) : (
            <span className="font-semibold text-gold-light">{formatCurrency(item.price)}</span>
          )}
          {item.prepMinutes ? (
            <span className="text-[11px] text-forest-300">· {item.prepMinutes} min</span>
          ) : null}
        </div>

        {item.description && (
          <div className="text-xs text-forest-300 mt-1.5 line-clamp-2">{item.description}</div>
        )}
      </div>

      {/* Image + overlapping ADD button */}
      <div className="relative shrink-0 w-28 sm:w-32">
        <div className="h-28 sm:h-32 rounded-xl bg-forest-700 grid place-items-center overflow-hidden">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={128}
              height={128}
              className="object-cover h-full w-full"
            />
          ) : (
            <Coffee className="h-8 w-8 text-gold/40" />
          )}
        </div>
        {soldOut ? (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-forest-900 text-rose-400 border border-rose-500/40 rounded-md px-4 py-1.5 text-xs font-bold shadow-soft uppercase tracking-wider whitespace-nowrap">
            Sold out
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 cafe-add-btn"
          >
            Add
          </button>
        )}
        {customisable && !soldOut && (
          <div className="absolute -bottom-7 left-0 right-0 text-center text-[10px] text-forest-300">
            Customisable
          </div>
        )}
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-md bg-forest-850 text-cream-50 rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="h-44 bg-forest-gradient grid place-items-center">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            ) : (
              <Coffee className="h-14 w-14 text-gold/50" />
            )}
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-forest-900/80 border border-white/10 text-cream-50 shadow">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            {item.diet === 'VEG' || item.diet === 'VEGAN' ? <span className="veg-dot" /> : <span className="nonveg-dot" />}
            {item.spicy && item.spicy !== 'NONE' && <span className="pill-rose"><Flame className="h-3 w-3" />{item.spicy}</span>}
          </div>
          <h2 className="font-display text-2xl font-bold text-cream-50">{item.name}</h2>
          {item.description && <p className="mt-1 text-sm text-forest-300">{item.description}</p>}

          {item.variants?.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-cream-50">Choose size</label>
              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`rounded-xl border p-3 text-left ${variant?.id === v.id ? 'border-gold bg-forest-700' : 'border-white/10 bg-forest-800'}`}
                  >
                    <div className="font-semibold text-cream-50">{v.name}</div>
                    <div className="text-sm text-gold-light">{formatCurrency(v.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.addons?.length > 0 && (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-cream-50">Add-ons (optional)</label>
              <div className="space-y-2">
                {item.addons.map((a: any) => {
                  const checked = selectedAddons.some((x) => x.id === a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-forest-800 p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedAddons((x) => checked ? x.filter((y) => y.id !== a.id) : [...x, a])}
                        className="h-4 w-4 accent-gold"
                      />
                      <div className="flex-1 flex justify-between">
                        <span className="text-cream-50">{a.name}</span>
                        <span className="text-sm text-forest-300">+ {formatCurrency(a.price)}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-cream-50">Special request <span className="text-xs text-forest-300 font-normal">(optional)</span></label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. less spicy, no onion…"
              className="bg-forest-800 border-white/10 text-cream-50 placeholder:text-forest-300 focus:border-gold focus:ring-gold/30"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-forest-800 rounded-full border border-white/10">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 grid place-items-center text-gold">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-bold text-cream-50">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="h-9 w-9 grid place-items-center text-gold">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button variant="accent" size="lg" onClick={() => onAdd(variant, selectedAddons, note, qty)}>
              Add · {formatCurrency(total)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
