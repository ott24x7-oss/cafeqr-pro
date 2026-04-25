import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { hashPassword } from '@/lib/auth';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']),
});

export async function POST(req: Request) {
  const { cafe, session } = await getOwnerCafe();
  if (!cafe || session.user.role !== 'CAFE_OWNER' && session.user.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = schema.parse(await req.json());
  let user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        phone: body.phone,
        password: await hashPassword(body.password),
        role: 'STAFF',
      },
    });
  }

  const exists = await prisma.staff.findFirst({ where: { cafeId: cafe.id, userId: user.id } });
  if (exists) return NextResponse.json({ error: 'Already on team' }, { status: 400 });

  const staff = await prisma.staff.create({
    data: { cafeId: cafe.id, userId: user.id, role: body.role, joinedAt: new Date() },
    include: { user: true },
  });
  return NextResponse.json({ staff });
}
