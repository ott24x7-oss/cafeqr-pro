/**
 * Lightweight polling endpoint hit by the dashboard bell every ~12s.
 *
 * Originally this called getOwnerCafe(), which pulls Cafe + settings +
 * plan in a single round-trip — fine on first render, but wasteful on
 * a 12s poll. Across a busy day a single owner's tab generated hundreds
 * of unnecessary plan + settings loads, occasionally saturating the
 * Prisma connection pool right when the user was tapping a nav link
 * and making the next page feel like it took 10s to load.
 *
 * Now: session lookup + a single ownership SELECT that returns just
 * Cafe.id, then the notifications query. Notification has an
 * @@index([cafeId]) so the take:20 fetch is sub-ms.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cafeId = url.searchParams.get('cafeId');
  if (!cafeId) return NextResponse.json({ items: [] });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  // Owner OR active staff at this cafe. Two cheap selects beat one heavy
  // join — and they parallelise.
  const [ownerHit, staffHit] = await Promise.all([
    prisma.cafe.findFirst({
      where: { id: cafeId, ownerId: session.user.id },
      select: { id: true },
    }),
    prisma.staff.findFirst({
      where: { cafeId, userId: session.user.id, isActive: true },
      select: { id: true },
    }),
  ]);
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
  if (!ownerHit && !staffHit && !isSuperAdmin) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.notification.findMany({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, title: true, body: true, link: true, isRead: true, createdAt: true,
    },
  });
  return NextResponse.json({ items });
}
