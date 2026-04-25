import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { CouponsManager } from '@/components/dashboard/coupons-manager';

export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const coupons = await prisma.coupon.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: 'desc' },
  });
  return <CouponsManager initial={coupons} />;
}
