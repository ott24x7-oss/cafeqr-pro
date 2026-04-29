import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const schema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  priceMonthly: z.number(),
  priceYearly: z.number(),
  maxTables: z.number().int(),
  maxMenuItems: z.number().int(),
  maxStaff: z.number().int(),
  // Per-month customer order limit. 0 = unlimited.
  maxOrdersPerMonth: z.number().int().min(0).optional(),
  whatsappEnabled: z.boolean().optional(),
  loyaltyEnabled: z.boolean().optional(),
  paymentEnabled: z.boolean().optional(),
  couponsEnabled: z.boolean().optional(),
  customBranding: z.boolean().optional(),
  customSubdomain: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  analytics: z.boolean().optional(),
  multiLanguage: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().optional(),
  features: z.array(z.string()).optional(),
});

/** Lowercase + alphanum-with-hyphens-only slug. Strips stray
 *  backticks / spaces / punctuation that admins sometimes paste in
 *  by accident (e.g. `gold\`` in production). */
function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (s?.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const raw = await req.json();
  const data = schema.parse(raw);
  data.slug = sanitizeSlug(data.slug || data.name);

  // Auto-assign sortOrder when the admin didn't supply one (which is
  // the common case via the editor modal). New plans land at the
  // bottom of the list, in creation order, so /pricing renders them
  // in the order the admin added them.
  if (data.sortOrder === undefined || data.sortOrder === 0) {
    const max = await prisma.plan.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (max._max.sortOrder ?? -1) + 1;
  }

  const plan = await prisma.plan.create({ data });
  return NextResponse.json({ plan });
}
