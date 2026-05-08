/**
 * One-tap WhatsApp magic-link landing page (server route handler).
 *
 * Customer taps the URL we DM'd them. We atomically burn the token, mint
 * the cqr_customer cookie via encodeSession(phone) and 302 to the cafe's
 * /account page. No client JS needed — works even with JS disabled.
 *
 * Failure modes (expired, used, unknown) redirect to the cafe's customer
 * login page with `?error=link_*` so the UI can show a helpful message.
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

function fail(req: Request, reason: string, slug?: string) {
  const base = new URL(req.url).origin;
  // No cafe slug means we can't deep-link to a specific login page; fall
  // back to the homepage with the error param so the user knows what went
  // wrong without us picking the "wrong" cafe.
  const target = slug
    ? `${base}/cafe/${slug}/account/login?error=${encodeURIComponent(reason)}`
    : `${base}/?error=${encodeURIComponent(reason)}`;
  return NextResponse.redirect(target, { status: 302 });
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const result = await consumeMagicLink(params.token);
  if (!result) return fail(req, 'link_invalid');

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
