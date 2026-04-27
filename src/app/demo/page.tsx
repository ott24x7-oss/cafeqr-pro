import Link from 'next/link';
import Image from 'next/image';
import {
  QrCode, Smartphone, ChefHat, Bell, CreditCard, Star, ArrowRight,
  ScanLine, ShoppingCart, MessageSquare, ReceiptText,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Live Demo — CafeQR Pro',
  description: 'Scan the QR or play with the live cafe inside the mobile mock — see exactly what your customers will see.',
};

const DEMO_QR_URL = 'https://i.ibb.co/tTYvFQ4c/cafe-dk-qr-mockup.png';
const DEMO_CAFE_URL = 'https://cafe.watshop.in/cafe/cafe-dk/';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <div className="container relative py-14 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-coffee-800">
            Live demo · Cafe DK
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold text-coffee-900">
            Try it like a customer
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-coffee-700">
            Scan the QR with your phone, or tap around the live cafe inside the mobile mock — same flow your customers will see.
          </p>
        </div>
      </section>

      {/* QR + iframe mock side by side on desktop, stacked on mobile */}
      <section className="container pb-16 grid lg:grid-cols-2 gap-8 items-start">
        {/* QR card */}
        <div className="card-warm p-6 md:p-8 text-center bg-gradient-to-br from-cream-50 via-white to-amber-50">
          <div className="inline-flex items-center gap-2 rounded-full bg-coffee-700 text-cream-50 px-3 py-1 text-xs font-semibold mb-4">
            <QrCode className="h-3.5 w-3.5" /> Scan to start
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">
            Point your phone camera here
          </h2>
          <p className="text-coffee-600 text-sm mt-2 max-w-md mx-auto">
            This is the same QR a real customer would find on a table tent at Cafe DK. Scan it and you'll land in the mobile menu.
          </p>

          <div className="my-6 inline-block p-3 bg-white rounded-3xl border-2 border-coffee-700 shadow-coffee">
            <Image
              src={DEMO_QR_URL}
              alt="Cafe DK demo QR code"
              width={320}
              height={320}
              className="rounded-2xl"
              priority
              unoptimized
            />
          </div>

          <div className="text-xs text-coffee-500 mb-3 break-all font-mono">{DEMO_CAFE_URL}</div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a href={DEMO_CAFE_URL} target="_blank" rel="noreferrer">
              <Button>
                Open in new tab <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/signup">
              <Button variant="outline">Get one for your cafe</Button>
            </Link>
          </div>
        </div>

        {/* Phone mockup with live iframe */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-semibold text-coffee-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> Live preview
          </div>
          <PhoneMock src={DEMO_CAFE_URL} />
          <div className="mt-3 text-xs text-coffee-500 text-center max-w-xs">
            This is the actual store, embedded. Every tap places real test orders against our demo cafe — feel free to add items and check out.
          </div>
        </div>
      </section>

      {/* How it works guide */}
      <section className="bg-coffee-gradient text-cream-50 py-16">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-50/15 backdrop-blur px-3 py-1 text-xs font-semibold mb-3">
              How the flow works
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">From scan to served</h2>
            <p className="text-cream-200/90 mt-3">
              Six steps. No app to install, no waiter to flag down. Customer pulls out their phone, owner gets the ping.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl bg-cream-50/10 backdrop-blur border border-cream-50/20 p-5 hover:bg-cream-50/15 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-caramel grid place-items-center shrink-0">
                    <s.icon className="h-5 w-5 text-coffee-900" />
                  </div>
                  <div className="text-xs font-semibold text-cream-200/80">
                    Step {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold mb-1.5">{s.title}</h3>
                <p className="text-sm text-cream-200/90 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-coffee-900">Ready to ditch the laminated menu?</h2>
        <p className="mt-3 text-coffee-600 max-w-xl mx-auto">
          Spin up a cafe like Cafe DK in under five minutes. 14-day trial, no card required.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup"><Button size="lg">Start free trial</Button></Link>
          <Link href="/pricing"><Button size="lg" variant="outline">View pricing</Button></Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/**
 * Pixel-style mobile mockup wrapping a live iframe of the demo cafe.
 * The frame is just a CSS hardware mock — notch, speaker, side buttons —
 * so the embedded store reads as "phone-shaped" rather than just a small
 * box.
 */
function PhoneMock({ src }: { src: string }) {
  return (
    // Fluid width, capped at 340px so the chassis still reads as a phone on
    // wide desktops. Aspect ratio drives the height so nothing overflows on
    // narrow viewports (iPhone SE @ 320px etc.).
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* Side buttons — purely cosmetic, hidden below md so they don't poke
          out past the screen edge on cramped mobile widths. */}
      <div className="hidden md:block absolute top-[18%] -left-1 h-12 w-1 bg-coffee-800 rounded-l" />
      <div className="hidden md:block absolute top-[32%] -left-1 h-20 w-1 bg-coffee-800 rounded-l" />
      <div className="hidden md:block absolute top-[24%] -right-1 h-16 w-1 bg-coffee-800 rounded-r" />

      {/* Outer chassis */}
      <div className="rounded-[40px] sm:rounded-[44px] bg-coffee-900 p-2 sm:p-2.5 shadow-coffee">
        {/* Inner bezel */}
        <div className="rounded-[32px] sm:rounded-[36px] bg-black p-1 sm:p-1.5 overflow-hidden">
          {/* Screen — aspect ratio matches the previous 320×640 (1:2). */}
          <div className="relative rounded-[26px] sm:rounded-[30px] overflow-hidden bg-cream-50 w-full aspect-[1/2]">
            {/* Notch */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-4 sm:h-5 w-20 sm:w-24 bg-black rounded-full z-10" />
            <iframe
              src={src}
              title="Cafe DK live demo"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: ScanLine,
    title: 'Customer scans the QR',
    body: 'Each table has its own QR code with the table number baked in. No app install — opens the menu in the phone browser.',
  },
  {
    icon: Smartphone,
    title: 'Browse the live menu',
    body: 'Photos, prices, veg/non-veg badges, "sold out" markers. Bestsellers float to the top automatically.',
  },
  {
    icon: ShoppingCart,
    title: 'Add to cart and verify',
    body: 'Customer picks Dine in, Takeaway or Delivery. Name + WhatsApp number are required and OTP-verified before the order goes through.',
  },
  {
    icon: Bell,
    title: 'Owner gets pinged on WhatsApp',
    body: 'New-order notification fires the moment Place order is tapped — owner phone, configured staff, and the kitchen tablet all light up.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen tracks the order',
    body: 'Live order board moves through Accepted → Preparing → Ready → Served. Customer sees the same status on their phone in real time.',
  },
  {
    icon: CreditCard,
    title: 'Pay + auto-receipt',
    body: 'UPI QR with a unique paise-nonce so payment auto-verifies from the cafe\'s Gmail inbox. Invoice PDF + thank-you + review link arrive on WhatsApp seconds later.',
  },
];
