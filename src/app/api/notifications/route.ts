import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cafeId = url.searchParams.get('cafeId');
  const { cafe } = await getOwnerCafe();
  if (!cafe || cafe.id !== cafeId) return NextResponse.json({ items: [] });
  const items = await prisma.notification.findMany({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ items });
}
