/**
 * Super-admin broadcast: drop a Notification row for every cafe (and
 * optionally every cafe owner) so the next time they hit the dashboard
 * the bell shows the message.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().min(2).max(140),
  body: z.string().max(2000).optional(),
  link: z.string().max(500).optional(),
  scope: z.enum(['active', 'all']).default('active'),
});

export async function POST(req: Request) {
  await requireSuperAdmin();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }

  const cafes = await prisma.cafe.findMany({
    where: body.scope === 'active'
      ? { status: { in: ['ACTIVE', 'TRIAL'] } }
      : {},
    select: { id: true, ownerId: true },
  });

  if (cafes.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  // Two rows per cafe: one cafe-scoped (shows up in the dashboard bell),
  // one user-scoped (the owner sees it personally).
  const rows = cafes.flatMap((c) => [
    {
      cafeId: c.id,
      kind: 'SYSTEM' as const,
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
    },
    {
      userId: c.ownerId,
      kind: 'SYSTEM' as const,
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
    },
  ]);

  await prisma.notification.createMany({ data: rows });

  return NextResponse.json({ ok: true, count: cafes.length });
}
