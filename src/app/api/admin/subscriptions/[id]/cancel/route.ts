/**
 * Cancel a Subscription (set status to cancelled). If it was the cafe's
 * active row, also revert Cafe.planId so the cafe doesn't keep paid-plan
 * features after cancellation.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await requireSuperAdmin();

  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'cancelled' },
  });

  // If this was the cafe's currently-active sub, the cafe loses paid-plan
  // privileges. We don't auto-downgrade trialing — admin can adjust via
  // the Cafes page if they want.
  if (sub.status === 'active') {
    await prisma.cafe.update({
      where: { id: sub.cafeId },
      data: { planEndsAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
