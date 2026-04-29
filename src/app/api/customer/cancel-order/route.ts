import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';

export const runtime = 'nodejs';

/**
 * Customer-initiated cancellation. Allowed only when the order still
 * belongs to the logged-in phone AND the kitchen hasn't started yet
 * (status is NEW or ACCEPTED). Once it's PREPARING/READY the customer has
 * to talk to the cafe — we don't want a refund/wasted-prep dispute.
 */
export async function POST(req: Request) {
  const session = getCustomerSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { orderId } = await req.json().catch(() => ({} as any));
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Phone-tail match — same logic as the history lookup so a stored
  // "+9198..." variant still matches a session phone of "98...".
  const tail = session.phone.slice(-10);
  if (!order.customerPhone || !order.customerPhone.endsWith(tail)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (order.status !== 'NEW' && order.status !== 'ACCEPTED') {
    return NextResponse.json(
      { error: 'Order is already being prepared. Please contact the cafe.' },
      { status: 409 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  // Free the table if this was the last open order on it. Mirrors the
  // owner-side status route — without this, customer cancellations leave
  // the table stuck on "Occupied".
  if (order.tableId) {
    const open = await prisma.order.count({
      where: { tableId: order.tableId, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] } },
    });
    if (!open) {
      await prisma.table.update({ where: { id: order.tableId }, data: { isOccupied: false } });
    }
  }

  return NextResponse.json({ ok: true, status: updated.status });
}
