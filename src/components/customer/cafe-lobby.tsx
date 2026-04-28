'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  Coffee, MapPin, Phone, Search, ShoppingBag, Truck, Users, Clock, Star, ChevronRight, Sparkles, Utensils, Flame, User,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

type Table = {
  id: string;
  number: string;
  name: string | null;
  code: string;
  area: string | null;
  capacity: number;
  isOccupied: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  discountedPrice: number | null;
  imageUrl: string | null;
  isPopular: boolean;
  inStock: boolean;
  diet: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  items: MenuItem[];
};

type Cafe = {
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string;
  tables: Table[];
  categories?: Category[];
  settings?: {
    acceptDineIn?: boolean;
    acceptTakeaway?: boolean;
    acceptDelivery?: boolean;
    primaryColor?: string;
    accentColor?: string;
  } | null;
};

export function CafeLobby({ cafe }: { cafe: Cafe }) {
  const [q, setQ] = useState('');

  const groupedTables = useMemo(() => {
    const filtered = cafe.tables.filter((t) =>
      !q ||
      t.number.toLowerCase().includes(q.toLowerCase()) ||
      (t.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (t.area ?? '').toLowerCase().includes(q.toLowerCase())
    );
    const groups = new Map<string, Table[]>();
    for (const t of filtered) {
      const key = t.area?.trim() || 'Tables';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries());
  }, [cafe.tables, q]);

  const accepts = cafe.settings ?? {};
  const showTakeaway = accepts.acceptTakeaway ?? true;
  const showDelivery = accepts.acceptDelivery ?? false;

  return (
    <div
      className="min-h-screen bg-cream-50 pb-16"
      style={{
        // Allow per-cafe brand colours to bleed into hero accents.
        ['--brand' as any]: cafe.settings?.primaryColor ?? '#6B4E3D',
        ['--accent' as any]: cafe.settings?.accentColor ?? '#D4A574',
      }}
    >
      {/* Hero */}
      <header className="relative">
        <div className="h-40 sm:h-56 md:h-64 w-full bg-coffee-gradient relative overflow-hidden">
          {cafe.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cafe.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/30" />
        </div>
        {/* Customer account entry point — sign in to track orders, see
            history and check loyalty points. Lives in the hero overlay so
            it's discoverable from the cafe storefront without needing a
            full nav bar. */}
        <Link
          href={`/cafe/${cafe.slug}/account`}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-coffee-800 shadow-soft hover:bg-white"
        >
          <User className="h-3.5 w-3.5" /> My account
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-16 sm:-mt-20 relative space-y-5">
        {/* Cafe info card — sits over the hero */}
        <section className="rounded-2xl bg-white border border-coffee-100 shadow-coffee p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-cream-50 grid place-items-center overflow-hidden ring-1 ring-coffee-100 shrink-0">
              {cafe.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cafe.logoUrl} alt={cafe.name} className="h-full w-full object-cover" />
              ) : (
                <Coffee className="h-8 w-8 sm:h-10 sm:w-10 text-coffee-700" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-coffee-900 leading-tight truncate">
                {cafe.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-coffee-600">
                {(cafe.city || cafe.address) && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{cafe.address ?? cafe.city}</span>
                  </span>
                )}
                {cafe.phone && (
                  <a href={`tel:${cafe.phone}`} className="inline-flex items-center gap-1 hover:text-coffee-900">
                    <Phone className="h-3 w-3" /> {cafe.phone}
                  </a>
                )}
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Clock className="h-3 w-3" /> Open
                </span>
              </div>
            </div>
          </div>
          {cafe.description && (
            <p className="mt-3 text-sm text-coffee-700">{cafe.description}</p>
          )}
          {/* Quick stats strip — fills the empty space below the description
              with something useful at a glance. */}
          {(() => {
            const allItems = (cafe.categories ?? []).flatMap((c) => c.items);
            const tableCount = cafe.tables.length;
            const itemCount = allItems.length;
            const catCount = (cafe.categories ?? []).filter((c) => c.items.length > 0).length;
            if (!itemCount && !tableCount) return null;
            return (
              <div className="mt-3 pt-3 border-t border-coffee-100 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-coffee-600">
                {itemCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-coffee-500" /> {itemCount} dishes
                  </span>
                )}
                {catCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-coffee-500" /> {catCount} categories
                  </span>
                )}
                {tableCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-coffee-500" /> {tableCount} tables
                  </span>
                )}
              </div>
            );
          })()}
        </section>

        <div className="space-y-6">
        {/* Bestsellers strip — horizontal scroll of popular items so the
            page lands with food, not just navigation. */}
        {(() => {
          const bestsellers = (cafe.categories ?? [])
            .flatMap((c) => c.items)
            .filter((i) => i.isPopular && i.inStock !== false)
            .slice(0, 8);
          if (bestsellers.length === 0) return null;
          return (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-coffee-900 inline-flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-500" /> Bestsellers
                </h2>
                <span className="text-xs text-coffee-500">{bestsellers.length}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x scroll-smooth scrollbar-none">
                {bestsellers.map((it) => (
                  <Link
                    key={it.id}
                    href={`/cafe/${cafe.slug}/table/walk-in`}
                    className="snap-start shrink-0 w-36 sm:w-40 group"
                  >
                    <div className="relative h-32 sm:h-36 rounded-2xl overflow-hidden bg-coffee-gradient">
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt={it.name} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-cream-50/60">
                          <Coffee className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5">
                        <span
                          className={`inline-flex items-center justify-center h-3.5 w-3.5 border-2 bg-white rounded-sm ${
                            it.diet === 'VEG' || it.diet === 'VEGAN' ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                          title={it.diet === 'VEG' || it.diet === 'VEGAN' ? 'Veg' : 'Non-veg'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${it.diet === 'VEG' || it.diet === 'VEGAN' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        </span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <div className="text-cream-50 text-xs font-semibold leading-tight line-clamp-2 group-hover:underline">
                          {it.name}
                        </div>
                        <div className="text-cream-200 text-[11px] mt-0.5">
                          {formatCurrency(it.discountedPrice ?? it.price, cafe.currency ?? 'INR')}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Browse menu — categories preview with a 'View all' deep-link.
            Each tile shows the category name + item count + first item names so
            the customer can see what's on offer without scanning a table QR. */}
        {(cafe.categories ?? []).filter((c) => c.items.length > 0).length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-coffee-900">Browse menu</h2>
              <Link
                href={`/cafe/${cafe.slug}/table/walk-in`}
                className="text-xs text-coffee-700 hover:text-coffee-900 inline-flex items-center gap-0.5"
              >
                View full menu <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(cafe.categories ?? [])
                .filter((c) => c.items.length > 0)
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/cafe/${cafe.slug}/table/walk-in`}
                    className="group relative rounded-2xl overflow-hidden border border-coffee-100 bg-white hover:shadow-coffee transition active:scale-[0.99]"
                  >
                    <div className="relative h-24 sm:h-28 bg-coffee-gradient">
                      {c.items[0]?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.items[0].imageUrl}
                          alt={c.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-cream-50/60">
                          <Utensils className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      <div className="absolute bottom-1.5 left-2 right-2 text-cream-50">
                        <div className="text-sm font-bold leading-tight line-clamp-1">{c.name}</div>
                        <div className="text-[10px] text-cream-200/90">{c.items.length} items</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1.5 text-[11px] text-coffee-600 line-clamp-1">
                      {c.items.slice(0, 3).map((i) => i.name).join(' · ')}
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3">
          {showTakeaway && (
            <Link
              href={`/cafe/${cafe.slug}/table/walk-in?type=TAKEAWAY`}
              className="card-warm hover:shadow-coffee active:scale-[0.99] transition group !p-4"
            >
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-amber-100 text-amber-700 mb-2">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="font-semibold text-coffee-900">Takeaway</div>
              <div className="text-xs text-coffee-600">Order to-go</div>
            </Link>
          )}
          {showDelivery && (
            <Link
              href={`/cafe/${cafe.slug}/table/walk-in?type=DELIVERY`}
              className="card-warm hover:shadow-coffee active:scale-[0.99] transition group !p-4"
            >
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 mb-2">
                <Truck className="h-5 w-5" />
              </div>
              <div className="font-semibold text-coffee-900">Delivery</div>
              <div className="text-xs text-coffee-600">Get it delivered</div>
            </Link>
          )}
          {!showTakeaway && !showDelivery && (
            <Link
              href={`/cafe/${cafe.slug}/table/walk-in`}
              className="card-warm hover:shadow-coffee active:scale-[0.99] transition !p-4 col-span-2"
            >
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-amber-100 text-amber-700 mb-2">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="font-semibold text-coffee-900">Browse menu (walk-in)</div>
              <div className="text-xs text-coffee-600">No table number? Tap here.</div>
            </Link>
          )}
        </section>

        {/* Tables */}
        {cafe.tables.length === 0 ? (
          <section className="card-warm text-center py-10">
            <Coffee className="mx-auto h-8 w-8 text-coffee-400" />
            <div className="mt-2 font-semibold text-coffee-900">No tables added yet</div>
            <p className="text-sm text-coffee-600 mt-1">Ask staff to set up tables, or use walk-in.</p>
            <Link
              href={`/cafe/${cafe.slug}/table/walk-in`}
              className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-xl bg-coffee-700 text-cream-50 text-sm font-semibold"
            >
              Walk-in menu <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-3 gap-3">
              <h2 className="font-display text-lg sm:text-xl font-bold text-coffee-900">Pick your table</h2>
              <span className="text-xs text-coffee-500">{cafe.tables.length} tables</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by number, name or area"
                className="pl-9"
              />
            </div>

            {groupedTables.length === 0 ? (
              <div className="text-center text-sm text-coffee-500 py-8">No tables match.</div>
            ) : (
              <div className="space-y-5">
                {groupedTables.map(([area, list]) => (
                  <div key={area}>
                    <div className="text-xs uppercase tracking-wide text-coffee-500 mb-2 px-1">{area}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                      {list.map((t) => (
                        <Link
                          key={t.id}
                          href={`/cafe/${cafe.slug}/table/${t.code}`}
                          className={`group relative rounded-2xl border bg-white px-2 py-3 text-center shadow-sm hover:shadow-coffee transition active:scale-[0.97] ${
                            t.isOccupied ? 'border-amber-200' : 'border-coffee-100'
                          }`}
                        >
                          <div className="font-display text-2xl sm:text-3xl font-bold text-coffee-900 leading-none">
                            {t.number}
                          </div>
                          {t.name && (
                            <div className="text-[10px] text-coffee-500 truncate mt-1">{t.name}</div>
                          )}
                          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-coffee-500">
                            <Users className="h-3 w-3" /> {t.capacity}
                          </div>
                          {t.isOccupied && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400" title="Occupied" />
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 text-center">
              <Link
                href={`/cafe/${cafe.slug}/table/walk-in`}
                className="inline-flex items-center gap-1 text-sm text-coffee-700 underline underline-offset-4 hover:text-coffee-900"
              >
                Don't have a table? Use walk-in →
              </Link>
            </div>
          </section>
        )}

          {/* Footer info */}
          <section className="pt-3 border-t border-coffee-100 text-xs text-coffee-500 flex flex-wrap items-center justify-between gap-2">
            <span>Live orders · powered by CafeQR Pro</span>
            {cafe.phone && (
              <a href={`tel:${cafe.phone}`} className="inline-flex items-center gap-1 hover:text-coffee-800">
                <Phone className="h-3 w-3" /> {cafe.phone}
              </a>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
