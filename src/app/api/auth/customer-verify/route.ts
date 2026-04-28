/**
 * Verifies a 4-digit OTP previously issued by /api/auth/customer-otp and,
 * on success, sets the cqr_customer HMAC cookie. The OTP store is the same
 * in-memory Map as the issue endpoint — single-process scope is fine for
 * the customer login surface (mobile, low frequency).
 */
import { NextResponse } from 'next/server';
import { normalizePhone } from '@/lib/whatsapp';
import { encodeSession, CUSTOMER_COOKIE_NAME, CUSTOMER_COOKIE_MAX_AGE } from '@/lib/customer-session';

export const runtime = 'nodejs';

const otpStore = (globalThis as any).__cafeqr_otp ??= new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    const normalized = normalizePhone(phone || '');
    if (!normalized) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Code required' }, { status: 400 });

    const entry = otpStore.get(normalized);
    if (!entry) return NextResponse.json({ error: 'No code requested or expired' }, { status: 400 });
    if (entry.expiresAt < Date.now()) {
      otpStore.delete(normalized);
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }
    if (entry.otp !== code.trim()) return NextResponse.json({ error: 'Wrong code' }, { status: 400 });

    // Burn the OTP and mint the session.
    otpStore.delete(normalized);
    const token = encodeSession(normalized);

    const res = NextResponse.json({ ok: true, phone: normalized });
    res.cookies.set(CUSTOMER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CUSTOMER_COOKIE_MAX_AGE,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'verify error' }, { status: 400 });
  }
}

export async function DELETE() {
  // Logout: clear the cookie.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
