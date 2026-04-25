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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const using = await prisma.cafe.count({ where: { planId: params.id } });
  if (using > 0) return NextResponse.json({ error: `${using} cafes use this plan` }, { status: 400 });
  await prisma.plan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
