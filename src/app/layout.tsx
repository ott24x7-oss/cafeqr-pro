import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'WatShop Cafe — QR menu & ordering for cafes',
    template: '%s · WatShop Cafe',
  },
  description:
    'WatShop Cafe is a QR menu & ordering platform for cafes and restaurants. Tables, menu, orders, WhatsApp notifications, payments and analytics — built on the WatShop platform.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'WatShop Cafe' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'WatShop Cafe — QR menu & ordering for cafes',
    description: 'Smart QR ordering & management for cafes and restaurants, by WatShop.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#3E2D24',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon.svg" color="#6B4E3D" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster />
        {/* Runtime branding patcher — fetches /api/branding (60s cache) and
            rewrites elements tagged data-brand-logo / data-brand-name /
            data-brand-tagline / data-brand-footer plus the --brand-primary
            CSS var. Targets only marked elements, so admin chrome and the
            per-cafe menu views (which carry their own tenant branding) are
            unaffected. */}
        <Script src="/js/branding.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
