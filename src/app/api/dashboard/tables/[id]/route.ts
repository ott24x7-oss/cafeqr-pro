import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const t = await prisma.table.findUnique({ where: { id: params.id } });
  if (!t || t.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.table.delete({ where: { id: t.id } });
  return NextResponse.json({ ok: true });
}
