import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { getSiteSettings } from '@/lib/site-settings';

/**
 * Build the redirect target against the publicly-served URL, not `req.url`.
 * On Railway the inbound request hits the container at http://localhost:8080,
 * so `new URL(path, req.url)` would otherwise return a localhost redirect.
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
  const billing = ((form.get('billing') as string) === 'yearly' ? 'yearly' : 'monthly');
  if (!planId) return NextResponse.redirect(publicRedirect(req, '/dashboard/billing'));

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.redirect(publicRedirect(req, '/dashboard/billing'));

  // Free plans don't need a payment step — flip immediately.
  const baseAmount = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  if (baseAmount <= 0) {
    const endsAt = new Date(Date.now() + (billing === 'yearly' ? 365 : 30) * 86400000);
    await prisma.$transaction([
      prisma.cafe.update({ where: { id: cafe.id }, data: { planId: plan.id, status: 'ACTIVE', planEndsAt: endsAt } }),
      prisma.subscription.updateMany({
        where: { cafeId: cafe.id, status: 'active' },
        data: { status: 'expired' },
      }),
      prisma.subscription.create({
        data: { cafeId: cafe.id, planId: plan.id, amount: 0, payableAmount: 0, billing, endsAt, status: 'active', startsAt: new Date() },
      }),
    ]);
    return NextResponse.redirect(publicRedirect(req, '/dashboard/billing?switched=1'));
  }

  // Paid plans require platform UPI + IMAP to be configured. Without it,
  // bounce the user back with a clear error rather than silently flipping
  // the plan with zero rupees collected (the old, broken behaviour).
  const site = await getSiteSettings({ fresh: true });
  if (!site.platformUpiId || !site.platformGmailUser || !site.platformGmailAppPassword) {
    return NextResponse.redirect(publicRedirect(req, '/dashboard/billing?notconfigured=1'));
  }

  // Generate a unique paise nonce so the IMAP matcher can pin the credit
  // alert to this specific subscription row. Same trick as Order.payableAmount.
  const noncePaise = Math.floor(Math.random() * 99) + 1; // 1..99
  const payable = Math.round((baseAmount + noncePaise / 100) * 100) / 100;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + (billing === 'yearly' ? 365 : 30) * 86400000);

  const sub = await prisma.subscription.create({
    data: {
      cafeId: cafe.id,
      planId: plan.id,
      amount: baseAmount,
      payableAmount: payable,
      billing,
      startsAt,
      endsAt,
      status: 'pending',
    },
  });

  return NextResponse.redirect(publicRedirect(req, `/dashboard/billing/pay/${sub.id}`));
}
