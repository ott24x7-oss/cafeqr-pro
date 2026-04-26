import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function GET(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');     // CSV of statuses
  const type = url.searchParams.get('type');         // CSV
  const search = url.searchParams.get('q');          // order #, customer name, phone
  const from = url.searchParams.get('from');         // YYYY-MM-DD
  const to = url.searchParams.get('to');
  const tableId = url.searchParams.get('tableId');
  const cursor = url.searchParams.get('cursor');     // last seen id
  const take = Math.min(Number(url.searchParams.get('take') ?? 50), 100);

  const where: any = { cafeId: cafe.id };
  if (status) where.status = { in: status.split(',') };
  if (type) where.type = { in: type.split(',') };
  if (tableId) where.tableId = tableId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, table: true, payment: true },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  let nextCursor: string | null = null;
  if (orders.length > take) {
    const next = orders.pop();
    nextCursor = next?.id ?? null;
  }

  const totalCount = await prisma.order.count({ where });
  const sum = await prisma.order.aggregate({ where, _sum: { totalAmount: true } });

  return NextResponse.json({
    orders,
    nextCursor,
    totalCount,
    revenue: sum._sum.totalAmount ?? 0,
  });
}
