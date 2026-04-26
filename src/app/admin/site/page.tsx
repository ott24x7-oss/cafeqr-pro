import { requireSuperAdmin } from '@/lib/guards';
import { getSiteSettings } from '@/lib/site-settings';
import { SiteSettingsClient } from '@/components/admin/site-settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSitePage() {
  await requireSuperAdmin();
  const s = await getSiteSettings({ fresh: true });
  // Mask password — client uses a sentinel and only sends it back when the
  // user types a new one.
  const safe = { ...s, smtpPass: s.smtpPass ? '__unchanged__' : '' };
  return <SiteSettingsClient initial={safe} />;
}
