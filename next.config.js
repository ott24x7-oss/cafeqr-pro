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
    // Baileys + IMAP libs use Node built-ins; keep them out of the bundler so
    // they're loaded as plain CJS at runtime on the server.
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'imapflow',
      'mailparser',
      'pino',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Belt-and-braces: ensure these never end up in any client bundle.
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        '@whiskeysockets/baileys': false,
        imapflow: false,
        mailparser: false,
        pino: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
