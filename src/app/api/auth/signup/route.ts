import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { slugify, genCode } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  cafeName: z.string().min(2),
  password: z.string().min(6),
  planSlug: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    let slug = slugify(data.cafeName);
    if (!slug) slug = 'cafe';
    const collision = await prisma.cafe.findUnique({ where: { slug } });
    if (collision) slug = `${slug}-${genCode('', 4).toLowerCase()}`;

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const plan = data.planSlug
      ? await prisma.plan.findUnique({ where: { slug: data.planSlug } })
      : await prisma.plan.findFirst({ where: { slug: 'starter' } });

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: passwordHash,
        name: data.name,
        phone: data.phone,
        role: 'CAFE_OWNER',
      },
    });

    const cafe = await prisma.cafe.create({
      data: {
        name: data.cafeName,
        slug,
        ownerId: user.id,
        phone: data.phone,
        whatsappNo: data.phone,
        status: 'TRIAL',
        trialEndsAt,
        planId: plan?.id,
        settings: {
          create: {
            taxPercent: 5,
            serviceCharge: 0,
            packingCharge: 0,
            paymentEnabled: true,
            reviewEnabled: true,
            whatsappProvider: 'manual',
            notifyOwnerWA: true,
            notifyCustomerWA: true,
          },
        },
      },
    });

    // Owner = staff with OWNER role too, for unified access checks
    await prisma.staff.create({
      data: { cafeId: cafe.id, userId: user.id, role: 'OWNER', joinedAt: new Date() },
    });

    return NextResponse.json({ ok: true, cafeSlug: slug });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Signup error' }, { status: 400 });
  }
}
