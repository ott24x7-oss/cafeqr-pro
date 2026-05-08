/**
 * One-tap WhatsApp magic-link landing page (server route handler).
 *
 * Customer taps the URL we DM'd them. We atomically burn the token, mint
 * the cqr_customer cookie via encodeSession(phone) and 302 to the cafe's
 * /account page. No client JS needed — works even with JS disabled.
 *
 * Failure modes (expired, used, unknown) redirect to the cafe's customer
 * login page with `?error=link_<reason>` so the UI can show a tailored
 * message ("expired" vs "already used" vs "invalid").
 */
import { NextResponse } from 'next/server';
import { consumeMagicLink } from '@/lib/magic-link';
import {
  encodeSession,
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_COOKIE_MAX_AGE,
} from '@/lib/customer-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(req: Request, reason: 'invalid' | 'used' | 'expired', slug?: string) {
  const base = new URL(req.url).origin;
  const code = `link_${reason}`;
  // We surface a slug on used/expired (because the row tells us which cafe
  // the customer was trying to reach), but on a totally unknown token we
  // can't pick a login page so we send them to the homepage instead.
  const target = slug
    ? `${base}/cafe/${slug}/account/login?error=${encodeURIComponent(code)}`
    : `${base}/?error=${encodeURIComponent(code)}`;
  return NextResponse.redirect(target, { status: 302 });
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const result = await consumeMagicLink(params.token);
  if (!result.ok) return fail(req, result.reason, result.cafeSlug);

  const session = encodeSession(result.phone);
  const base = new URL(req.url).origin;
  const res = NextResponse.redirect(`${base}/cafe/${result.cafeSlug}/account`, { status: 302 });
  res.cookies.set(CUSTOMER_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_COOKIE_MAX_AGE,
  });
  return res;
}
