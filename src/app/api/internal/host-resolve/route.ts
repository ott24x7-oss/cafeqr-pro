/**
 * Edge middleware can't talk to Prisma directly, so it calls this Node-runtime
 * endpoint to resolve a custom-domain hostname → cafe slug. The result is
 * cached for 60s on Next's fetch layer (see middleware.ts), so repeat hits on
 * a hot domain do not round-trip.
 *
 * Open by design: it returns nothing more than what the public hostname
 * already exposes, and rate-limiting lives at Railway's edge.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = (url.searchParams.get('host') ?? '').toLowerCase().trim();
  if (!host) return NextResponse.json({ slug: null }, { status: 200 });

  const cafe = await prisma.cafe.findFirst({
    where: { customDomain: host, customDomainStatus: 'verified' },
    select: { slug: true },
  });

  // 60s revalidate on the middleware side — see fetch() options in middleware.ts.
  return NextResponse.json(
    { slug: cafe?.slug ?? null },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } },
  );
}
