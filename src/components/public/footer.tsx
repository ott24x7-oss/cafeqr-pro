import Link from 'next/link';
import { Coffee } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-coffee-100 bg-cream-100/50 mt-24">
      <div className="container py-14 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            {/* The footer mark is a styled span (no <img>), so the runtime
                patcher will treat it as a background-image target if the
                admin uploads a custom logo. */}
            <span
              className="grid h-9 w-9 place-items-center rounded-xl bg-coffee-gradient text-cream-50 bg-cover bg-center"
              data-brand-logo
            >
              <Coffee className="h-5 w-5" data-brand-logo-icon />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-coffee-900" data-brand-name>
              CafeQR <span className="text-caramel">Pro</span>
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-coffee-600" data-brand-tagline>
            The all-in-one QR ordering platform built for cafes, restaurants and cloud kitchens. Take orders without an
            app, manage everything from one dashboard.
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
      </div>
      <div className="border-t border-coffee-100 py-5 text-center text-xs text-coffee-500" data-brand-footer>
        © {new Date().getFullYear()} CafeQR Pro. Brewed with ☕
      </div>
    </footer>
  );
}
