import { ImageResponse } from 'next/og';

/**
 * Sitewide social preview card (1200×630). Next.js wires this up as the
 * og:image + twitter:image for the root and every nested route via the file
 * convention, resolved to an absolute URL against `metadataBase`. Rendered
 * on the Node runtime with next/og's built-in font — no network fetch, so it
 * builds offline.
 */
// Edge runtime: the supported path for next/og's WASM renderer. It also
// avoids the Node file-URL asset resolution that throws on Windows build
// paths containing spaces.
export const runtime = 'edge';
export const alt = 'WatShop Cafe — QR menu & ordering for cafes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 88,
          background: 'linear-gradient(135deg, #3E2D24 0%, #6B4E3D 55%, #8A6A52 100%)',
          color: '#FCF8F3',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 36, fontWeight: 600, opacity: 0.92 }}>
          ☕ WatShop Cafe
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            marginTop: 28,
          }}
        >
          QR menu & ordering for cafes
        </div>
        <div style={{ display: 'flex', fontSize: 34, opacity: 0.85, marginTop: 30, maxWidth: 880, lineHeight: 1.3 }}>
          Tables, menu, live orders, WhatsApp updates, UPI payments & analytics — in one dashboard.
        </div>
      </div>
    ),
    { ...size },
  );
}
