import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/whatsapp';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');
  if (!phone) return NextResponse.json({ orders: [] });
  const normalized = normalizePhone(phone);
  const tail = normalized.slice(-10);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { customerPhone: { endsWith: tail } },
        { customerPhone: { contains: tail } },
      ],
    },
    include: { items: { select: { id: true } }, cafe: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ orders });
}
