import { requireSuperAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { MobileAppClient } from '@/components/admin/mobile-app-client';

export const dynamic = 'force-dynamic';

export default async function AdminMobileAppPage() {
  await requireSuperAdmin();
  const row = await prisma.mobileAppConfig.findUnique({ where: { id: 'singleton' } });
  const initial = {
    appName: row?.appName ?? 'WatShop Cafe',
    logoData: row?.logoData ?? '',
    splashLogoData: row?.splashLogoData ?? '',
    splashBackgroundColor: row?.splashBackgroundColor ?? '#0B0F14',
    primaryColor: row?.primaryColor ?? '#22C55E',
    tagline: row?.tagline ?? 'QR Ordering for Cafes',
    maintenanceMode: !!row?.maintenanceMode,
    maintenanceMessage: row?.maintenanceMessage ?? 'App is under maintenance. Please try again later.',
    forceUpdate: !!row?.forceUpdate,
    minimumVersionCode: row?.minimumVersionCode ?? 1,
    amazonAppstoreUrl: row?.amazonAppstoreUrl ?? 'https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe',
    playStoreUrl: row?.playStoreUrl ?? 'https://play.google.com/store/apps/details?id=com.watshop.cafe',
  };
  return <MobileAppClient initial={initial} />;
}
