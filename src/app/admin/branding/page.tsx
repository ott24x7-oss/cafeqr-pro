import { requireSuperAdmin } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import { BrandingClient } from '@/components/admin/branding-client';

export const dynamic = 'force-dynamic';

export default async function AdminBrandingPage() {
  await requireSuperAdmin();
  const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
  const initial = {
    logoDataUrl: row?.logoDataUrl ?? '',
    brandName: row?.brandName ?? '',
    tagline: row?.tagline ?? '',
    footerText: row?.footerText ?? '',
    primaryColor: row?.primaryColor ?? '',
  };
  return <BrandingClient initial={initial} />;
}
