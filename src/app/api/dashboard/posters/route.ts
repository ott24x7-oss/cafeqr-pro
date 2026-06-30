import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const schema = z.object({
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  linkType: z.enum(['none', 'category', 'item', 'url']).optional(),
  linkValue: z.string().nullable().optional(),
  bgColor: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const posters = await prisma.poster.findMany({
    where: { cafeId: cafe.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ posters });
}

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    const issues = (e?.issues as any[])?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: issues || e?.message || 'Invalid payload' }, { status: 400 });
  }

  // New posters go to the end of the carousel.
  const last = await prisma.poster.findFirst({
    where: { cafeId: cafe.id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const poster = await prisma.poster.create({
    data: { ...body, cafeId: cafe.id, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  return NextResponse.json({ poster });
}
