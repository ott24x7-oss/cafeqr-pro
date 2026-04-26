import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

/**
 * Build the redirect target against the publicly-served URL, not `req.url`.
 * On Railway the inbound request hits the container at http://localhost:8080,
 * so `new URL(path, req.url)` returns a localhost redirect that the browser
 * actually follows — which is why "Upgrade plan" was sending users to
 * https://localhost:8080/dashboard/billing?switched=1.
 *
 * We prefer APP_URL → NEXTAUTH_URL → the X-Forwarded-* headers added by
 * the proxy → finally req.url as a last resort.
 */
function publicRedirect(req: Request, path: string): URL {
  const env = process.env.APP_URL || process.env.NEXTAUTH_URL || '';
  if (env) return new URL(path, env);

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return new URL(path, `${proto}://${host}`);

  return new URL(path, req.url);
}

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData();
  const planId = form.get('planId') as string;
  if (!planId) return NextResponse.redirect(publicRedirect(req, '/dashboard/billing'));
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.redirect(publicRedirect(req, '/dashboard/billing'));

  // Manual switch — gate behind real payment success once Razorpay lands.
  const endsAt = new Date(Date.now() + 30 * 86400000);
  await prisma.cafe.update({
    where: { id: cafe.id },
    data: { planId: plan.id, status: 'ACTIVE', planEndsAt: endsAt },
  });
  await prisma.subscription.create({
    data: { cafeId: cafe.id, planId: plan.id, amount: plan.priceMonthly, billing: 'monthly', endsAt, status: 'active' },
  });
  return NextResponse.redirect(publicRedirect(req, '/dashboard/billing?switched=1'));
}
