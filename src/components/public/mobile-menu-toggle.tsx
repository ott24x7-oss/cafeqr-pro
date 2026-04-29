'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Tiny client island for the mobile hamburger drawer. Lives inside the
 * server-rendered PublicNavbar so the parent doesn't need to be a client
 * component just to manage `open` state.
 */
export function MobileMenuToggle({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="p-2"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X /> : <Menu />}
      </button>

      {open && (
        <div className="md:hidden absolute left-0 right-0 top-16 border-t border-coffee-100 bg-cream-50 px-4 py-3 flex flex-col gap-2 shadow-coffee">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-2 text-coffee-800"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">Login</Button>
            </Link>
            <Link href="/signup" className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full">Sign up</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
