/**
 * Print-optimised tutorial deck for cafe owners.
 *
 * Workflow the user should follow:
 *   1. Open /tutorial in Chrome.
 *   2. Cmd/Ctrl + P → "Save as PDF" → "Background graphics" ON →
 *      "More settings → Margins: None".
 *   3. Each slide lands on its own A4 page.
 *   4. Drop the PDF into Canva / Google Slides to convert to PPT,
 *      or screen-record the on-screen flip-through directly.
 *
 * Visuals are the live mockup components from /home so the deck
 * stays in sync with whatever branding the admin has uploaded.
 * Narration script for each slide is in the README under
 * /tutorial — and also in the chat thread that produced this file.
 */
import { ArrowRight, Coffee, Plus, Check, Star, QrCode } from 'lucide-react';
import { PhoneFrame } from '@/components/mockups/phone-frame';
import {
  ScanQRScreen, MenuScreen, CartScreen, TrackingScreen, PayScreen,
  DashboardMini, QRPrintCard, WANotificationMockup, OrderToast,
} from '@/components/mockups/screens';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;
export const metadata = {
  title: 'Cafe owner tutorial — print-ready deck',
  description: 'Tutorial deck for cafe owners. Open in Chrome and Cmd/Ctrl+P → Save as PDF.',
};

async function getBranding() {
  try {
    return await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
  } catch { return null; }
}

export default async function TutorialDeckPage() {
  const branding = await getBranding();
  const brandName = branding?.brandName?.trim() || 'WatShop Cafe';
  const appIcon = branding?.appIconDataUrl ?? '';

  return (
    <div className="tutorial-root bg-cream-50 min-h-screen">
      {/* On-screen helper bar — hidden when printing */}
      <div className="screen-only sticky top-0 z-50 bg-white border-b border-coffee-100 px-4 py-2 flex items-center justify-between text-xs text-coffee-700">
        <span>Tutorial deck · 12 slides · {brandName}</span>
        <span className="hidden sm:inline">
          Press <kbd className="px-1.5 py-0.5 rounded border border-coffee-200 bg-cream-100 mx-1">Ctrl/Cmd</kbd>
          + <kbd className="px-1.5 py-0.5 rounded border border-coffee-200 bg-cream-100 mx-1">P</kbd>
          → "Save as PDF" · turn ON "Background graphics" · margins "None"
        </span>
      </div>

      {/* ───── 01 · COVER ───── */}
      <Slide n={1} total={12}>
        <div className="text-center">
          <div className="mx-auto mb-6">
            {appIcon ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={appIcon} alt={brandName} className="h-24 w-24 mx-auto rounded-3xl shadow-coffee object-cover" />
            ) : (
              <span className="grid h-24 w-24 mx-auto place-items-center rounded-3xl bg-coffee-gradient text-cream-50 shadow-coffee">
                <Coffee className="h-12 w-12" />
              </span>
            )}
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-coffee-900 leading-[1.05]">
            Make your cafe digital
          </h1>
          <p className="mt-3 font-display text-3xl text-coffee-700">in 5 minutes.</p>
          <p className="mt-6 text-coffee-700 text-lg">
            अपना cafe online लाएँ · सिर्फ़ 5 मिनट में
          </p>
          <p className="mt-10 text-sm text-coffee-500">{brandName} · cafe owner tutorial</p>
        </div>
      </Slide>

      {/* ───── 02 · WHAT YOU BUILD ───── */}
      <Slide n={2} total={12}>
        <Caption en="What you build" hi="आप क्या बनाते हैं" />
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center max-w-5xl mx-auto mt-10">
          <div className="relative">
            <span className="pill bg-coffee-700 text-cream-50 mb-2">Owner dashboard</span>
            <DashboardMini />
            <div className="absolute -top-3 -right-3"><OrderToast status="NEW" n="#1284" t="now" /></div>
          </div>
          <div className="flex flex-col items-center text-coffee-500">
            <ArrowRight className="h-10 w-10" />
            <span className="text-xs font-bold mt-1 uppercase tracking-wider">becomes</span>
          </div>
          <div className="relative">
            <span className="pill bg-caramel text-coffee-900 mb-2">Customer phone</span>
            <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
          </div>
        </div>
      </Slide>

      {/* ───── 03 · STEP 1 SIGN UP ───── */}
      <Slide n={3} total={12}>
        <StepHeader step="01" en="Sign up" hi="साइन अप करें" />
        <div className="mt-8 flex justify-center">
          <SignupMockup big />
        </div>
        <Bullets
          items={[
            ['Email + cafe name', 'Email और cafe का नाम'],
            ['No card needed — free 14-day trial', 'कार्ड की ज़रूरत नहीं — 14 दिन मुफ़्त'],
          ]}
        />
      </Slide>

      {/* ───── 04 · STEP 2 ADD MENU ───── */}
      <Slide n={4} total={12}>
        <StepHeader step="02" en="Add your menu" hi="अपना menu जोड़ें" />
        <div className="mt-8 flex justify-center">
          <MenuBuilderMockup big />
        </div>
        <Bullets
          items={[
            ['Categories → Items → Photos', 'Categories → Items → फ़ोटो'],
            ['Set prices, mark vegetarian, popular tags', 'दाम, veg / non-veg, popular tag'],
          ]}
        />
      </Slide>

      {/* ───── 05 · STEP 3 PRINT QR ───── */}
      <Slide n={5} total={12}>
        <StepHeader step="03" en="Print your QR codes" hi="QR codes print करें" />
        <div className="mt-8 flex justify-center">
          <div className="scale-150 origin-top">
            <QRPrintCard />
          </div>
        </div>
        <Bullets
          items={[
            ['One unique QR per table', 'हर table का अपना QR'],
            ['Print, laminate, place on each table', 'Print करके table पर रखें'],
          ]}
        />
      </Slide>

      {/* ───── 06 · CUSTOMER SCANS ───── */}
      <Slide n={6} total={12}>
        <StepHeader step="04" en="Customer scans" hi="ग्राहक scan करता है" />
        <div className="mt-8 flex justify-center">
          <PhoneFrame size="md"><ScanQRScreen /></PhoneFrame>
        </div>
        <Bullets
          items={[
            ['Camera opens menu — no app to install', 'Camera से menu खुलता है — कोई app नहीं'],
            ['Tagged with the table number automatically', 'Table number अपने आप attach होता है'],
          ]}
        />
      </Slide>

      {/* ───── 07 · CUSTOMER BROWSES ───── */}
      <Slide n={7} total={12}>
        <Caption en="Customer browses your menu" hi="ग्राहक आपका menu देखता है" />
        <div className="mt-8 flex justify-center">
          <PhoneFrame size="md"><MenuScreen /></PhoneFrame>
        </div>
      </Slide>

      {/* ───── 08 · CUSTOMER ORDERS ───── */}
      <Slide n={8} total={12}>
        <Caption en="Customer adds items, places order" hi="Items add करता है, order place करता है" />
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] gap-6 items-center max-w-5xl mx-auto">
          <div className="flex justify-center">
            <PhoneFrame size="md"><CartScreen /></PhoneFrame>
          </div>
          <ArrowRight className="h-10 w-10 text-coffee-500" />
          <div className="flex justify-center">
            <OrderToast status="NEW" n="#1284" t="just now" />
          </div>
        </div>
        <p className="mt-6 text-center text-coffee-500 text-sm">You get an instant ping · आपको तुरंत alert मिलता है</p>
      </Slide>

      {/* ───── 09 · TRACKING ───── */}
      <Slide n={9} total={12}>
        <Caption en="Customer tracks the order live" hi="ग्राहक order live track करता है" />
        <div className="mt-8 flex justify-center">
          <PhoneFrame size="md"><TrackingScreen /></PhoneFrame>
        </div>
      </Slide>

      {/* ───── 10 · UPI PAYMENT ───── */}
      <Slide n={10} total={12}>
        <Caption en="One-tap UPI payment" hi="एक tap में UPI payment" />
        <div className="mt-8 flex justify-center">
          <PhoneFrame size="md"><PayScreen /></PhoneFrame>
        </div>
        <Bullets
          items={[
            ['Auto-verified against your bank inbox', 'Bank inbox से अपने आप verify'],
            ['Loyalty points credited on success', 'Payment success पर loyalty points मिलते हैं'],
          ]}
        />
      </Slide>

      {/* ───── 11 · WHATSAPP + OWNER VIEW ───── */}
      <Slide n={11} total={12}>
        <Caption en="WhatsApp updates · Owner sees everything" hi="WhatsApp alerts · Owner को हर update मिलता है" />
        <div className="mt-6 grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
          <div className="flex justify-center">
            <WANotificationMockup />
          </div>
          <div className="relative">
            <DashboardMini />
            <div className="absolute -top-3 -right-3"><OrderToast status="ACCEPTED" n="#1284" t="1 min" /></div>
          </div>
        </div>
      </Slide>

      {/* ───── 12 · CTA ───── */}
      <Slide n={12} total={12}>
        <div className="text-center">
          <Coffee className="h-12 w-12 mx-auto text-coffee-700" />
          <h2 className="font-display text-5xl font-bold text-coffee-900 mt-4">
            Start free today.
          </h2>
          <p className="mt-3 text-coffee-700 text-lg">
            अभी मुफ़्त में शुरू करें
          </p>
          <div className="mt-10 inline-block rounded-2xl border-2 border-coffee-700 bg-white px-6 py-3">
            <div className="font-display text-3xl font-bold text-coffee-900">cafe.watshop.in</div>
          </div>
          <p className="mt-8 text-sm text-coffee-500">
            30 free orders / month forever · पहले 30 orders हमेशा मुफ़्त
          </p>
        </div>
      </Slide>

      {/* Print + screen styling for the deck */}
      <style>{`
        @page { size: A4 landscape; margin: 0; }

        .screen-only { display: block; }
        @media print {
          .screen-only { display: none !important; }
          html, body { background: #ffffff !important; }
          .tutorial-slide { page-break-after: always; break-after: page; }
          .tutorial-slide:last-child { page-break-after: auto; }
        }

        .tutorial-slide {
          /* A4 landscape ≈ 297×210mm. We render ~14:9.5 which prints 1:1
             into landscape. On screen, fill the viewport so each slide
             reads like a presentation. */
          min-height: 100vh;
          width: 100%;
          padding: 48px 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media print {
          .tutorial-slide {
            min-height: 0;
            height: 210mm;
            width: 297mm;
            padding: 18mm 22mm;
          }
        }
      `}</style>
    </div>
  );
}

/* ───────────────── helper components ───────────────── */

function Slide({ n, total, children }: { n: number; total: number; children: React.ReactNode }) {
  return (
    <section className="tutorial-slide relative bg-cream-50 border-b border-coffee-100">
      <div className="flex-1 flex flex-col justify-center">{children}</div>
      <div className="absolute bottom-4 right-6 text-xs text-coffee-400">{n} / {total} · cafe.watshop.in</div>
    </section>
  );
}

function Caption({ en, hi }: { en: string; hi: string }) {
  return (
    <div className="text-center">
      <h2 className="font-display text-4xl md:text-5xl font-bold text-coffee-900">{en}</h2>
      <p className="mt-2 text-coffee-600 text-lg">{hi}</p>
    </div>
  );
}

function StepHeader({ step, en, hi }: { step: string; en: string; hi: string }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1.5 bg-coffee-700 text-cream-50 rounded-full px-3 py-1 text-xs font-bold">
        STEP {step}
      </span>
      <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-coffee-900">{en}</h2>
      <p className="mt-1 text-coffee-600 text-lg">{hi}</p>
    </div>
  );
}

function Bullets({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-8 max-w-xl mx-auto space-y-2">
      {items.map(([en, hi]) => (
        <li key={en} className="flex items-start gap-2.5 text-coffee-800">
          <Check className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <span>
            <span className="block">{en}</span>
            <span className="block text-coffee-500 text-sm">{hi}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function SignupMockup({ big = false }: { big?: boolean }) {
  const w = big ? 'w-[320px]' : 'w-[200px]';
  const t = big ? 'text-base' : 'text-xs';
  return (
    <div className={`rounded-2xl border border-coffee-200 bg-white shadow-soft p-4 ${w}`}>
      <div className={`font-display ${t} font-bold text-coffee-900 mb-3`}>Create your cafe</div>
      <div className="space-y-2">
        <div className="rounded-md bg-cream-100 px-3 py-2 text-sm text-coffee-700">Cafe Mocha</div>
        <div className="rounded-md bg-cream-100 px-3 py-2 text-sm text-coffee-700">you@cafe.com</div>
        <div className="rounded-md bg-cream-100 px-3 py-2 text-sm text-coffee-400">••••••••</div>
        <div className="rounded-md bg-coffee-gradient text-cream-50 text-center py-2 text-sm font-bold">
          Start free trial
        </div>
      </div>
      <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
        <Check className="h-3 w-3" /> No card needed
      </div>
    </div>
  );
}

function MenuBuilderMockup({ big = false }: { big?: boolean }) {
  const w = big ? 'w-[360px]' : 'w-[200px]';
  return (
    <div className={`rounded-2xl border border-coffee-200 bg-white shadow-soft p-4 ${w}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-base font-bold text-coffee-900">Menu</div>
        <span className="inline-flex items-center gap-1 text-xs bg-coffee-700 text-cream-50 rounded-full px-2 py-0.5">
          <Plus className="h-3 w-3" /> Add
        </span>
      </div>
      <div className="space-y-2">
        {[
          { n: 'Cappuccino', p: 180 },
          { n: 'Cold Brew', p: 220 },
          { n: 'Truffle Pasta', p: 460 },
          { n: 'Cheesecake', p: 250 },
        ].map((i) => (
          <div key={i.n} className="rounded-md border border-coffee-100 bg-white p-2 flex items-center gap-2">
            <div className="h-9 w-9 rounded bg-coffee-gradient" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-coffee-900 truncate">{i.n}</div>
              <div className="text-xs text-coffee-700">₹{i.p}</div>
            </div>
            <Star className="h-3 w-3 fill-caramel text-caramel" />
          </div>
        ))}
      </div>
    </div>
  );
}
