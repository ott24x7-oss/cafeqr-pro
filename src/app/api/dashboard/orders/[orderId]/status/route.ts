import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { notifyCustomerStatus } from '@/lib/notify';

const schema = z.object({
  status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']),
  internalNote: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const { cafe, session } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = schema.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order || order.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const now = new Date();
  const update: any = {
    status: body.status,
    statusHistory: [...((order.statusHistory as any[]) ?? []), { status: body.status, at: now.toISOString(), by: session.user.email }],
  };
  if (body.internalNote) update.internalNote = body.internalNote;
  if (body.status === 'ACCEPTED') update.acceptedAt = now;
  if (body.status === 'PREPARING') update.preparingAt = now;
  if (body.status === 'READY') update.readyAt = now;
  if (body.status === 'SERVED') update.servedAt = now;
  if (body.status === 'COMPLETED') update.completedAt = now;
  if (body.status === 'CANCELLED') update.cancelledAt = now;

  const next = await prisma.order.update({
    where: { id: order.id },
    data: update,
    include: { items: true, table: true },
  });

  if (body.status === 'COMPLETED' || body.status === 'SERVED') {
    if (order.tableId) {
      const open = await prisma.order.count({
        where: { tableId: order.tableId, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] } },
      });
      if (!open) await prisma.table.update({ where: { id: order.tableId }, data: { isOccupied: false } });
    }
  }

  // Auto-notify customer over WhatsApp (no-op if not configured).
  notifyCustomerStatus(order.id, body.status).catch(() => {});

  return NextResponse.json({ order: next });
}
