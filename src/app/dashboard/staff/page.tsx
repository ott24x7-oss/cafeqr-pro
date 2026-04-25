import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { StaffManager } from '@/components/dashboard/staff-manager';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const staff = await prisma.staff.findMany({
    where: { cafeId: cafe.id },
    include: { user: true },
    orderBy: { invitedAt: 'desc' },
  });
  return <StaffManager initialStaff={staff} />;
}
