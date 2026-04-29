import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user.role === 'SUPER_ADMIN' ? s : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;
  const plan = await prisma.plan.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ plan });
}

/**
 * Delete a plan. Two FK relationships block a naive delete:
 *   - Cafe.planId            (nullable — can NULL out or reassign)
 *   - Subscription.planId    (required — must reassign or delete rows)
 *
 * Query params:
 *   ?reassignTo=<planId>   move all dependent cafes + subscriptions to
 *                          this plan first, then delete (preserves
 *                          billing history). Best path for live data.
 *   ?force=1               delete dependent subscriptions and NULL out
 *                          dependent cafes' planId (destroys billing
 *                          history; use only for cleanup of stale
 *                          test plans).
 *
 * Without either, returns 409 + dependency counts so the admin UI can
 * prompt for a destination plan or a force-confirm.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const reassignTo = url.searchParams.get('reassignTo');
  const force = url.searchParams.get('force') === '1';

  const [usingCafes, usingSubs] = await Promise.all([
    prisma.cafe.count({ where: { planId: params.id } }),
    prisma.subscription.count({ where: { planId: params.id } }),
  ]);

  // Plan in use AND no resolution path — surface both counts so the
  // UI can decide between reassign or force-delete.
  if ((usingCafes > 0 || usingSubs > 0) && !reassignTo && !force) {
    return NextResponse.json(
      {
        error: `Plan in use: ${usingCafes} cafe${usingCafes === 1 ? '' : 's'}, ${usingSubs} subscription${usingSubs === 1 ? '' : 's'}`,
        usingCafes,
        usingSubs,
        code: 'PLAN_IN_USE',
      },
      { status: 409 },
    );
  }

  if (reassignTo) {
    if (reassignTo === params.id) {
      return NextResponse.json({ error: 'Cannot reassign to the plan being deleted' }, { status: 400 });
    }
    const target = await prisma.plan.findUnique({ where: { id: reassignTo } });
    if (!target) return NextResponse.json({ error: 'reassignTo plan not found' }, { status: 400 });
    // Move both kinds of dependents atomically so a partial failure
    // doesn't leave the plan half-detached.
    await prisma.$transaction([
      prisma.cafe.updateMany({ where: { planId: params.id }, data: { planId: reassignTo } }),
      prisma.subscription.updateMany({ where: { planId: params.id }, data: { planId: reassignTo } }),
    ]);
  } else if (force) {
    // Destructive path — only used when admin explicitly opts in.
    // Subscription.planId is required (NOT NULL), so the rows have to
    // go; Cafe.planId is nullable and falls back to Free in
    // plan-limits.ts when null.
    await prisma.$transaction([
      prisma.subscription.deleteMany({ where: { planId: params.id } }),
      prisma.cafe.updateMany({ where: { planId: params.id }, data: { planId: null } }),
    ]);
  }

  await prisma.plan.delete({ where: { id: params.id } });

  return NextResponse.json({
    ok: true,
    movedCafes: reassignTo ? usingCafes : 0,
    movedSubs: reassignTo ? usingSubs : 0,
    deletedSubs: force ? usingSubs : 0,
    detachedCafes: force ? usingCafes : 0,
  });
}
