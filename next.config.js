/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework.
  poweredByHeader: false,
  // Baseline security headers on every response. Applied here (not per-route)
  // so the public marketing pages, the per-cafe storefronts and the API all
  // get them. Kept conservative so nothing the customer flow needs is blocked
  // (no camera/mic/geolocation is used anywhere in the web UI).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
    // Boot hook — re-opens persisted Baileys sessions on Node start.
    instrumentationHook: true,
    // Baileys + IMAP libs use Node built-ins; keep them out of the bundler so
    // they're loaded as plain CJS at runtime on the server.
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'imapflow',
      'mailparser',
      'pino',
      'pdfkit',
    ],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      // Externalize Node-native packages from ALL server compilations
      // (App Router + Pages Router). serverComponentsExternalPackages only
      // covers the App Router server pass, so the pages compiler still
      // tries to bundle these and chokes on 'crypto' / 'fs'.
      config.externals = config.externals || [];
      config.externals.push({
        '@whiskeysockets/baileys': 'commonjs @whiskeysockets/baileys',
        imapflow: 'commonjs imapflow',
        mailparser: 'commonjs mailparser',
        pino: 'commonjs pino',
        pdfkit: 'commonjs pdfkit',
        crypto: 'commonjs crypto',
      });

      // The edge runtime bundles instrumentation.ts (and its transitive
      // dynamic-import targets) even though instrumentation guards itself
      // with NEXT_RUNTIME !== 'nodejs' at the top. Webpack still needs
      // to RESOLVE every transitive import, so Node built-ins like
      // 'crypto' from src/lib/crypto.ts must be stubbed for the edge
      // bundle to compile. They're never actually invoked there because
      // of the runtime guard.
      if (nextRuntime === 'edge') {
        config.resolve.fallback = {
          ...(config.resolve.fallback ?? {}),
          crypto: false,
          fs: false,
          path: false,
          net: false,
          tls: false,
          stream: false,
          zlib: false,
          os: false,
          child_process: false,
        };
      }
    } else {
      // Belt-and-braces: ensure these never end up in any client bundle.
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@whiskeysockets/baileys': false,
        imapflow: false,
        mailparser: false,
        pino: false,
        pdfkit: false,
      };
      // Node built-ins referenced transitively by server-only code —
      // provide empty fallbacks so webpack doesn't error on the client pass.
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
