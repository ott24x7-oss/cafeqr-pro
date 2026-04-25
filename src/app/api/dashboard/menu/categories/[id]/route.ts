import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const updateSchema = z.object({
  name: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const cat = await prisma.category.findUnique({ where: { id: params.id } });
  if (!cat || cat.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = updateSchema.parse(await req.json());
  const category = await prisma.category.update({ where: { id: cat.id }, data: body });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const cat = await prisma.category.findUnique({ where: { id: params.id } });
  if (!cat || cat.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const itemsCount = await prisma.menuItem.count({ where: { categoryId: cat.id } });
  if (itemsCount > 0) return NextResponse.json({ error: 'Move items to another category first' }, { status: 400 });
  await prisma.category.delete({ where: { id: cat.id } });
  return NextResponse.json({ ok: true });
}
