/**
 * Flip the cafe's "we're open now" flag. Used by the green/red toggle
 * in the dashboard header — owners and active staff with the OWNER
 * role can switch it; everyone else gets 401.
 *
 * The flag drives the customer-facing Open / Closed badge on
 * /cafe/[slug] and blocks new orders in /api/orders/place when off.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ open: z.boolean() });

export async function POST(req: Request) {
  const { cafe, staffRole } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Restrict to OWNER / SUPER_ADMIN — front-of-house staff shouldn't be
  // able to silently close the cafe.
  if (staffRole && staffRole !== 'OWNER') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const updated = await prisma.cafe.update({
    where: { id: cafe.id },
    data: { isOpen: body.open },
    select: { id: true, isOpen: true },
  });
  return NextResponse.json({ ok: true, isOpen: updated.isOpen });
}
