import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { SettingsClient } from '@/components/dashboard/settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const full = await prisma.cafe.findUnique({
    where: { id: cafe.id },
    include: { settings: true },
  });
  return <SettingsClient cafe={full as any} />;
}
