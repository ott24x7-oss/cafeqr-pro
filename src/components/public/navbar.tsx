'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Coffee, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/demo', label: 'Demo' },
    { href: '/for-customers', label: 'For customers' },
    { href: '/for-owners', label: 'For owners' },
    { href: '/pricing', label: 'Pricing' },
  ];
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-cream-50/85 border-b border-coffee-100">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coffee-gradient text-cream-50 shadow-soft">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-coffee-900">
            CafeQR <span className="text-caramel">Pro</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-coffee-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-coffee-900 transition">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button className="p-2" onClick={() => setOpen((o) => !o)} aria-label="menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-coffee-100 bg-cream-50 px-4 py-3 flex flex-col gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="py-2 text-coffee-800" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Login</Button></Link>
            <Link href="/signup" className="flex-1"><Button className="w-full">Sign up</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}
