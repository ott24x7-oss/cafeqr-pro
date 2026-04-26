import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { getSiteSettings } from '@/lib/site-settings';
import { SubscriptionPayClient } from '@/components/dashboard/subscription-pay-client';

export const dynamic = 'force-dynamic';

export default async function SubscriptionPayPage({ params }: { params: { subId: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) redirect('/login');

  const [sub, site] = await Promise.all([
    prisma.subscription.findUnique({ where: { id: params.subId }, include: { plan: true } }),
    getSiteSettings({ fresh: true }),
  ]);
  if (!sub || sub.cafeId !== cafe.id) notFound();

  return (
    <SubscriptionPayClient
      subscription={{
        id: sub.id,
        amount: sub.amount,
        payableAmount: sub.payableAmount ?? sub.amount,
        billing: sub.billing,
        status: sub.status,
        transactionId: sub.transactionId,
        plan: { name: sub.plan.name, slug: sub.plan.slug },
      }}
      platform={{
        siteName: site.siteName,
        upiId: site.platformUpiId ?? '',
        upiQrUrl: site.platformUpiQrUrl ?? null,
        canAutoVerify: !!(site.platformGmailUser && site.platformGmailAppPassword),
      }}
      cafeName={cafe.name}
    />
  );
}
