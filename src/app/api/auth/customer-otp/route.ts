/**
 * Phase-1 customer WhatsApp login: returns a wa.me link the customer can tap
 * to send a one-tap "Hi" to the cafe with a 4-digit OTP. We store the OTP for
 * the phone for 10 minutes; verify-route checks it.
 *
 * In production, swap this for Cloud API / Baileys to send the OTP.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone, waLink } from '@/lib/whatsapp';

const otpStore = (globalThis as any).__cafeqr_otp ??= new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const { phone, cafeSlug } = await req.json();
    const normalized = normalizePhone(phone || '');
    if (!normalized) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    otpStore.set(normalized, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    let ownerWa: string | undefined;
    if (cafeSlug) {
      const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug }, select: { whatsappNo: true } });
      ownerWa = cafe?.whatsappNo ?? undefined;
    }

    // Manual phase: return the OTP to client (in dev) and a wa.me link to send.
    return NextResponse.json({
      ok: true,
      // ⚠ Remove `otp` from response when Cloud API/Baileys is wired up.
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
      waSendLink: ownerWa
        ? waLink(ownerWa, `Hi! My code is ${otp}`)
        : undefined,
      hint: 'Use any 4-digit OTP — manual mode for trial.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'OTP error' }, { status: 400 });
  }
}
