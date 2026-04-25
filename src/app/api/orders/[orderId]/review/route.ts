import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  customerName: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const body = schema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const review = await prisma.review.upsert({
      where: { orderId: order.id },
      create: {
        cafeId: order.cafeId,
        orderId: order.id,
        rating: body.rating,
        comment: body.comment,
        customerName: body.customerName ?? order.customerName,
        customerPhone: order.customerPhone,
      },
      update: { rating: body.rating, comment: body.comment },
    });

    await prisma.notification.create({
      data: {
        cafeId: order.cafeId,
        kind: 'REVIEW',
        title: `${body.rating}★ review for #${order.orderNumber}`,
        body: body.comment?.slice(0, 80),
        link: `/dashboard/reviews`,
      },
    });

    return NextResponse.json({ ok: true, review });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 400 });
  }
}
