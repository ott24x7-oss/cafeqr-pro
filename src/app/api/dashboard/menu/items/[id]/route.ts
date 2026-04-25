import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const updateSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().optional(),
  discountedPrice: z.number().optional().nullable(),
  diet: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN']).optional(),
  spicy: z.enum(['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT']).optional(),
  prepMinutes: z.number().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  inStock: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!item || item.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const body = updateSchema.parse(await req.json());
  const updated = await prisma.menuItem.update({
    where: { id: item.id },
    data: body as any,
    include: { category: true, variants: true, addons: true },
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!item || item.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.menuItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
