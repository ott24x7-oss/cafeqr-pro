import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const c = await prisma.coupon.findUnique({ where: { id: params.id } });
  if (!c || c.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const coupon = await prisma.coupon.update({ where: { id: c.id }, data: body });
  return NextResponse.json({ coupon });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const c = await prisma.coupon.findUnique({ where: { id: params.id } });
  if (!c || c.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.coupon.delete({ where: { id: c.id } });
  return NextResponse.json({ ok: true });
}
