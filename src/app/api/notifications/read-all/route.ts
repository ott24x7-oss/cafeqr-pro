import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.notification.updateMany({ where: { cafeId: cafe.id, isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
