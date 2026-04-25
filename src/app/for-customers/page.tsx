import Link from 'next/link';
import {
  ArrowRight, QrCode, Smartphone, ShoppingCart, Bell, Star, CreditCard,
  CheckCircle2, MessageSquare, Coffee, Sparkles,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  ScanQRScreen, MenuScreen, CartScreen, TrackingScreen, PayScreen, ReviewScreen,
} from '@/components/mockups/screens';

export const metadata = { title: 'For customers — Order in seconds' };

export default function ForCustomersPage() {
  return (
    <div className="min-h-screen bg-cream-50 overflow-hidden">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-caramel/20 blur-3xl" />

        <div className="container relative pt-12 md:pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800 mb-4">
              <Sparkles className="h-3.5 w-3.5" /> For customers
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-coffee-900">
              Order in <span className="text-gradient-coffee">30 seconds.</span>
            </h1>
            <p className="mt-4 text-lg text-coffee-700 max-w-md mx-auto lg:mx-0">
              Scan the QR. Pick what you love. Done.
            </p>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3">
              <Link href="/cafe/cafe-mocha">
                <Button size="lg">Try the demo <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/my-orders">
                <Button variant="outline" size="lg">Track my orders</Button>
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-coffee-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No app downloads</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />No signups</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Pay via UPI</span>
            </div>
          </div>

          <div className="relative h-[500px] flex items-center justify-center">
            <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
          </div>
        </div>
      </section>

      {/* 5-STEP CUSTOMER FLOW */}
      <section className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="pill bg-cream-200 text-coffee-800">Customer journey</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            Five taps. That's it.
          </h2>
        </div>

        {[
          {
            n: '01',
            t: 'Scan the table QR',
            d: 'Open your phone camera. Point at the QR on your table. Tap the link.',
            tips: ['Works on every phone', 'No app to install', 'Camera unlock not needed'],
            screen: <ScanQRScreen />,
            icon: QrCode,
          },
          {
            n: '02',
            t: 'Browse the menu',
            d: 'Beautiful photos, prices, veg/non-veg badges, spicy levels — everything you need.',
            tips: ['Search dishes', 'Filter by category', 'See bestsellers'],
            screen: <MenuScreen />,
            icon: Smartphone,
          },
          {
            n: '03',
            t: 'Add to cart',
            d: 'Pick variants (half/full), add-ons, write notes ("less spicy") — the cafe sees it all.',
            tips: ['Tap + to add', 'Special requests OK', 'Cart auto-saves'],
            screen: <CartScreen />,
            icon: ShoppingCart,
          },
          {
            n: '04',
            t: 'Place order',
            d: 'Verify your WhatsApp number once. Tap Place Order. Live status updates start instantly.',
            tips: ['One-tap WhatsApp verify', 'Sends order to kitchen', 'Get notified on every step'],
            screen: <TrackingScreen />,
            icon: Bell,
          },
          {
            n: '05',
            t: 'Pay & review',
            d: 'Pay via UPI from your phone. Rate the cafe in 1 tap. Done — go enjoy your meal.',
            tips: ['UPI deep-link', 'Cash works too', '5-star review optional'],
            screen: <PayScreen />,
            icon: CreditCard,
          },
        ].map((step, i) => (
          <div
            key={step.n}
            className={`grid lg:grid-cols-2 gap-10 items-center mb-20 ${i % 2 ? 'lg:[&>:first-child]:order-2' : ''}`}
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-coffee-700 text-cream-50 font-display font-bold">
                  {step.n}
                </span>
                <step.icon className="h-6 w-6 text-caramel-dark" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">{step.t}</h3>
              <p className="mt-2 text-coffee-700 max-w-md">{step.d}</p>
              <ul className="mt-4 space-y-1.5">
                {step.tips.map((tip) => (
                  <li key={tip} className="flex items-center gap-2 text-sm text-coffee-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <PhoneFrame size="md">{step.screen}</PhoneFrame>
            </div>
          </div>
        ))}
      </section>

      {/* WHATSAPP UPDATES */}
      <section className="bg-white border-y border-coffee-100">
        <div className="container py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            <div>
              <span className="pill bg-emerald-100 text-emerald-800"><MessageSquare className="h-3 w-3" /> WhatsApp updates</span>
              <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
                Get pinged at every step.
              </h2>
              <p className="mt-3 text-coffee-700 max-w-md">
                Order accepted. Preparing. Ready. Served. Pay request. Review link — all on WhatsApp.
                No need to keep refreshing.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { e: '✅', t: 'Order accepted', d: 'Cafe Mocha · Order #1284' },
                { e: '👨‍🍳', t: 'Preparing your order', d: 'Hot &amp; fresh — 5 min' },
                { e: '🍽️', t: 'Ready to serve!', d: 'Coming to your table' },
                { e: '💳', t: 'Payment request', d: '₹861 · Tap to pay via UPI' },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl bg-emerald-50 border-l-4 border-wagreen p-3 flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="text-2xl">{m.e}</span>
                  <div>
                    <div className="font-bold text-coffee-900 text-sm">{m.t}</div>
                    <div className="text-xs text-coffee-600">{m.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REVIEW */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          <div className="md:order-2">
            <span className="pill bg-cream-200 text-coffee-800"><Star className="h-3 w-3" /> Reviews</span>
            <h2 className="mt-3 font-display text-3xl md:text-4xl font-bold text-coffee-900">
              Share love (or feedback) in 5 seconds.
            </h2>
            <p className="mt-3 text-coffee-700 max-w-md">
              Rate, comment, and optionally share on Google — all from one tap.
            </p>
          </div>
          <div className="md:order-1 flex justify-center">
            <PhoneFrame size="md"><ReviewScreen /></PhoneFrame>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 text-center mb-8">
          Quick questions
        </h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {customerFaqs.map((f) => (
            <details key={f.q} className="card-warm">
              <summary className="cursor-pointer font-semibold text-coffee-900 list-none flex items-center justify-between">
                {f.q}
                <span className="text-coffee-500">⌄</span>
              </summary>
              <p className="mt-3 text-sm text-coffee-700">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-12">
        <div className="rounded-3xl bg-coffee-gradient text-cream-50 p-10 md:p-14 text-center relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-pattern opacity-10" />
          <Coffee className="relative mx-auto h-10 w-10" />
          <h2 className="relative font-display text-3xl md:text-5xl font-bold mt-4">
            Try ordering at Cafe Mocha.
          </h2>
          <p className="relative mt-3 text-cream-200/90">Open the demo, pick a few items, see it work.</p>
          <div className="relative mt-7">
            <Link href="/cafe/cafe-mocha">
              <Button variant="accent" size="lg">Open demo menu <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

const customerFaqs = [
  { q: 'Do I need to download an app?', a: 'No. The menu opens in your phone browser. That\'s it.' },
  { q: 'Will my data be saved?', a: 'Only your phone number, used to send WhatsApp order updates. We never spam.' },
  { q: 'How do I pay?', a: 'UPI from any app — Google Pay, PhonePe, Paytm. Cafe also accepts cash.' },
  { q: 'What if I want to change my order?', a: 'Call the cafe — your order number is shown on your screen. Owner can edit.' },
  { q: 'I lost my order tracking link!', a: 'Visit /my-orders, enter your phone number, and find it.' },
  { q: 'Is the cafe charged extra for using this?', a: 'You don\'t pay anything. Cafe pays a small monthly fee — that\'s it.' },
];
