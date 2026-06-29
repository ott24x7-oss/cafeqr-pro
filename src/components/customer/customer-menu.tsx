'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search, SlidersHorizontal, ShoppingCart, X, Plus, Minus, Coffee, Star,
  Armchair, ShoppingBag, ChevronDown, ChevronRight, BookOpen, ArrowRight, Leaf,
  Flame, Sparkles, Home as HomeIcon, LayoutGrid, Receipt, User, ConciergeBell,
  GlassWater, Loader2, Check, Award,
} from 'lucide-react';
import { calcCart, type CartItem } from '@/lib/order-utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { CustomerCart } from './customer-cart';
import { PosterCarousel, type Poster } from './poster-carousel';

type CafeWithMenu = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  isOpen?: boolean;
  settings?: any;
  posters?: Poster[];
  categories: { id: string; name: string; slug: string; imageUrl?: string | null; items: any[] }[];
};

type Tab = 'welcome' | 'home' | 'menu' | 'profile' | 'service';

const CAT_EMOJI: Record<string, string> = {
  coffee: '☕', tea: '🍵', snack: '🍟', snacks: '🍟', pizza: '🍕', dessert: '🧁',
  desserts: '🧁', combo: '🎁', combos: '🎁', burger: '🍔', shake: '🥤', juice: '🧃',
  breakfast: '🍳', sandwich: '🥪', cake: '🍰', drink: '🥤', drinks: '🥤',
};
function catEmoji(name: string) {
  const k = name.trim().toLowerCase();
  return CAT_EMOJI[k] ?? '🍽️';
}

export function CustomerMenu({
  cafe,
  table,
  customer,
}: {
  cafe: CafeWithMenu;
  table: any;
  customer?: { phone: string; name: string | null; points: number; loyaltyEnabled: boolean } | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(table ? 'welcome' : 'home');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'veg' | 'best' | 'spicy'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [greeting, setGreeting] = useState('Welcome');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const posters = cafe.posters ?? [];
  const allItems = useMemo(() => cafe.categories.flatMap((c) => c.items), [cafe.categories]);
  const popular = useMemo(() => allItems.filter((i) => i.isPopular).slice(0, 6), [allItems]);

  // Persist cart per table.
  const cartKey = `cart_${cafe.slug}_${table?.code ?? 'walkin'}`;
  useEffect(() => {
    const stored = localStorage.getItem(cartKey);
    if (stored) { try { setCart(JSON.parse(stored)); } catch {} }
  }, [cartKey]);
  useEffect(() => { localStorage.setItem(cartKey, JSON.stringify(cart)); }, [cart, cartKey]);

  // Time-of-day greeting — set after mount to avoid hydration mismatch.
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const totals = calcCart(cart, cafe.settings, table ? 'DINE_IN' : 'TAKEAWAY');

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
      const idx = c.findIndex((x) =>
        x.menuItemId === next.menuItemId && x.variantName === next.variantName &&
        JSON.stringify(x.addons) === JSON.stringify(next.addons) && (x.note ?? '') === (next.note ?? ''));
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
  function quickAdd(item: any) {
    if ((item.variants?.length ?? 0) > 0 || (item.addons?.length ?? 0) > 0) { setSelectedItem(item); return; }
    addToCart(item);
    toast.success(`${item.name} added`);
  }

  function openCategory(catId: string) {
    setTab('menu');
    setActiveCat(catId);
    requestAnimationFrame(() => {
      const el = sectionRefs.current[catId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function onPosterAction(p: Poster) {
    if (p.linkType === 'category' && p.linkValue) openCategory(p.linkValue);
    else if (p.linkType === 'item' && p.linkValue) {
      const it = allItems.find((x) => x.id === p.linkValue);
      if (it) setSelectedItem(it); else setTab('menu');
    } else if (p.linkType === 'url' && p.linkValue) {
      if (p.linkValue.startsWith('http')) window.open(p.linkValue, '_blank');
      else router.push(p.linkValue);
    } else setTab('menu');
  }

  // Menu sections filtered by search + category chip + dietary filter.
  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cafe.categories
      .filter((c) => !activeCat || c.id === activeCat)
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => {
          if (q && !(i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q))) return false;
          if (filter === 'veg' && !(i.diet === 'VEG' || i.diet === 'VEGAN')) return false;
          if (filter === 'best' && !i.isPopular) return false;
          if (filter === 'spicy' && !['MEDIUM', 'HOT', 'EXTRA_HOT'].includes(i.spicy)) return false;
          return true;
        }),
      }))
      .filter((c) => c.items.length > 0);
  }, [search, activeCat, filter, cafe.categories]);

  const itemCount = totals.itemCount;
  const theme = cafe.settings?.appTheme || 'coffee';

  return (
    <div className="cafe-app pb-28" data-theme={theme}>
      {tab === 'welcome' ? (
        <WelcomeScreen cafe={cafe} table={table} onStart={() => setTab('home')} onMenu={() => setTab('menu')} />
      ) : (
        <>
          <AppHeader cafe={cafe} table={table} />

          {tab === 'home' && (
            <main className="px-4 space-y-5">
              {/* Greeting */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-cream-50">{greeting} 👋</h1>
                  <p className="text-sm text-cream-200/60">What would you like to order today?</p>
                </div>
                <button onClick={() => setTab('service')} title="Call waiter / service" className="glass-chip h-11 w-11 rounded-full grid place-items-center relative shrink-0">
                  <ConciergeBell className="h-5 w-5 text-cream-100" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400" />
                </button>
              </div>

              <SearchBar value={search} onChange={(v) => { setSearch(v); if (v) setTab('menu'); }} />
              <CategoryChips
                categories={cafe.categories}
                active={activeCat}
                onPick={(id) => (id === activeCat ? openCategory(id) : openCategory(id))}
              />

              {posters.length > 0 && <PosterCarousel posters={posters} onAction={onPosterAction} />}

              {/* Popular Picks */}
              {popular.length > 0 && (
                <section>
                  <SectionHead title="Popular Picks" onViewAll={() => { setActiveCat(null); setFilter('best'); setTab('menu'); }} />
                  <div className="grid grid-cols-2 gap-3">
                    {popular.map((it) => (
                      <PopularCard key={it.id} item={it} onOpen={() => setSelectedItem(it)} onAdd={() => quickAdd(it)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Browse menu shortcut */}
              <button
                onClick={() => { setActiveCat(null); setFilter('all'); setTab('menu'); }}
                className="glass-card w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="h-11 w-11 rounded-xl grid place-items-center btn-amber"><BookOpen className="h-5 w-5" /></span>
                <div className="flex-1">
                  <div className="font-semibold text-cream-50">Browse full menu</div>
                  <div className="text-xs text-cream-200/60">{allItems.length} items across {cafe.categories.length} categories</div>
                </div>
                <ChevronRight className="h-5 w-5 text-cream-200/50" />
              </button>
            </main>
          )}

          {tab === 'menu' && (
            <main className="px-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold text-cream-50">Full Menu</h1>
                  <p className="text-sm text-cream-200/60">Explore our complete menu</p>
                </div>
                <button onClick={() => setTab('service')} title="Call waiter / service" className="glass-chip h-11 w-11 rounded-full grid place-items-center relative shrink-0">
                  <ConciergeBell className="h-5 w-5 text-cream-100" />
                  <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400" />
                </button>
              </div>

              <SearchBar value={search} onChange={setSearch} />
              <CategoryChips categories={cafe.categories} active={activeCat} onPick={(id) => setActiveCat(id === activeCat ? null : id)} />
              <FilterChips active={filter} onPick={setFilter} />

              <div className="space-y-5">
                {sections.length === 0 ? (
                  <div className="glass-card p-8 text-center text-cream-200/60">No items match your search.</div>
                ) : sections.map((section) => (
                  <section key={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }} className="scroll-mt-24">
                    <SectionHead
                      title={`${catEmoji(section.name)} ${section.name}`}
                      onViewAll={() => openCategory(section.id)}
                    />
                    <div className="space-y-3">
                      {section.items.map((it: any) => (
                        <MenuRow key={it.id} item={it} onOpen={() => setSelectedItem(it)} onAdd={() => quickAdd(it)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </main>
          )}

          {tab === 'profile' && (
            <ProfileScreen cafe={cafe} customer={customer} onOrders={() => router.push('/my-orders')} />
          )}

          {tab === 'service' && (
            <CallWaiterScreen cafe={cafe} table={table} cart={cart} totals={totals} />
          )}
        </>
      )}

      {/* Floating cart bar */}
      {itemCount > 0 && tab !== 'welcome' && tab !== 'service' && (
        <div className="fixed inset-x-0 bottom-[72px] z-40 px-4 pointer-events-none">
          <button
            onClick={() => setShowCart(true)}
            className="pointer-events-auto w-full max-w-3xl mx-auto btn-amber px-4 py-3 rounded-2xl flex items-center gap-3 font-semibold animate-fade-up"
          >
            <span className="relative h-9 w-9 rounded-full bg-black/15 grid place-items-center shrink-0">
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-white text-[10px] grid place-items-center">{itemCount}</span>
            </span>
            <span className="flex-1 text-left leading-tight">
              <span className="block text-[11px] uppercase tracking-wider opacity-80">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              <span className="block text-base font-bold">{formatCurrency(totals.totalAmount)}</span>
            </span>
            <span className="text-sm font-bold whitespace-nowrap inline-flex items-center gap-1">View Cart <ArrowRight className="h-4 w-4" /></span>
          </button>
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav tab={tab} setTab={setTab} onCart={() => setShowCart(true)} onOrders={() => router.push('/my-orders')} cartCount={itemCount} />

      {/* Product detail */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          theme={theme}
          onClose={() => setSelectedItem(null)}
          onAdd={(variant: any, addons: any[], note: string, qty: number) => {
            addToCart(selectedItem, variant, addons, note, qty);
            setSelectedItem(null);
            toast.success(`${selectedItem.name} added`);
          }}
        />
      )}

      {/* Cart / checkout */}
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

/* ─── Shared chrome ───────────────────────────────────────────────────────── */

function AppHeader({ cafe, table }: { cafe: CafeWithMenu; table: any }) {
  return (
    <header className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-11 w-11 rounded-full grid place-items-center ring-amber bg-black/30 overflow-hidden shrink-0">
          {cafe.logoUrl ? (
            <Image src={cafe.logoUrl} alt={cafe.name} width={44} height={44} className="object-cover h-full w-full" />
          ) : <Coffee className="h-5 w-5 app-amber" />}
        </span>
        <div className="min-w-0">
          <div className="font-display text-lg font-bold text-cream-50 leading-tight truncate">{cafe.name}</div>
          <div className="text-[11px] app-amber truncate">{cafe.description || 'Good coffee, good mood'}</div>
        </div>
      </div>
      <TableChip table={table} />
    </header>
  );
}

function TableChip({ table }: { table: any }) {
  return (
    <span className="glass-chip rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
      {table ? <Armchair className="h-4 w-4 app-amber" /> : <ShoppingBag className="h-4 w-4 app-amber" />}
      <span className="text-sm font-semibold text-cream-50">{table ? `Table ${table.number}` : 'Takeaway'}</span>
      <ChevronDown className="h-3.5 w-3.5 text-cream-200/50" />
    </span>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass-card flex items-center gap-2 px-4 py-3">
      <Search className="h-5 w-5 text-cream-200/50 shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for coffee, food or more…"
        className="flex-1 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40"
      />
      <SlidersHorizontal className="h-5 w-5 text-cream-200/50 shrink-0" />
    </div>
  );
}

function CategoryChips({ categories, active, onPick }: { categories: CafeWithMenu['categories']; active: string | null; onPick: (id: string) => void }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
      {categories.map((c) => {
        const on = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={`shrink-0 w-[76px] rounded-2xl py-3 flex flex-col items-center gap-1 transition ${on ? 'btn-amber' : 'glass-chip'}`}
          >
            <span className="text-xl leading-none">{catEmoji(c.name)}</span>
            <span className={`text-[11px] font-semibold ${on ? 'on-acc' : 'text-cream-100'}`}>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const FILTERS: { k: 'all' | 'veg' | 'best' | 'spicy'; label: string; icon: any }[] = [
  { k: 'all', label: 'All', icon: null },
  { k: 'veg', label: 'Veg', icon: Leaf },
  { k: 'best', label: 'Bestseller', icon: Star },
  { k: 'spicy', label: 'Spicy', icon: Flame },
];
function FilterChips({ active, onPick }: { active: string; onPick: (k: any) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
      {FILTERS.map((f) => {
        const on = active === f.k;
        return (
          <button
            key={f.k}
            onClick={() => onPick(f.k)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 border ${on ? 'border-amber-400/70 text-amber-300 bg-amber-400/10' : 'border-white/10 text-cream-200/70 glass-chip'}`}
          >
            {f.icon && <f.icon className={`h-3.5 w-3.5 ${f.k === 'veg' ? 'text-emerald-400' : f.k === 'spicy' ? 'text-rose-400' : 'text-amber-300'}`} />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHead({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-xl font-bold text-cream-50">{title}</h2>
      {onViewAll && (
        <button onClick={onViewAll} className="text-sm app-amber font-medium inline-flex items-center gap-0.5">
          View All <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Rating({ item }: { item: any }) {
  if (!item.rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-cream-200/70">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(item.rating).toFixed(1)}
      {item.ratingCount ? <span className="text-cream-200/40">({item.ratingCount})</span> : null}
    </span>
  );
}

function PriceTag({ item }: { item: any }) {
  return item.discountedPrice ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-bold text-cream-50">{formatCurrency(item.discountedPrice)}</span>
      <span className="text-xs text-cream-200/40 line-through">{formatCurrency(item.price)}</span>
    </span>
  ) : <span className="font-bold text-cream-50">{formatCurrency(item.price)}</span>;
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-9 w-9 rounded-full grid place-items-center border border-amber-400/60 text-amber-300 hover:bg-amber-400/10 active:scale-95 transition shrink-0">
      <Plus className="h-5 w-5" />
    </button>
  );
}

function PopularCard({ item, onOpen, onAdd }: { item: any; onOpen: () => void; onAdd: () => void }) {
  const soldOut = item.inStock === false;
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[5/4] bg-black/30">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
          ) : <div className="h-full w-full grid place-items-center"><Coffee className="h-8 w-8 text-cream-200/30" /></div>}
          {soldOut && <div className="absolute inset-0 bg-black/60 grid place-items-center text-rose-300 text-xs font-bold">Sold out</div>}
        </div>
      </button>
      <div className="p-2.5">
        <button onClick={onOpen} className="block text-left w-full">
          <div className="font-semibold text-cream-50 text-sm leading-tight truncate">{item.name}</div>
          {item.description && <div className="text-[11px] text-cream-200/55 line-clamp-1 mt-0.5">{item.description}</div>}
        </button>
        <div className="flex items-center justify-between mt-2">
          <div className="min-w-0">
            <div className="text-sm"><PriceTag item={item} /></div>
            <Rating item={item} />
          </div>
          {!soldOut && <AddBtn onClick={onAdd} />}
        </div>
      </div>
    </div>
  );
}

function MenuRow({ item, onOpen, onAdd }: { item: any; onOpen: () => void; onAdd: () => void }) {
  const isVeg = item.diet === 'VEG' || item.diet === 'VEGAN';
  const soldOut = item.inStock === false;
  return (
    <div className={`glass-card p-3 flex gap-3 ${soldOut ? 'opacity-60' : ''}`}>
      <button onClick={onOpen} className="relative h-24 w-24 rounded-xl overflow-hidden bg-black/30 shrink-0">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        ) : <div className="h-full w-full grid place-items-center"><Coffee className="h-7 w-7 text-cream-200/30" /></div>}
      </button>
      <div className="flex-1 min-w-0">
        <button onClick={onOpen} className="block text-left w-full">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center justify-center h-3.5 w-3.5 border-2 rounded-sm ${isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            {item.isPopular && <span className="text-[10px] font-bold text-amber-300 inline-flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />Bestseller</span>}
          </div>
          <div className="font-semibold text-cream-50 mt-1 leading-snug">{item.name}</div>
          {item.description && <div className="text-xs text-cream-200/55 mt-0.5 line-clamp-2">{item.description}</div>}
        </button>
        <div className="flex items-center justify-between mt-1.5">
          <div className="min-w-0">
            <div className="text-sm"><PriceTag item={item} /></div>
            <Rating item={item} />
          </div>
          {soldOut ? <span className="text-xs font-bold text-rose-300">Sold out</span> : <AddBtn onClick={onAdd} />}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, onCart, onOrders, cartCount }: {
  tab: Tab; setTab: (t: Tab) => void; onCart: () => void; onOrders: () => void; cartCount: number;
}) {
  const items = [
    { k: 'home', label: 'Home', icon: HomeIcon, onClick: () => setTab('home') },
    { k: 'menu', label: 'Menu', icon: LayoutGrid, onClick: () => setTab('menu') },
    { k: 'cart', label: 'Cart', icon: ShoppingCart, onClick: onCart, badge: cartCount },
    { k: 'orders', label: 'Orders', icon: Receipt, onClick: onOrders },
    { k: 'profile', label: 'Profile', icon: User, onClick: () => setTab('profile') },
  ] as const;
  return (
    <nav className="glass-nav fixed bottom-0 inset-x-0 z-50 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const active = tab === it.k || (it.k === 'home' && tab === 'welcome');
        return (
          <button key={it.k} onClick={it.onClick} className="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[60px]">
            <span className="relative">
              <it.icon className={`h-5 w-5 ${active ? 'app-amber' : 'text-cream-200/55'}`} />
              {'badge' in it && it.badge ? (
                <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] grid place-items-center font-bold">{it.badge}</span>
              ) : null}
            </span>
            <span className={`text-[11px] font-medium ${active ? 'app-amber' : 'text-cream-200/55'}`}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Welcome (table detected) ────────────────────────────────────────────── */

function WelcomeScreen({ cafe, table, onStart, onMenu }: { cafe: CafeWithMenu; table: any; onStart: () => void; onMenu: () => void }) {
  const est = cafe.settings?.avgPrepMinutes ? `${cafe.settings.avgPrepMinutes}` : '12–18';
  return (
    <main className="px-5 pt-8 text-center min-h-screen flex flex-col">
      <div className="mx-auto h-16 w-16 rounded-full grid place-items-center ring-amber bg-black/30 overflow-hidden">
        {cafe.logoUrl ? <Image src={cafe.logoUrl} alt={cafe.name} width={64} height={64} className="object-cover h-full w-full" /> : <Coffee className="h-8 w-8 app-amber" />}
      </div>
      <div className="font-display text-2xl font-bold text-cream-50 mt-3">{cafe.name}</div>
      <div className="text-sm app-amber">{cafe.description || 'Good coffee, good mood'}</div>

      <h1 className="font-display text-4xl font-bold text-cream-50 mt-6">Welcome to {cafe.name}</h1>
      <div className="mx-auto mt-3 h-0.5 w-12 rounded bg-amber-400/70" />

      {table ? (
        <>
          <p className="text-cream-200/65 mt-5">We&rsquo;ve detected your table</p>
          <div className="mx-auto mt-3 glass-chip rounded-full px-6 py-3 inline-flex items-center gap-3">
            <Armchair className="h-5 w-5 app-amber" />
            <span className="font-display text-xl font-bold text-cream-50">Table {table.number}</span>
          </div>
          <p className="text-cream-200/60 text-sm mt-3 max-w-xs mx-auto">You&rsquo;re all set! Start ordering and we&rsquo;ll bring it right to your table.</p>
        </>
      ) : (
        <p className="text-cream-200/65 mt-5 max-w-xs mx-auto">Browse the menu and place your takeaway order.</p>
      )}

      <div className="relative mt-6 rounded-2xl overflow-hidden aspect-[16/10] bg-black/30">
        {cafe.coverUrl ? (
          <Image src={cafe.coverUrl} alt="" fill className="object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center"><Coffee className="h-12 w-12 text-cream-200/30" /></div>
        )}
      </div>

      <div className="glass-card mt-4 grid grid-cols-2 divide-x divide-white/10">
        <div className="p-4 text-left flex items-start gap-3">
          <User className="h-6 w-6 app-amber shrink-0" />
          <div>
            <div className="font-semibold text-cream-50">{table ? 'Dine-in' : 'Takeaway'}</div>
            <div className="text-[11px] text-cream-200/55">{table ? 'You will be dining at the table' : 'Pick up at the counter'}</div>
          </div>
        </div>
        <div className="p-4 text-left flex items-start gap-3">
          <Clock3 />
          <div>
            <div className="text-[11px] text-cream-200/55">Est. Service Time</div>
            <div className="font-bold app-amber">{est} min</div>
            <div className="text-[11px] text-cream-200/55">depending on order</div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3 pb-4">
        <button onClick={onStart} className="btn-amber w-full rounded-2xl py-4 font-bold text-base inline-flex items-center justify-center gap-2">
          Start Ordering <ArrowRight className="h-5 w-5" />
        </button>
        <button onClick={onMenu} className="w-full rounded-2xl py-4 font-bold text-base inline-flex items-center justify-center gap-2 border border-amber-400/60 app-amber">
          <BookOpen className="h-5 w-5" /> View Menu
        </button>
      </div>
    </main>
  );
}
function Clock3() {
  return <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--app-amber)' }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>;
}

/* ─── Profile ─────────────────────────────────────────────────────────────── */

function ProfileScreen({ cafe, customer, onOrders }: { cafe: CafeWithMenu; customer?: any; onOrders: () => void }) {
  const loggedIn = !!customer?.phone;
  const initials = (customer?.name || 'Guest').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <main className="px-4 space-y-5">
      <h1 className="font-display text-2xl font-bold text-cream-50">Profile</h1>

      <div className="glass-card p-4 flex items-center gap-4">
        <span className="h-16 w-16 rounded-full ring-amber bg-black/30 grid place-items-center text-xl font-bold app-amber">{initials}</span>
        <div className="min-w-0">
          <div className="font-display text-xl font-bold text-cream-50 truncate">{customer?.name || 'Guest'}</div>
          <div className="text-sm text-cream-200/60 inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {loggedIn ? customer.phone : 'Not signed in'}</div>
        </div>
      </div>

      {customer?.loyaltyEnabled !== false && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-cream-200/70">{cafe.name} Rewards</div>
              <div className="font-display text-3xl font-bold app-amber leading-none mt-1">{(customer?.points ?? 0).toLocaleString()} <span className="text-base text-cream-200/60 font-sans">Points</span></div>
            </div>
            <span className="h-12 w-12 rounded-full ring-amber grid place-items-center bg-black/30"><Award className="h-6 w-6 app-amber" /></span>
          </div>
        </div>
      )}

      <button onClick={onOrders} className="glass-card w-full p-4 flex items-center gap-3 text-left">
        <span className="h-11 w-11 rounded-xl grid place-items-center glass-chip"><Receipt className="h-5 w-5 app-amber" /></span>
        <div className="flex-1"><div className="font-semibold text-cream-50">My Orders</div><div className="text-xs text-cream-200/60">Track & reorder past orders</div></div>
        <ChevronRight className="h-5 w-5 text-cream-200/50" />
      </button>

      {loggedIn ? (
        <a href={`/cafe/${cafe.slug}/account/logout`} className="glass-card w-full p-4 flex items-center gap-3 text-rose-300">
          <X className="h-5 w-5" /> <span className="font-semibold">Sign out</span>
        </a>
      ) : (
        <a href={`/cafe/${cafe.slug}/account/login`} className="btn-amber w-full rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5" /> Sign in with Magic Link
        </a>
      )}
      <p className="text-center text-xs text-cream-200/40">No password. We WhatsApp you a one-tap login link.</p>
    </main>
  );
}

/* ─── Call Waiter / service requests ──────────────────────────────────────── */

const SERVICES = [
  { k: 'call_waiter', label: 'Call Waiter', desc: 'Get assistance from our staff', icon: ConciergeBell },
  { k: 'water', label: 'Ask for Water', desc: 'Get a glass of fresh water', icon: GlassWater },
  { k: 'tissue', label: 'Need Tissue', desc: 'We\'ll bring tissues to you', icon: Sparkles },
  { k: 'clean_table', label: 'Clean Table', desc: 'Request table cleaning', icon: Leaf },
  { k: 'bill', label: 'Bill Request', desc: 'Request the final bill', icon: Receipt },
  { k: 'cutlery', label: 'Extra Cutlery', desc: 'Get extra cutlery set', icon: Coffee },
];

function CallWaiterScreen({ cafe, table, cart, totals }: { cafe: CafeWithMenu; table: any; cart: CartItem[]; totals: any }) {
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function request(kind: string) {
    setBusy(kind);
    try {
      const r = await fetch('/api/customer/service-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeSlug: cafe.slug, tableCode: table?.code, kind }),
      });
      if (!r.ok) throw new Error();
      setSent(kind);
      toast.success('Staff notified ✓');
    } catch { toast.error('Could not send request'); }
    finally { setBusy(null); }
  }

  return (
    <main className="px-4 space-y-5">
      <div className="flex items-start gap-3">
        <span className="h-14 w-14 rounded-full ring-amber grid place-items-center bg-black/30 shrink-0"><ConciergeBell className="h-7 w-7 app-amber" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold text-cream-50 leading-tight">How can we serve you today?</h1>
          <p className="text-sm text-cream-200/60 mt-1">Select a service request and our team will be right with you.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SERVICES.map((s) => {
          const on = sent === s.k;
          return (
            <button
              key={s.k}
              onClick={() => request(s.k)}
              disabled={!!busy}
              className={`glass-card p-3 flex flex-col items-center text-center gap-1.5 aspect-square justify-center ${on ? 'ring-amber' : ''}`}
            >
              {busy === s.k ? <Loader2 className="h-6 w-6 app-amber animate-spin" /> : on ? <Check className="h-6 w-6 text-emerald-400" /> : <s.icon className="h-6 w-6 app-amber" />}
              <div className="text-xs font-semibold text-cream-50 leading-tight">{s.label}</div>
              <div className="text-[10px] text-cream-200/50 leading-tight">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {sent && (
        <div className="glass-card p-4 flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-cream-100">A staff member will assist you shortly. Thank you for your patience!</span>
        </div>
      )}

      {cart.length > 0 && (
        <div className="glass-card p-4">
          <div className="font-semibold text-cream-50 mb-3">Current Order Summary</div>
          <div className="space-y-2">
            {cart.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-cream-100">{it.name}</span>
                <span className="text-cream-200/60">x{it.quantity} · {formatCurrency((it.variantPrice ?? it.unitPrice) * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-3 pt-3 flex justify-between font-bold text-cream-50">
            <span>Total</span><span className="app-amber">{formatCurrency(totals.totalAmount)}</span>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Product detail sheet ────────────────────────────────────────────────── */

function ItemDetail({ item, onClose, onAdd, theme }: any) {
  const [variant, setVariant] = useState(item.variants?.find((v: any) => v.isDefault) ?? item.variants?.[0] ?? null);
  const [selectedAddons, setSelectedAddons] = useState<any[]>(item.addons?.filter((a: any) => a.isRequired) ?? []);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  const base = variant?.price ?? item.discountedPrice ?? item.price;
  const addonSum = selectedAddons.reduce((s, a) => s + (a.price || 0), 0);
  const total = (base + addonSum) * qty;
  const isVeg = item.diet === 'VEG' || item.diet === 'VEGAN';

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="cafe-app w-full md:max-w-md !min-h-0 rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto animate-fade-up" data-theme={theme} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--app-bg)' }}>
        <div className="relative">
          <div className="relative h-52 bg-black/40">
            {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <div className="h-full grid place-items-center"><Coffee className="h-14 w-14 text-cream-200/30" /></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b1510] to-transparent" />
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full bg-black/50 text-cream-50"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 -mt-6 relative space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center justify-center h-3.5 w-3.5 border-2 rounded-sm ${isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </span>
              <Rating item={item} />
            </div>
            <h2 className="font-display text-2xl font-bold text-cream-50">{item.name}</h2>
            {item.description && <p className="text-sm text-cream-200/60 mt-1">{item.description}</p>}
            <div className="text-xl mt-2"><PriceTag item={item} /></div>
          </div>

          {item.variants?.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Size</div>
              <div className="grid grid-cols-3 gap-2">
                {item.variants.map((v: any) => (
                  <button key={v.id} onClick={() => setVariant(v)} className={`rounded-xl p-3 text-center border ${variant?.id === v.id ? 'btn-amber border-transparent' : 'glass-chip border-white/10'}`}>
                    <div className={`font-semibold text-sm ${variant?.id === v.id ? 'on-acc' : 'text-cream-50'}`}>{v.name}</div>
                    <div className={`text-xs ${variant?.id === v.id ? 'on-acc-soft' : 'text-cream-200/60'}`}>{formatCurrency(v.price)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.addons?.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-cream-100 mb-2">Add-ons</div>
              <div className="glass-card divide-y divide-white/10">
                {item.addons.map((a: any) => {
                  const checked = selectedAddons.some((x) => x.id === a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-3 p-3 cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => setSelectedAddons((x) => checked ? x.filter((y) => y.id !== a.id) : [...x, a])} className="h-4 w-4 accent-amber-500" />
                      <span className="flex-1 text-cream-100">{a.name}</span>
                      <span className="text-sm text-cream-200/60">+ {formatCurrency(a.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-cream-100 mb-2">Notes <span className="text-cream-200/40 font-normal">(optional)</span></div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="e.g. less sugar, no onion…" rows={2}
              className="glass-card w-full p-3 bg-transparent outline-none text-sm text-cream-50 placeholder:text-cream-200/40 resize-none" />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="glass-chip rounded-full flex items-center">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 grid place-items-center text-cream-100"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-bold text-cream-50">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="h-10 w-10 grid place-items-center text-cream-100"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={() => onAdd(variant, selectedAddons, note, qty)} className="btn-amber flex-1 rounded-full py-3 font-bold inline-flex items-center justify-center gap-2">
              Add to cart · {formatCurrency(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
