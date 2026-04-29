import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { getPlanLimits, countMenuItems } from '@/lib/plan-limits';

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  price: z.number(),
  discountedPrice: z.number().nullable().optional(),
  diet: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN']).optional(),
  spicy: z.enum(['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT']).optional(),
  prepMinutes: z.number().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    const issues = (e?.issues as any[])?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: issues || e?.message || 'Invalid payload' }, { status: 400 });
  }

  const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!cat || cat.cafeId !== cafe.id) return NextResponse.json({ error: 'category mismatch' }, { status: 400 });

  // Plan-tier menu-item cap.
  const [limits, current] = await Promise.all([
    getPlanLimits(cafe.id),
    countMenuItems(cafe.id),
  ]);
  if (limits.maxMenuItems > 0 && current >= limits.maxMenuItems) {
    return NextResponse.json(
      {
        error: `You've hit your plan's menu-item limit (${current}/${limits.maxMenuItems}). Upgrade your plan to add more items.`,
        code: 'PLAN_LIMIT_REACHED',
        limit: limits.maxMenuItems,
        current,
      },
      { status: 402 },
    );
  }

  const item = await prisma.menuItem.create({
    data: { ...body, cafeId: cafe.id },
    include: { category: true, variants: true, addons: true },
  });
  return NextResponse.json({ item });
}
