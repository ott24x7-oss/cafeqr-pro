import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      acceptedAt: true,
      preparingAt: true,
      readyAt: true,
      servedAt: true,
      completedAt: true,
      cancelledAt: true,
    },
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ order });
}
