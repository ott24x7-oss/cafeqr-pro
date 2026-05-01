/**
 * Admin helper that re-numbers sortOrder on every Plan row by
 * priceMonthly ascending. Used when the editor was used to add
 * plans out of order and they're rendering badly on /pricing.
 *
 * One-click fix; the admin UI gets a "Auto-sort by price" button
 * that hits this. Also sanitizes any slug typos along the way
 * (the old Gold row had `/gold\``).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function run() {
  const s = await getServerSession(authOptions);
  if (s?.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const plans = await prisma.plan.findMany({
    orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }],
  });

  const updates = await prisma.$transaction(
    plans.map((p, i) => {
      const cleanSlug = sanitizeSlug(p.slug || p.name);
      const slugChanged = cleanSlug !== p.slug;
      return prisma.plan.update({
        where: { id: p.id },
        data: {
          sortOrder: i,
          ...(slugChanged ? { slug: cleanSlug } : {}),
        },
      });
    }),
  );

  // Bust the cached HTML on /, /pricing, /dashboard/billing so the new
  // sort order shows up immediately instead of after the route's
  // revalidate window.
  const { revalidatePlanSurfaces } = await import('@/lib/revalidate-plan-surfaces');
  revalidatePlanSurfaces();

  return NextResponse.json({
    ok: true,
    resorted: updates.length,
    order: updates.map((p) => ({ slug: p.slug, name: p.name, sortOrder: p.sortOrder })),
  });
}

export async function GET()  { return run(); }
export async function POST() { return run(); }
