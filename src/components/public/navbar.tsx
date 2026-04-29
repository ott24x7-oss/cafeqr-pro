'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <Link href="/" className="flex items-center gap-2" aria-label="WatShop Cafe — home">
          {/* Plain <img> (not next/Image) so width auto-scales with the
              source's aspect ratio. Square marks (~480×480) render at
              36×36; wide lockups (~1280×427) render at ~108×36. The
              data-brand-logo attribute lets /js/branding.js swap the
              src to the admin-uploaded data URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/watshop-cafe-lockup.svg"
            alt="WatShop Cafe"
            className="h-9 w-auto max-h-9 max-w-[180px] md:max-w-[220px] object-contain"
            data-brand-logo
          />
          <span className="sr-only" data-brand-name>WatShop Cafe</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-coffee-700">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-coffee-900 transition">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-1">
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
