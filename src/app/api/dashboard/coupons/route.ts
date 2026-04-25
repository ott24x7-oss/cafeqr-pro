import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const schema = z.object({
  code: z.string().min(1).max(40),
  description: z.string().optional(),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number(),
  minOrder: z.number().default(0),
  maxDiscount: z.number().optional().nullable(),
  usageLimit: z.number().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = schema.parse(await req.json());
  const exists = await prisma.coupon.findFirst({ where: { cafeId: cafe.id, code: body.code } });
  if (exists) return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
  const coupon = await prisma.coupon.create({
    data: {
      cafeId: cafe.id,
      code: body.code,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minOrder: body.minOrder,
      maxDiscount: body.maxDiscount ?? null,
      usageLimit: body.usageLimit ?? null,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
    },
  });
  return NextResponse.json({ coupon });
}
