import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { slugify } from '@/lib/utils';

const schema = z.object({ name: z.string().min(1), slug: z.string().optional(), imageUrl: z.string().optional() });

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = schema.parse(await req.json());
  const slug = body.slug || slugify(body.name);
  const existing = await prisma.category.findFirst({ where: { cafeId: cafe.id, slug } });
  const category = await prisma.category.create({
    data: { cafeId: cafe.id, name: body.name, slug: existing ? `${slug}-${Date.now().toString(36)}` : slug },
  });
  return NextResponse.json({ category });
}
