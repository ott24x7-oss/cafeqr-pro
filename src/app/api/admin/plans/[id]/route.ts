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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const using = await prisma.cafe.count({ where: { planId: params.id } });
  const url = new URL(req.url);
  const reassignTo = url.searchParams.get('reassignTo');

  // Plan still in use AND no destination provided — surface the count so
  // the admin UI can prompt for a destination plan and retry the delete.
  if (using > 0 && !reassignTo) {
    return NextResponse.json(
      { error: `${using} cafe${using === 1 ? '' : 's'} use this plan`, using, code: 'PLAN_IN_USE' },
      { status: 409 },
    );
  }

  // Reassign first so the cafe FK doesn't block the delete.
  if (using > 0 && reassignTo) {
    if (reassignTo === params.id) {
      return NextResponse.json({ error: 'Cannot reassign to the plan being deleted' }, { status: 400 });
    }
    const target = await prisma.plan.findUnique({ where: { id: reassignTo } });
    if (!target) return NextResponse.json({ error: 'reassignTo plan not found' }, { status: 400 });
    await prisma.cafe.updateMany({
      where: { planId: params.id },
      data: { planId: reassignTo },
    });
  }

  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true, moved: using });
}
