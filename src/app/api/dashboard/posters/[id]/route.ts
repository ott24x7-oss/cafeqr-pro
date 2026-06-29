import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const updateSchema = z.object({
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
  sortOrder: z.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const poster = await prisma.poster.findUnique({ where: { id: params.id } });
  if (!poster || poster.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (e: any) {
    const issues = (e?.issues as any[])?.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: issues || e?.message || 'Invalid payload' }, { status: 400 });
  }

  const updated = await prisma.poster.update({ where: { id: poster.id }, data: body as any });
  return NextResponse.json({ poster: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const poster = await prisma.poster.findUnique({ where: { id: params.id } });
  if (!poster || poster.cafeId !== cafe.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.poster.delete({ where: { id: poster.id } });
  return NextResponse.json({ ok: true });
}
