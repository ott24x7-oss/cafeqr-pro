import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * Lightweight HMAC-signed cookie session for customer logins on
 * /cafe/[slug] pages. The customer identity is just their normalized phone
 * number — the same value already stored on Order.customerPhone — so order
 * history and loyalty balances key off it directly. Separate cookie name
 * from next-auth so the two systems never collide.
 */

const COOKIE_NAME = 'cqr_customer';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
  if (!s) throw new Error('NEXTAUTH_SECRET is required for customer session');
  return s;
}

function base64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64url(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function sign(payload: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(payload).digest());
}

export interface CustomerSession {
  phone: string;
  exp: number;
}

export function encodeSession(phone: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = base64url(JSON.stringify({ phone, exp } satisfies CustomerSession));
  const sig = sign(payload, getSecret());
  return `${payload}.${sig}`;
}

export function decodeSession(token: string | undefined | null): CustomerSession | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let secret: string;
  try { secret = getSecret(); } catch { return null; }
  const expected = sign(payload, secret);
  // Constant-time compare
  if (expected.length !== sig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(fromBase64url(payload).toString('utf8')) as CustomerSession;
    if (!data?.phone || !data?.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Read the current customer session from cookies (server components / route handlers). */
export function getCustomerSession(): CustomerSession | null {
  return decodeSession(cookies().get(COOKIE_NAME)?.value);
}

export const CUSTOMER_COOKIE_NAME = COOKIE_NAME;
export const CUSTOMER_COOKIE_MAX_AGE = TTL_SECONDS;
