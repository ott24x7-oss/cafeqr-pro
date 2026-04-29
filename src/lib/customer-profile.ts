import 'server-only';
import { prisma } from './prisma';
import { getCustomerSession } from './customer-session';

/**
 * Server-side lookup of the logged-in customer's profile within the
 * context of one cafe. Reused by:
 *   - /cafe/[slug]/page.tsx (lobby pill + cart pre-fill)
 *   - /cafe/[slug]/table/[tableCode]/page.tsx (cart pre-fill)
 *   - /cafe/[slug]/account/page.tsx (loyalty card + history)
 *
 * Returns null when the customer cookie is missing/expired so the caller
 * can render the anonymous experience without an extra branch.
 */
export interface CustomerProfile {
  phone: string;
  name: string | null;
  points: number;
  loyaltyEnabled: boolean;
}

export async function getCustomerProfile(cafeId: string, loyaltyEnabled: boolean): Promise<CustomerProfile | null> {
  const session = getCustomerSession();
  if (!session) return null;
  const tail = session.phone.slice(-10);

  // Loyalty account holds the canonical name + points balance for this
  // cafe. If they've never earned points (or loyalty is off) fall back to
  // pulling the most recent order's customerName so cart pre-fill still
  // shows their name.
  const [account, latestOrder] = await Promise.all([
    prisma.loyaltyAccount.findUnique({
      where: { cafeId_phone: { cafeId, phone: session.phone } },
    }),
    prisma.order.findFirst({
      where: { cafeId, customerPhone: { contains: tail }, customerName: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { customerName: true },
    }),
  ]);

  return {
    phone: session.phone,
    name: account?.name ?? latestOrder?.customerName ?? null,
    points: account?.points ?? 0,
    loyaltyEnabled,
  };
}
