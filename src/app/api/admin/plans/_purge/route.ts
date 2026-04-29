/**
 * NUCLEAR — wipe every Plan row + every dependent Subscription, and
 * detach every Cafe (planId set to NULL). Cafes with NULL planId fall
 * back to the Free Lifetime defaults via plan-limits.ts so they keep
 * accepting orders at the basic caps.
 *
 * Used when the super admin wants to start the pricing tiers from
 * scratch. Requires:
 *   - super-admin session
 *   - ?confirm=DELETE     (literal string, prevents accidental triggers)
 *
 * After running this, the admin should re-create plans from the
 * /admin/plans page; the public /pricing page will pick them up
 * automatically since it filters only on isActive (no slug whitelist).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function purge(req: Request) {
  const s = await getServerSession(authOptions);
  if (s?.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get('confirm') !== 'DELETE') {
    return NextResponse.json(
      { error: 'Add ?confirm=DELETE to confirm. This wipes every plan + every subscription.' },
      { status: 400 },
    );
  }

  const [cafeCount, subCount, planCount] = await Promise.all([
    prisma.cafe.count(),
    prisma.subscription.count(),
    prisma.plan.count(),
  ]);

  await prisma.$transaction([
    // Drop subscription history first (Plan FK is RESTRICT).
    prisma.subscription.deleteMany({}),
    // Detach all cafes (Cafe.planId is nullable).
    prisma.cafe.updateMany({ data: { planId: null } }),
    // Now safe to wipe plans.
    prisma.plan.deleteMany({}),
  ]);

  return NextResponse.json({
    ok: true,
    detachedCafes: cafeCount,
    deletedSubs: subCount,
    deletedPlans: planCount,
  });
}

export async function GET(req: Request)  { return purge(req); }
export async function POST(req: Request) { return purge(req); }
