/**
 * Manually activate a pending Subscription. For when the cafe owner paid
 * but auto-verify didn't catch it (e.g. IMAP credential issue, bank email
 * delayed past the window, customer paid the wrong amount, etc).
 *
 * Same effect as the auto-verify match path: flips this row to active,
 * expires older active subs for the same cafe, rolls Cafe.planId +
 * planEndsAt forward, drops a Notification for the cafe owner.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  transactionId: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  const body = await req.json().catch(() => ({} as any));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: { plan: true, cafe: { select: { id: true, name: true } } },
  });
  if (!sub) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (sub.status === 'active') {
    return NextResponse.json({ error: 'already active' }, { status: 400 });
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + (sub.billing === 'yearly' ? 365 : 30) * 86400000);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        paidAt: new Date(),
        transactionId: parsed.data.transactionId || sub.transactionId || `MANUAL-${session.user.email}`,
        startsAt,
        endsAt,
      },
    }),
    prisma.subscription.updateMany({
      where: { cafeId: sub.cafeId, status: 'active', id: { not: sub.id } },
      data: { status: 'expired' },
    }),
    prisma.cafe.update({
      where: { id: sub.cafeId },
      data: { planId: sub.planId, status: 'ACTIVE', planEndsAt: endsAt },
    }),
    prisma.notification.create({
      data: {
        cafeId: sub.cafeId,
        kind: 'PAYMENT',
        title: `Plan upgraded to ${sub.plan.name}`,
        body: `Subscription activated by admin. Renews ${endsAt.toDateString()}.`,
        link: '/dashboard/billing',
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
