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
