import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData();
  const planId = form.get('planId') as string;
  if (!planId) return NextResponse.redirect(new URL('/dashboard/billing', req.url));
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.redirect(new URL('/dashboard/billing', req.url));

  // Manual switch: in production, gate behind payment success.
  const endsAt = new Date(Date.now() + 30 * 86400000);
  await prisma.cafe.update({
    where: { id: cafe.id },
    data: { planId: plan.id, status: 'ACTIVE', planEndsAt: endsAt },
  });
  await prisma.subscription.create({
    data: { cafeId: cafe.id, planId: plan.id, amount: plan.priceMonthly, billing: 'monthly', endsAt, status: 'active' },
  });
  return NextResponse.redirect(new URL('/dashboard/billing?switched=1', req.url));
}
