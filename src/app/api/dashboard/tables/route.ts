import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { genCode } from '@/lib/utils';

const schema = z.object({
  number: z.string().min(1),
  capacity: z.number().int().min(1).max(50).default(4),
  area: z.string().optional(),
});

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = schema.parse(await req.json());

  const exists = await prisma.table.findFirst({ where: { cafeId: cafe.id, number: body.number } });
  if (exists) return NextResponse.json({ error: 'Table number exists' }, { status: 400 });

  const code = `T${cafe.slug.slice(0, 3).toUpperCase()}-${genCode('', 5)}`;
  const table = await prisma.table.create({
    data: { cafeId: cafe.id, number: body.number, capacity: body.capacity, code, area: body.area },
  });
  return NextResponse.json({ table });
}
