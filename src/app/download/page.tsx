import Link from 'next/link';
import { Smartphone, Download, ShieldAlert, CheckCircle2, ArrowDown } from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Download the WatShop Cafe Android app',
  description:
    'Install the WatShop Cafe Android app on your phone or Fire tablet. Live order alerts, QR ordering, and your full owner dashboard in one tap.',
};

const APK_URL = '/downloads/WatShopCafe.apk';
const APK_SIZE = '6.8 MB';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />

      <section className="container py-10 md:py-16 max-w-3xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 grid place-items-center rounded-2xl bg-coffee-gradient text-cream-50 shadow-coffee">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-3xl md:text-5xl font-bold text-coffee-900">
            Get the Android app
          </h1>
          <p className="mt-3 text-coffee-700 max-w-xl mx-auto">
            Native splash, full-screen alerts when a new order arrives, pull-to-refresh,
            and your live owner dashboard in one tap. Works on any Android phone or Fire tablet.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <a href={APK_URL} download className="block">
              <Button size="lg" className="px-7 py-6 text-base">
                <Download className="h-5 w-5" /> Download APK ({APK_SIZE})
              </Button>
            </a>
            <p className="text-xs text-coffee-500">
              Direct install — not yet on Amazon Appstore or Google Play.
            </p>
          </div>
        </div>

        {/* Install steps */}
        <div className="mt-12 card-warm">
          <div className="flex items-center gap-2 font-display text-xl font-bold text-coffee-900 mb-4">
            <ArrowDown className="h-5 w-5" /> How to install
          </div>
          <ol className="space-y-4 text-sm text-coffee-700">
            <li className="flex gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-coffee-700 text-cream-50 grid place-items-center text-xs font-bold">1</span>
              <div>
                <div className="font-semibold text-coffee-900">Tap Download APK above</div>
                <div className="text-coffee-600 text-xs mt-0.5">Your browser will save <code>WatShopCafe.apk</code> to your phone.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-coffee-700 text-cream-50 grid place-items-center text-xs font-bold">2</span>
              <div>
                <div className="font-semibold text-coffee-900">Allow installs from your browser</div>
                <div className="text-coffee-600 text-xs mt-0.5">
                  When Android asks <em>“For your security, your phone is not allowed to install
                  unknown apps from this source”</em>, tap <strong>Settings</strong> and enable
                  <strong> Allow from this source</strong>.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-coffee-700 text-cream-50 grid place-items-center text-xs font-bold">3</span>
              <div>
                <div className="font-semibold text-coffee-900">Open the file and install</div>
                <div className="text-coffee-600 text-xs mt-0.5">
                  In your Notification shade or Files app → tap the APK → <strong>Install</strong> → <strong>Open</strong>.
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-coffee-700 text-cream-50 grid place-items-center text-xs font-bold">4</span>
              <div>
                <div className="font-semibold text-coffee-900">Sign in and turn on alerts</div>
                <div className="text-coffee-600 text-xs mt-0.5">
                  Sign in as the cafe owner, then go to <strong>Dashboard → Settings → Notifications</strong>
                  and turn on <em>Full-screen alert in WatShop Cafe Android app</em> to get sound + vibration on every new order.
                </div>
              </div>
            </li>
          </ol>
        </div>

        {/* Troubleshooting */}
        <div className="mt-6 card-warm bg-amber-50/40 border-amber-200">
          <div className="flex items-center gap-2 font-semibold text-coffee-900 mb-2">
            <ShieldAlert className="h-4 w-4 text-amber-700" /> Stuck on “App not installed”?
          </div>
          <ul className="text-xs text-coffee-700 space-y-1.5 list-disc pl-5">
            <li>If a previous version is already on your phone, uninstall it first (long-press the icon → Uninstall) and try again.</li>
            <li>On OnePlus / OxygenOS the toggle is <em>Settings → Apps → Special access → Install unknown apps</em>.</li>
            <li>On Fire tablets, enable <em>Settings → Security &amp; Privacy → Apps from Unknown Sources</em> for the app you’re using to open the APK (Files / Email / Silk).</li>
            <li>Make sure your Android version is 6.0 (Marshmallow) or newer.</li>
          </ul>
        </div>

        {/* What's inside */}
        <div className="mt-6 card-warm">
          <div className="flex items-center gap-2 font-semibold text-coffee-900 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" /> What you get
          </div>
          <ul className="text-sm text-coffee-700 space-y-1.5 list-disc pl-5">
            <li>Branded splash screen and theme (configurable from <Link href="/admin/mobile-app" className="underline">/admin/mobile-app</Link>)</li>
            <li>Full-screen <strong>new-order alert</strong> with sound + vibration — opt-in per cafe</li>
            <li>Pull-to-refresh, native back button, file uploads, camera, location</li>
            <li>WhatsApp / UPI / phone / email links open in their native apps</li>
            <li>Offline / maintenance / update screens</li>
          </ul>
        </div>

        <p className="mt-8 text-center text-xs text-coffee-500">
          Coming soon to <strong>Amazon Appstore</strong> and <strong>Google Play</strong>. Until then, install directly from this page.
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
