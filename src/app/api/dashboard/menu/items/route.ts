import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number(),
  discountedPrice: z.number().optional(),
  diet: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN']).optional(),
  spicy: z.enum(['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT']).optional(),
  prepMinutes: z.number().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = schema.parse(await req.json());
  const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!cat || cat.cafeId !== cafe.id) return NextResponse.json({ error: 'category mismatch' }, { status: 400 });
  const item = await prisma.menuItem.create({
    data: { ...body, cafeId: cafe.id },
    include: { category: true, variants: true, addons: true },
  });
  return NextResponse.json({ item });
}
