/**
 * Customer one-tap WhatsApp login — link issuer.
 *
 * Body: `{ phone, cafeSlug }`. We normalise the phone, generate a 256-bit
 * token, persist a WhatsAppMagicLink row (10-min TTL, single-use) and DM
 * the customer the resolution URL via the cafe's configured provider.
 *
 * Tapping the link hits GET /m/[token] which mints the cqr_customer cookie
 * and redirects to the cafe's account page. No second prompt, no OTP.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone, waLink } from '@/lib/whatsapp';
import { issueMagicLink } from '@/lib/magic-link';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { phone, cafeSlug } = await req.json();
    if (!cafeSlug || typeof cafeSlug !== 'string') {
      return NextResponse.json({ error: 'cafeSlug required' }, { status: 400 });
    }

    const cafe = await prisma.cafe.findUnique({
      where: { slug: cafeSlug },
      include: { settings: true },
    });
    if (!cafe) return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });

    const country = cafe.settings?.country || 'IN';
    const normalized = normalizePhone(phone || '', country);
    if (!normalized || normalized.length < 10) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const userAgent = req.headers.get('user-agent') ?? null;

    const result = await issueMagicLink({ cafe, phone: normalized, ip, userAgent });

    return NextResponse.json({
      ok: true,
      delivered: result.delivered,
      provider: result.provider,
      // Manual fallback so dev / unconfigured cafes can still complete login.
      // The customer opens wa.me to send the link to themselves on the same
      // WhatsApp account, then taps it.
      waSendLink: result.provider === 'manual'
        ? waLink(normalized, `My CafeQR login link: ${result.url}`)
        : undefined,
      // Surface the URL only when delivery did not happen — never leak it
      // back to the browser when the customer is supposed to click it from
      // the WhatsApp message.
      devUrl: !result.delivered && process.env.NODE_ENV !== 'production' ? result.url : undefined,
      hint: result.delivered
        ? 'Login link sent on WhatsApp. Tap it to sign in.'
        : 'WhatsApp delivery unavailable — use the link below or contact the cafe.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'magic-link error' }, { status: 400 });
  }
}
