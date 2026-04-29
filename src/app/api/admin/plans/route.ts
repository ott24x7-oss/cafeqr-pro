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

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (s?.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = schema.parse(await req.json());
  const plan = await prisma.plan.create({ data });
  return NextResponse.json({ plan });
}
