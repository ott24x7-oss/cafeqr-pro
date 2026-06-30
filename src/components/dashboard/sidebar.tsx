'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, ListOrdered, Utensils, QrCode, CreditCard, Star, Users, Settings, BarChart3,
  Coffee, LogOut, Tag, History, Globe, Award, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { href: string; label: string; icon: any; roleAdmin?: boolean }

const OWNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Live Orders', icon: ListOrdered },
  { href: '/dashboard/orders/history', label: 'Order History', icon: History },
  { href: '/dashboard/menu', label: 'Menu', icon: Utensils },
  { href: '/dashboard/tables', label: 'Tables & QR', icon: QrCode },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/coupons', label: 'Coupons', icon: Tag },
  { href: '/dashboard/loyalty', label: 'Loyalty', icon: Award },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

// Single-cafe build: only the owner/staff dashboard nav exists now.
function navItemsFor(_role: string, _isAdmin?: boolean): NavItem[] {
  return OWNER_NAV;
}

export function DashboardSidebar({ role, cafeName, isAdmin }: { role: string; cafeName?: string; isAdmin?: boolean }) {
  const path = usePathname();

  const nav = navItemsFor(role, isAdmin);

  const limited = role === 'KITCHEN' ? ['/dashboard', '/dashboard/orders'] :
                  role === 'WAITER'  ? ['/dashboard', '/dashboard/orders', '/dashboard/orders/history', '/dashboard/tables'] :
                  role === 'CASHIER' ? ['/dashboard', '/dashboard/orders', '/dashboard/orders/history', '/dashboard/payments'] : null;

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-coffee-100 bg-white sticky top-0 h-screen">
      <div className="px-5 py-4 border-b border-coffee-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl bg-coffee-gradient text-cream-50 bg-cover bg-center"
            data-brand-logo
          >
            <Coffee className="h-5 w-5" data-brand-logo-icon />
          </span>
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-coffee-900 truncate">
              {cafeName ?? 'Cafe'}
            </div>
          </div>
        </Link>
      </div>

      <nav className="px-3 py-3 flex-1 overflow-y-auto">
        {nav.map((item) => {
          // Exact match for short paths; startsWith for nested. Avoid Live Orders
          // matching while on /dashboard/orders/history.
          const active = path === item.href ||
            (item.href !== '/dashboard' && item.href !== '/dashboard/orders' &&
              path.startsWith(item.href + '/')) ||
            (item.href === '/dashboard/orders' &&
              (path === '/dashboard/orders' ||
                (path.startsWith('/dashboard/orders/') && !path.startsWith('/dashboard/orders/history'))));
          const disabled = limited && !limited.includes(item.href);
          return (
            <Link
              key={item.href}
              href={disabled ? '#' : item.href}
              onClick={disabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium mb-0.5 transition',
                active ? 'bg-coffee-700 text-cream-50' : 'text-coffee-700 hover:bg-cream-100',
                disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-coffee-100 space-y-1">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-coffee-700 hover:bg-cream-100">
          <Globe className="h-4 w-4" /> Public site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-coffee-700 hover:bg-cream-100"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const path = usePathname();
  // Bottom nav stays slim — 4 quick-access shortcuts plus a Menu button
  // that opens MobileNavDrawer with the full nav + sign out. Anything not
  // pinned here is reachable from the drawer.
  const shortcuts = isAdmin ? [
    { href: '/admin', label: 'Home', icon: LayoutDashboard },
    { href: '/admin/cafes', label: 'Cafes', icon: Coffee },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  ] : [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered },
    { href: '/dashboard/menu', label: 'Menu', icon: Utensils },
    { href: '/dashboard/tables', label: 'Tables', icon: QrCode },
  ];
  return (
    // z-50 keeps the nav above modal-backdrops we don't own (e.g. Chrome
    // mobile's password-autofill chip). Solid bg + thicker shadow so a
    // transient autofill bar can't make individual cells invisible. py-2.5
    // + min-h-[56px] gives a Material-guideline tappable height even when
    // the OS UI eats some pixels.
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t-2 border-coffee-200 bg-white grid grid-cols-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(85,60,40,0.18)]"
    >
      {shortcuts.map((it) => {
        const active = path === it.href || (it.href !== '/dashboard' && it.href !== '/admin' && path.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs min-h-[56px]',
              active ? 'text-coffee-900' : 'text-coffee-500',
            )}
          >
            <it.icon className={cn('h-5 w-5', active && 'text-coffee-700')} />
            <span className="text-[11px] font-medium">{it.label}</span>
          </Link>
        );
      })}
      {/* The 5th cell hosts the drawer toggle so all the rest of the
          screens (Subscriptions / Settings / Sign out / etc.) are always
          one tap away. */}
      <MobileMenuButton isAdmin={isAdmin} />
    </nav>
  );
}

/**
 * Hamburger button that opens [MobileNavDrawer]. Has two modes:
 *
 *   compact = true  → icon-only square button, used in the dashboard
 *                     top header where vertical space is tight.
 *   compact = false → icon + "Menu" label stacked, used as the 5th
 *                     cell of the bottom nav so it lines up with the
 *                     other Home / Orders / Menu / Tables cells.
 */
export function MobileMenuButton({
  isAdmin, className, compact = false,
}: {
  isAdmin?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={cn(
          compact
            ? 'grid h-10 w-10 place-items-center rounded-lg text-coffee-800 hover:bg-cream-100 active:bg-cream-200'
            : 'flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs min-h-[56px] text-coffee-700',
          className,
        )}
      >
        <Menu className={compact ? 'h-5 w-5' : 'h-5 w-5'} />
        {!compact && <span className="text-[11px] font-medium">Menu</span>}
      </button>
      {open && <MobileNavDrawer isAdmin={isAdmin} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Slide-in nav drawer used on small screens. Mirrors the desktop sidebar:
 * full nav, public-site link, sign-out button. Closes on backdrop tap,
 * Escape, route change, and hardware back (Android — handled by the
 * WebView's history stack since we don't push history on open).
 */
function MobileNavDrawer({ isAdmin, onClose }: { isAdmin?: boolean; onClose: () => void }) {
  const path = usePathname();
  const nav = navItemsFor('OWNER', isAdmin);

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Auto-close when the route changes — the user clicked a link. Skip the
  // first run so opening the drawer on a fresh route doesn't immediately
  // close it.
  const initialPath = useRef(path);
  useEffect(() => {
    if (path !== initialPath.current) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Explicit inline backgroundColor as a belt-and-suspenders fallback —
          some Android WebViews dropped Tailwind's bg-white in past builds and
          the dashboard page bled through the drawer. */}
      <aside
        className="absolute left-0 top-0 bottom-0 w-[82%] max-w-[320px] bg-white shadow-2xl flex flex-col"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-coffee-100 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-coffee-gradient text-cream-50 shrink-0">
              <Coffee className="h-4 w-4" />
            </span>
            <div className="font-display text-base font-bold text-coffee-900 truncate">
              Menu
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-coffee-700 hover:bg-cream-100 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-3 flex-1 overflow-y-auto bg-white">
          {nav.map((item) => {
            const active = path === item.href ||
              (item.href !== '/dashboard' && item.href !== '/admin' &&
                path.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium mb-0.5 transition',
                  active ? 'bg-coffee-700 text-cream-50' : 'text-coffee-700 hover:bg-cream-100',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-coffee-100 space-y-0.5 bg-white">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-coffee-700 hover:bg-cream-100"
          >
            <Globe className="h-4 w-4" /> View cafe site
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
