/**
 * Bulk-delete menu items for the current cafe. Modes:
 *
 *   { ids: ['itm1', 'itm2', ...] }    // explicit selection
 *   { categoryId: 'cat1' }             // every item in this category
 *   { all: true }                      // every item on the cafe's menu
 *
 * MenuItem ↔ OrderItem has no cascade (we want order history preserved),
 * so any item that has historical orders can't be hard-deleted. Those are
 * marked `isAvailable=false, inStock=false` instead so they disappear from
 * the customer view but stay attached to past orders for analytics.
 *
 * Response: { matched, deleted, hidden, errors[] }
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  all: z.boolean().optional(),
}).refine((d) => d.ids?.length || d.categoryId || d.all, {
  message: 'ids, categoryId or all=true is required',
});

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const where: any = { cafeId: cafe.id };
  if (body.ids?.length) where.id = { in: body.ids };
  else if (body.categoryId) where.categoryId = body.categoryId;
  // body.all → no extra filter beyond cafeId

  const targets = await prisma.menuItem.findMany({
    where,
    select: { id: true, _count: { select: { orderItems: true } } },
  });
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, deleted: 0, hidden: 0, errors: [] });
  }

  const deletable = targets.filter((t) => t._count.orderItems === 0).map((t) => t.id);
  const hideOnly  = targets.filter((t) => t._count.orderItems > 0).map((t) => t.id);

  let deleted = 0;
  let hidden = 0;
  const errors: string[] = [];

  if (deletable.length) {
    try {
      const r = await prisma.menuItem.deleteMany({ where: { id: { in: deletable } } });
      deleted = r.count;
    } catch (e: any) {
      errors.push(`delete failed: ${e?.message ?? e}`);
    }
  }

  if (hideOnly.length) {
    try {
      const r = await prisma.menuItem.updateMany({
        where: { id: { in: hideOnly } },
        data: { isAvailable: false, inStock: false },
      });
      hidden = r.count;
    } catch (e: any) {
      errors.push(`hide failed: ${e?.message ?? e}`);
    }
  }

  return NextResponse.json({
    ok: true,
    matched: targets.length,
    deleted,
    hidden,
    errors,
  });
}
