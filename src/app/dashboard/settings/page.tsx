import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { SettingsClient } from '@/components/dashboard/settings-client';

export const dynamic = 'force-dynamic';

const SECRET_FIELDS = ['waCloudToken', 'waCloudVerifyToken', 'gmailAppPassword'] as const;

export default async function SettingsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const full = await prisma.cafe.findUnique({
    where: { id: cafe.id },
    include: { settings: true },
  });
  if (!full) return null;

  // Never ship encrypted secrets to the browser. Replace with a sentinel the
  // client uses to mean "unchanged" when posting back.
  const settings: any = full.settings ? { ...full.settings } : null;
  if (settings) {
    for (const k of SECRET_FIELDS) {
      if (settings[k]) settings[k] = '__unchanged__';
      else settings[k] = '';
    }
  }
  const safeCafe: any = { ...full, settings };

  return <SettingsClient cafe={safeCafe} />;
}
