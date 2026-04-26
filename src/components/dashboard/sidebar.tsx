'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, ListOrdered, Utensils, QrCode, CreditCard, Star, Users, Settings, BarChart3, Receipt,
  Coffee, LogOut, Bell, Shield, Tag, History, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { href: string; label: string; icon: any; roleAdmin?: boolean }

export function DashboardSidebar({ role, cafeName, isAdmin }: { role: string; cafeName?: string; isAdmin?: boolean }) {
  const path = usePathname();

  const ownerNav: NavItem[] = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Live Orders', icon: ListOrdered },
    { href: '/dashboard/orders/history', label: 'Order History', icon: History },
    { href: '/dashboard/menu', label: 'Menu', icon: Utensils },
    { href: '/dashboard/tables', label: 'Tables & QR', icon: QrCode },
    { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
    { href: '/dashboard/coupons', label: 'Coupons', icon: Tag },
    { href: '/dashboard/staff', label: 'Staff', icon: Users },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/billing', label: 'Billing', icon: Receipt },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const adminNav: NavItem[] = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/cafes', label: 'Cafes', icon: Coffee },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/plans', label: 'Plans', icon: CreditCard },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: Receipt },
    { href: '/admin/site', label: 'Site & Email', icon: Globe },
  ];

  const nav = isAdmin ? adminNav : ownerNav;

  const limited = role === 'KITCHEN' ? ['/dashboard', '/dashboard/orders'] :
                  role === 'WAITER'  ? ['/dashboard', '/dashboard/orders', '/dashboard/orders/history', '/dashboard/tables'] :
                  role === 'CASHIER' ? ['/dashboard', '/dashboard/orders', '/dashboard/orders/history', '/dashboard/payments', '/dashboard/billing'] : null;

  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-coffee-100 bg-white sticky top-0 h-screen">
      <div className="px-5 py-4 border-b border-coffee-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coffee-gradient text-cream-50">
            {isAdmin ? <Shield className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-coffee-900 truncate">{isAdmin ? 'Super Admin' : 'CafeQR Pro'}</div>
            {!isAdmin && cafeName && <div className="text-[11px] text-coffee-500 truncate">{cafeName}</div>}
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
          <Bell className="h-4 w-4" /> Public site
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
  const items = isAdmin ? [
    { href: '/admin', label: 'Home', icon: LayoutDashboard },
    { href: '/admin/cafes', label: 'Cafes', icon: Coffee },
    { href: '/admin/plans', label: 'Plans', icon: CreditCard },
    { href: '/admin/users', label: 'Users', icon: Users },
  ] : [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered },
    { href: '/dashboard/menu', label: 'Menu', icon: Utensils },
    { href: '/dashboard/tables', label: 'Tables', icon: QrCode },
    { href: '/dashboard/analytics', label: 'Stats', icon: BarChart3 },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-coffee-100 bg-white/95 backdrop-blur grid grid-cols-5">
      {items.map((it) => {
        const active = path === it.href || (it.href !== '/dashboard' && it.href !== '/admin' && path.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn('flex flex-col items-center gap-0.5 py-2 text-xs', active ? 'text-coffee-900' : 'text-coffee-500')}
          >
            <it.icon className={cn('h-5 w-5', active && 'text-coffee-700')} />
            <span className="text-[10px]">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
