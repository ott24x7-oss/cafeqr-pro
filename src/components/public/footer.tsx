import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { getPlatformBranding } from '@/lib/platform-branding';

export async function PublicFooter() {
  const { logoUrl, brandName, tagline, footerText } = await getPlatformBranding();
  const isDataUrl = logoUrl.startsWith('data:');

  // When admin uploaded a custom logo we paint it as the footer mark's
  // background so the same image shows everywhere; otherwise fall back
  // to the gradient + Coffee glyph already in the design system. SSR
  // means no flash; /js/branding.js still re-applies on patch.
  const markStyle = isDataUrl
    ? { backgroundImage: `url("${logoUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <footer className="border-t border-coffee-100 bg-cream-100/50 mt-24">
      <div className="container py-14 grid gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl bg-coffee-gradient text-cream-50 bg-cover bg-center"
              data-brand-logo
              style={markStyle}
            >
              {/* Coffee fallback hidden when we already have a custom logo
                  baked into the background. The data-brand-logo-icon attr
                  also lets the runtime patcher hide it on later updates. */}
              {!isDataUrl && <Coffee className="h-5 w-5" data-brand-logo-icon />}
            </span>
            <span
              className="font-display text-xl font-bold tracking-tight text-coffee-900"
              data-brand-name
            >
              {brandName}
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-coffee-600" data-brand-tagline>
            {tagline ||
              'The all-in-one QR ordering platform built for cafes, restaurants and cloud kitchens. Take orders without an app, manage everything from one dashboard.'}
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-coffee-900 mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-coffee-600">
            <li><Link href="/how-it-works" className="hover:text-coffee-900">How it works</Link></li>
            <li><Link href="/for-customers" className="hover:text-coffee-900">For customers</Link></li>
            <li><Link href="/for-owners" className="hover:text-coffee-900">For cafe owners</Link></li>
            <li><Link href="/pricing" className="hover:text-coffee-900">Pricing</Link></li>
            <li><Link href="/signup" className="hover:text-coffee-900">Free trial</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-coffee-900 mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-coffee-600">
            <li><Link href="/login" className="hover:text-coffee-900">Login</Link></li>
            <li><Link href="/my-orders" className="hover:text-coffee-900">Track my orders</Link></li>
            <li><a href="mailto:hello@cafeqr.pro" className="hover:text-coffee-900">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-coffee-900 mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-coffee-600">
            <li><Link href="/terms" className="hover:text-coffee-900">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-coffee-900">Privacy Policy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-coffee-900">Refund Policy</Link></li>
          </ul>
        </div>
      </div>
      <div
        className="border-t border-coffee-100 py-5 text-center text-xs text-coffee-500"
        data-brand-footer
      >
        {footerText || `© ${new Date().getFullYear()} ${brandName}. Brewed with ☕`}
      </div>
    </footer>
  );
}
