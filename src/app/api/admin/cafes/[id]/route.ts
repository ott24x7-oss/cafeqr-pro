import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user?.role === 'SUPER_ADMIN' ? s : null;
}

const schema = z.object({
  status: z.enum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED']).optional(),
  planId: z.string().nullable().optional(),
  trialEndsAt: z.string().optional(),
  planEndsAt: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = schema.parse(await req.json());
  const cafe = await prisma.cafe.update({
    where: { id: params.id },
    data: {
      ...body,
      trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : undefined,
      planEndsAt: body.planEndsAt ? new Date(body.planEndsAt) : undefined,
    },
  });
  return NextResponse.json({ cafe });
}
