/**
 * Bulk-delete orders for the current cafe. Two modes:
 *
 *   { ids: ['ord1', 'ord2', ...] }                 // explicit selection
 *   { filter: { status?, type?, before?, after? } } // matched-rows mode
 *
 * Always scoped to the current cafe — IDs from other cafes are silently
 * ignored. Cascade dependencies (OrderItem, Payment) follow Prisma's
 * onDelete:Cascade rules. Reviews unlinked rather than deleted.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const filterSchema = z.object({
  status: z.array(z.string()).optional(),     // e.g. ['COMPLETED', 'CANCELLED']
  type: z.array(z.string()).optional(),
  before: z.string().optional(),               // ISO date
  after: z.string().optional(),
}).optional();

const schema = z.object({
  ids: z.array(z.string()).optional(),
  filter: filterSchema,
}).refine((d) => d.ids?.length || d.filter, {
  message: 'Either ids or filter is required',
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

  // Build the where-clause; always pin cafeId.
  const where: any = { cafeId: cafe.id };
  if (body.ids?.length) {
    where.id = { in: body.ids };
  } else if (body.filter) {
    if (body.filter.status?.length) where.status = { in: body.filter.status };
    if (body.filter.type?.length)   where.type = { in: body.filter.type };
    if (body.filter.before || body.filter.after) {
      where.createdAt = {};
      if (body.filter.before) where.createdAt.lte = new Date(body.filter.before);
      if (body.filter.after)  where.createdAt.gte = new Date(body.filter.after);
    }
  }

  // Pre-count so the client knows what was actually targeted.
  const matched = await prisma.order.count({ where });
  if (matched === 0) {
    return NextResponse.json({ ok: true, matched: 0, deleted: 0 });
  }

  // Reviews FK back to Order is optional + has no cascade — null them out
  // first so order delete doesn't trip on Restrict.
  const targetIds = (
    await prisma.order.findMany({ where, select: { id: true } })
  ).map((o) => o.id);

  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, deleted: 0 });
  }

  await prisma.review.updateMany({
    where: { orderId: { in: targetIds } },
    data: { orderId: null },
  });

  // OrderItem and Payment cascade automatically (per schema).
  const result = await prisma.order.deleteMany({ where: { id: { in: targetIds } } });

  return NextResponse.json({ ok: true, matched: targetIds.length, deleted: result.count });
}
