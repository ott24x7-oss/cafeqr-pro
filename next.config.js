/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
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
  webpack: (config, { isServer }) => {
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
      });
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
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
