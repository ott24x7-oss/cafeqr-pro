/**
 * Customer WhatsApp login OTP.
 *
 * - If a `cafeSlug` is provided AND that cafe has a Cloud API or Baileys
 *   provider configured, the OTP is delivered over WhatsApp through the
 *   cafe's bot number.
 * - Otherwise we fall back to a wa.me deep link the customer can tap to ping
 *   the cafe themselves.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone, waLink, configFromCafe } from '@/lib/whatsapp';
import { sendOTP } from '@/lib/notify';

export const runtime = 'nodejs';

const otpStore = (globalThis as any).__cafeqr_otp ??= new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const { phone, cafeSlug } = await req.json();
    const normalized = normalizePhone(phone || '');
    if (!normalized) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(normalized, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    let cafe: any = null;
    if (cafeSlug) {
      cafe = await prisma.cafe.findUnique({
        where: { slug: cafeSlug },
        include: { settings: true },
      });
    }

    const provider = cafe ? configFromCafe(cafe).provider : 'manual';
    let sendResult: any = null;
    if (provider !== 'manual' && cafe) {
      sendResult = await sendOTP(normalized, otp, cafe);
    }

    const delivered = sendResult?.ok === true;

    return NextResponse.json({
      ok: true,
      delivered,
      provider,
      // Only expose OTP in dev when nothing was actually sent.
      otp: !delivered && process.env.NODE_ENV !== 'production' ? otp : undefined,
      // Manual fallback link the customer can use to ping the cafe.
      waSendLink: cafe?.whatsappNo
        ? waLink(cafe.whatsappNo, `Hi! My code is ${otp}`)
        : undefined,
      hint: delivered
        ? 'Code sent on WhatsApp.'
        : 'Manual mode — use the wa.me link or contact the cafe for your code.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'OTP error' }, { status: 400 });
  }
}
