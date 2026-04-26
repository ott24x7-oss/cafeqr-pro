import { requireSuperAdmin } from '@/lib/guards';
import { getSiteSettings } from '@/lib/site-settings';
import { SiteSettingsClient } from '@/components/admin/site-settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSitePage() {
  await requireSuperAdmin();
  const s = await getSiteSettings({ fresh: true });
  // Mask password — client uses a sentinel and only sends it back when the
  // user types a new one.
  const safe = {
    ...s,
    smtpPass: s.smtpPass ? '__unchanged__' : '',
    platformGmailAppPassword: s.platformGmailAppPassword ? '__unchanged__' : '',
  };
  // Surface infra-level config that the admin can't change from the UI but
  // should be able to confirm at a glance (the PHP relay is the safety net
  // when Gmail SMTP is blocked from the host network).
  const infra = {
    phpMailerUrl: process.env.PHP_MAILER_URL || 'https://ott24x7.com/mailer/send.php',
    phpMailerKeySet: !!process.env.PHP_MAILER_KEY,
    imapRelayUrl: process.env.IMAP_RELAY_URL ||
      (process.env.PHP_MAILER_URL
        ? process.env.PHP_MAILER_URL.replace(/\/send\.php(?:[?#].*)?$/, '/imap.php')
        : 'https://ott24x7.com/mailer/imap.php'),
  };
  return <SiteSettingsClient initial={safe} infra={infra} />;
}
