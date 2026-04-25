import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  transactionId: z.string().optional(),
  amount: z.number(),
  method: z.string().default('upi'),
  screenshotUrl: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const body = schema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        amount: body.amount,
        method: body.method,
        transactionId: body.transactionId,
        screenshotUrl: body.screenshotUrl,
        status: 'PENDING_VERIFICATION',
      },
      update: {
        transactionId: body.transactionId,
        screenshotUrl: body.screenshotUrl,
        status: 'PENDING_VERIFICATION',
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PENDING_VERIFICATION' },
    });

    await prisma.notification.create({
      data: {
        cafeId: order.cafeId,
        kind: 'PAYMENT',
        title: `Payment submitted for #${order.orderNumber}`,
        body: `₹${body.amount.toFixed(0)} · Verify in payments`,
        link: `/dashboard/payments`,
      },
    });

    return NextResponse.json({ ok: true, payment });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 400 });
  }
}
