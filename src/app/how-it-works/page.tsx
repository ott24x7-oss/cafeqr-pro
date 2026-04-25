import Link from 'next/link';
import { ArrowRight, QrCode, Smartphone, Bell, ChefHat, CreditCard, Star } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'How CafeQR Pro Works' };

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="container relative py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800">
            How it works
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold text-coffee-900">From scan to served</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-coffee-700">
            A complete walkthrough of the customer + cafe owner flow. End-to-end ordering in minutes.
          </p>
        </div>
      </section>

      {/* Step zigzag */}
      <section className="container pb-16">
        {steps.map((s, i) => (
          <div key={s.t} className={`grid lg:grid-cols-2 gap-10 items-center mb-16 ${i % 2 ? 'lg:[&>:first-child]:order-2' : ''}`}>
            <div>
              <span className="pill bg-cream-200 text-coffee-800 mb-3">Step {String(i + 1).padStart(2, '0')}</span>
              <h2 className="font-display text-3xl font-bold text-coffee-900 mb-3 flex items-center gap-3">
                <s.i className="h-7 w-7 text-caramel-dark" /> {s.t}
              </h2>
              <p className="text-coffee-700">{s.d}</p>
              <ul className="mt-5 space-y-2">
                {s.b.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-coffee-700">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-caramel" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-warm aspect-[5/4] flex items-center justify-center bg-cream-gradient overflow-hidden">
              <s.mock />
            </div>
          </div>
        ))}
      </section>

      <section className="container py-12">
        <div className="rounded-3xl bg-coffee-gradient p-10 md:p-14 text-center text-cream-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-10" />
          <h2 className="relative font-display text-3xl md:text-4xl font-bold">Ready to brew the future of ordering?</h2>
          <p className="relative mt-3 max-w-xl mx-auto text-cream-200/90">
            Try CafeQR Pro free for 14 days. No card required.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/signup"><Button variant="accent" size="lg">Start free trial <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/pricing"><Button variant="outline" size="lg" className="border-cream-200 bg-transparent text-cream-50 hover:bg-white/10">View pricing</Button></Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}

const steps = [
  {
    t: 'Customer scans the table QR',
    i: QrCode,
    d: 'Each table gets its own unique QR. Customers scan with the camera, no app download required. The menu opens in their browser instantly.',
    b: ['Unique QR per table — auto-detects table number', 'Mobile-first menu opens in <1s', 'Works on any phone, no installs'],
    mock: () => (
      <div className="text-center">
        <div className="mx-auto h-40 w-40 rounded-2xl bg-white border-4 border-coffee-700 grid place-items-center shadow-coffee">
          <QrCode className="h-28 w-28 text-coffee-900" />
        </div>
        <div className="mt-4 font-bold text-coffee-900">Table #07</div>
        <div className="text-xs text-coffee-600">cafeqr.pro/cafe/mocha/table/T7</div>
      </div>
    ),
  },
  {
    t: 'Browse menu & build the cart',
    i: Smartphone,
    d: 'Beautifully designed mobile menu with categories, search, veg/non-veg indicators, item images, variants and add-ons. Add notes per item.',
    b: ['Variants (Half/Full), add-ons, item notes', 'Veg/non-veg + spicy badges', 'Sticky cart on mobile, fast checkout'],
    mock: () => (
      <div className="w-56 rounded-2xl bg-white p-4 shadow-coffee">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-cream-200 last:border-0">
            <div className="h-10 w-10 bg-coffee-gradient rounded-lg" />
            <div className="flex-1 text-xs">
              <div className="font-semibold text-coffee-900">Item {i}</div>
              <div className="text-coffee-500">₹{120 + i * 40}</div>
            </div>
            <button className="h-6 w-6 rounded-full bg-coffee-700 text-cream-50 text-xs">+</button>
          </div>
        ))}
        <div className="mt-3 bg-coffee-gradient rounded-xl text-cream-50 text-center text-xs font-bold py-2">View cart · ₹520</div>
      </div>
    ),
  },
  {
    t: 'Owner & kitchen get instant alerts',
    i: Bell,
    d: 'New order shows on the dashboard with sound. WhatsApp notification sent to the owner. Kitchen display screen updates live.',
    b: ['Sound + browser notification on new order', 'WhatsApp ping to owner via wa.me', 'Kitchen view filters to relevant orders only'],
    mock: () => (
      <div className="space-y-2 w-64">
        {[
          { n: '#1284', t: 'Just now', tone: 'border-amber-300 bg-amber-50' },
          { n: '#1283', t: '2 min ago', tone: 'border-orange-300 bg-orange-50' },
          { n: '#1282', t: '5 min ago', tone: 'border-emerald-300 bg-emerald-50' },
        ].map((o) => (
          <div key={o.n} className={`rounded-xl border-l-4 bg-white p-3 ${o.tone}`}>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-coffee-900">{o.n}</span>
              <span className="text-xs text-coffee-500">{o.t}</span>
            </div>
            <div className="text-xs text-coffee-600 mt-1">3 items · Table 7</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    t: 'Track status, prepare, mark ready',
    i: ChefHat,
    d: 'Move orders through the pipeline with one tap: Accepted → Preparing → Ready → Served → Completed. Each step pings the customer.',
    b: ['Drag/click to update status', 'Auto WhatsApp update to customer at each step', 'Per-item prep time so kitchen plans ahead'],
    mock: () => (
      <div className="flex flex-col gap-2 w-64">
        {['Accepted ✓', 'Preparing ✓', 'Ready', 'Served', 'Completed'].map((s, i) => (
          <div key={s} className={`rounded-xl px-3 py-2 text-sm ${i < 2 ? 'bg-coffee-700 text-cream-50' : 'bg-cream-200 text-coffee-700'}`}>
            {s}
          </div>
        ))}
      </div>
    ),
  },
  {
    t: 'Send bill, accept payment',
    i: CreditCard,
    d: 'One-click bill PDF with cafe details, items, GST. Send via WhatsApp. Customer pays via UPI deep-link, scans your UPI QR or pays cash.',
    b: ['Auto-generated bill PDF, GST-ready', 'UPI deep link + QR + transaction ID upload', 'You verify, mark paid — done'],
    mock: () => (
      <div className="rounded-2xl bg-white p-4 w-56 shadow-coffee text-xs">
        <div className="font-bold text-coffee-900 mb-1">Cafe Mocha</div>
        <div className="text-coffee-500">Bill #1284</div>
        <div className="border-t border-cream-200 my-2" />
        <div className="flex justify-between"><span>Cappuccino × 2</span><span>360</span></div>
        <div className="flex justify-between"><span>Croissant × 1</span><span>120</span></div>
        <div className="border-t border-cream-200 my-2" />
        <div className="flex justify-between font-bold text-coffee-900"><span>Total</span><span>₹520</span></div>
        <div className="bg-wagreen text-white rounded-lg text-center py-1.5 mt-3 font-bold">Pay via UPI</div>
      </div>
    ),
  },
  {
    t: 'Get reviews & repeat customers',
    i: Star,
    d: 'After serving, customer gets a one-tap review link. 5-star ratings boost your dashboard score. Optional Google review redirect builds your local SEO.',
    b: ['1-tap review link sent post-meal', 'Owner replies to reviews from dashboard', 'Optional redirect to Google reviews'],
    mock: () => (
      <div className="rounded-2xl bg-white p-5 w-64 shadow-coffee text-center">
        <div className="text-3xl font-bold text-coffee-900">4.9</div>
        <div className="flex justify-center my-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-caramel text-caramel" />
          ))}
        </div>
        <div className="text-xs text-coffee-500">Based on 128 reviews</div>
        <div className="mt-3 text-xs text-coffee-700 italic">"Best cappuccino in town!"</div>
      </div>
    ),
  },
];
