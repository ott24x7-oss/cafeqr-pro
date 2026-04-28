import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

/**
 * Returns the logged-in customer's profile, recent orders and loyalty
 * balances per cafe. Caller is expected to be on a per-cafe storefront so
 * a `cafeSlug` query string narrows orders/loyalty to that cafe; without
 * it we return data across all cafes the customer has interacted with.
 */
export async function GET(req: Request) {
  const session = getCustomerSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const url = new URL(req.url);
  const cafeSlug = url.searchParams.get('cafeSlug');
  const tail = session.phone.slice(-10);

  // Order history — match by phone tail to handle stored variants
  // (with/without country code) consistently with /api/customer/history.
  const orderWhere: any = { customerPhone: { contains: tail } };
  if (cafeSlug) orderWhere.cafe = { slug: cafeSlug };

  const [orders, loyaltyAccounts] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: {
        cafe: { select: { name: true, slug: true, currency: true } },
        items: { select: { id: true, name: true, quantity: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.loyaltyAccount.findMany({
      where: cafeSlug
        ? { phone: session.phone, cafe: { slug: cafeSlug } }
        : { phone: session.phone },
      include: { cafe: { select: { name: true, slug: true, currency: true } } },
      orderBy: { points: 'desc' },
    }),
  ]);

  return NextResponse.json({
    phone: session.phone,
    orders,
    loyaltyAccounts,
  });
}
