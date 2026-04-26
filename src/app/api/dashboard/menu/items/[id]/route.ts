import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

// Accept null for the string-optional fields — when the dashboard re-sends an
// existing row, fields that are NULL in the DB arrive as JSON `null`, which
// `z.string().optional()` would otherwise reject and surface as a generic
// "Failed" toast.
const updateSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  price: z.number().optional(),
  discountedPrice: z.number().nullable().optional(),
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

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e: any) {
    const issues = (e?.issues as any[])?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: issues || e?.message || 'Invalid payload' }, { status: 400 });
  }

  // Drop categoryId if the new one doesn't belong to this cafe (avoids
  // cross-cafe leak via tampered payload).
  if (body.categoryId && body.categoryId !== item.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat || cat.cafeId !== cafe.id) {
      return NextResponse.json({ error: 'category mismatch' }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data: body as any,
      include: { category: true, variants: true, addons: true },
    });
    return NextResponse.json({ item: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!item || item.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.menuItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
