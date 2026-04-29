/**
 * Manual override that flips a table to Available, regardless of any
 * stored isOccupied flag. The /dashboard/tables page already computes
 * occupancy live from open-order count, so the only way a table can
 * still appear "Occupied" after this is if there's a genuinely open
 * order on it — in which case we close those orders out as CANCELLED
 * and free the table in one shot.
 *
 * Used by the "Free now" link in the table card on /dashboard/tables.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { cafe, session } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const table = await prisma.table.findUnique({ where: { id: params.id } });
  if (!table || table.cafeId !== cafe.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Cancel any orders that were still holding the table. Owner is taking
  // explicit action here, so we trust them — if they hit "Free now" on
  // a busy table by accident, the cancelled orders are recoverable from
  // /dashboard/orders.
  const now = new Date();
  const open = await prisma.order.findMany({
    where: { tableId: table.id, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] } },
    select: { id: true, statusHistory: true },
  });
  if (open.length) {
    await prisma.$transaction(
      open.map((o) =>
        prisma.order.update({
          where: { id: o.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            statusHistory: [
              ...((o.statusHistory as any[]) ?? []),
              { status: 'CANCELLED', at: now.toISOString(), by: session.user.email, reason: 'table-freed' },
            ],
          },
        }),
      ),
    );
  }

  await prisma.table.update({ where: { id: table.id }, data: { isOccupied: false } });

  return NextResponse.json({ ok: true, cancelled: open.length });
}
