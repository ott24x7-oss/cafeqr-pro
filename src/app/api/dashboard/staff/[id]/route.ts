import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const s = await prisma.staff.findUnique({ where: { id: params.id } });
  if (!s || s.cafeId !== cafe.id || s.role === 'OWNER')
    return NextResponse.json({ error: 'cannot delete' }, { status: 400 });
  await prisma.staff.delete({ where: { id: s.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const s = await prisma.staff.findUnique({ where: { id: params.id } });
  if (!s || s.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({} as any));
  const data: any = {};
  if (typeof body.notifyOnNewOrder === 'boolean') data.notifyOnNewOrder = body.notifyOnNewOrder;
  if (typeof body.isActive === 'boolean' && s.role !== 'OWNER') data.isActive = body.isActive;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'no changes' }, { status: 400 });

  const updated = await prisma.staff.update({
    where: { id: s.id },
    data,
    include: { user: true },
  });
  return NextResponse.json({ staff: updated });
}
