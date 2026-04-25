import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function GET() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ orders: [] }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { cafeId: cafe.id, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] } },
    include: { items: true, table: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ orders });
}
