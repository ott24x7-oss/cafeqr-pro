import { NextResponse } from 'next/server';
import { CUSTOMER_COOKIE_NAME } from '@/lib/customer-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET so a plain <a> link can sign the customer out. Clears the cookie
 *  and bounces back to the cafe storefront. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(`/cafe/${params.slug}`, req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(CUSTOMER_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
