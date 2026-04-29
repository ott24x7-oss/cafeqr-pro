import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPlatformBranding } from '@/lib/platform-branding';
import { MobileMenuToggle } from './mobile-menu-toggle';

/**
 * Server component. Reads the platform branding once per request (React
 * cache dedupes shared use with PublicFooter) and renders the resolved
 * logo + brand name into the initial HTML so there's no flash of the
 * default logo before /js/branding.js patches the DOM. The runtime
 * patcher still runs as a safety net for edits that land between SSR
 * cache windows.
 */
export async function PublicNavbar() {
  const { logoUrl, brandName } = await getPlatformBranding();

  const links = [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/demo', label: 'Demo' },
    { href: '/for-customers', label: 'For customers' },
    { href: '/for-owners', label: 'For owners' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-cream-50/85 border-b border-coffee-100 relative">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={`${brandName} — home`}>
          {/* Plain <img> so width auto-scales with the source's aspect.
              Square marks (~480×480) render at 36×36; wide lockups
              (~1280×427) render at ~108×36. data-brand-logo lets
              /js/branding.js still patch the src if branding changes
              client-side after this initial server render. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={brandName}
            className="h-9 w-auto max-h-9 max-w-[180px] md:max-w-[220px] object-contain"
            data-brand-logo
          />
          <span className="sr-only" data-brand-name>{brandName}</span>
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
          <MobileMenuToggle links={links} />
        </div>
      </div>
    </header>
  );
}
