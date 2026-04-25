import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const schema = z.object({
  status: z.enum(['UNPAID', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'REFUNDED']),
});

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const { cafe, session } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { status } = schema.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order || order.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: status },
  });
  await prisma.payment.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, amount: order.totalAmount, method: 'manual', status, paidAt: status === 'PAID' ? new Date() : null, verifiedBy: session.user.email },
    update: { status, paidAt: status === 'PAID' ? new Date() : null, verifiedAt: new Date(), verifiedBy: session.user.email },
  });
  return NextResponse.json({ ok: true });
}
