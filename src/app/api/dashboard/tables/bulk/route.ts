import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { genCode } from '@/lib/utils';

const schema = z.object({ qty: z.number().int().min(1).max(100) });

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { qty } = schema.parse(await req.json());
  const existing = await prisma.table.findMany({ where: { cafeId: cafe.id }, select: { number: true } });
  const usedNums = new Set(existing.map((t) => t.number));

  const created: any[] = [];
  for (let i = 1; created.length < qty && i < qty + 200; i++) {
    const num = String(i);
    if (usedNums.has(num) || usedNums.has(`T${i}`)) continue;
    const t = await prisma.table.create({
      data: {
        cafeId: cafe.id,
        number: num,
        capacity: 4,
        code: `T${cafe.slug.slice(0, 3).toUpperCase()}-${genCode('', 5)}`,
      },
    });
    usedNums.add(num);
    created.push(t);
  }
  return NextResponse.json({ tables: created });
}
