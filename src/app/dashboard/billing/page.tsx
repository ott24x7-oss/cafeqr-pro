import Link from 'next/link';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const [plans, current, subs] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    cafe.planId ? prisma.plan.findUnique({ where: { id: cafe.planId } }) : null,
    prisma.subscription.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Billing</h1>
        <p className="text-coffee-600 text-sm">Manage your plan and subscription</p>
      </div>

      <div className="card-warm bg-coffee-gradient text-cream-50 border-coffee-700">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-cream-200/80 text-sm">Current plan</div>
            <div className="font-display text-2xl md:text-3xl font-bold">{current?.name ?? 'Trial'}</div>
            {cafe.status === 'TRIAL' && cafe.trialEndsAt && (
              <div className="text-cream-200/90 text-sm mt-1">
                Trial ends {formatDate(cafe.trialEndsAt, { dateStyle: 'medium', timeStyle: undefined })}
              </div>
            )}
            {cafe.planEndsAt && (
              <div className="text-cream-200/90 text-sm mt-1">
                Renews on {formatDate(cafe.planEndsAt, { dateStyle: 'medium', timeStyle: undefined })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pill bg-white/15 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {cafe.status}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === current?.id;
          // Compare against current plan price to label up/down. If there is
          // no current plan (trial), every paid plan is an upgrade and free
          // plans are just "Choose".
          const currentPrice = current?.priceMonthly ?? -1;
          const isUpgrade = !isCurrent && p.priceMonthly > currentPrice;
          const isDowngrade = !isCurrent && p.priceMonthly < currentPrice && currentPrice >= 0;
          const label = isCurrent ? 'Current plan' : isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Choose';
          return (
            <div key={p.id} className={`card-warm flex flex-col ${p.isPopular ? 'ring-2 ring-coffee-300' : ''} ${isCurrent ? 'ring-2 ring-emerald-300' : ''}`}>
              <div className="flex gap-2 self-start mb-2">
                {p.isPopular && <span className="pill-amber">Popular</span>}
                {isCurrent && <span className="pill bg-emerald-100 text-emerald-700">Active</span>}
              </div>
              <h3 className="font-display text-xl font-bold text-coffee-900">{p.name}</h3>
              <p className="text-sm text-coffee-600 min-h-[40px]">{p.description}</p>
              <div className="font-display text-3xl font-bold text-coffee-900 mt-3">
                {p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly}`}
                {p.priceMonthly > 0 && <span className="text-coffee-500 text-sm"> /mo</span>}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-coffee-700 flex-1">
                <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />{p.maxTables} tables</li>
                <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />{p.maxMenuItems} menu items</li>
                <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />{p.maxStaff} staff</li>
                {p.whatsappEnabled && <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />WhatsApp notifications</li>}
                {p.analytics && <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />Analytics</li>}
                {p.customBranding && <li className="flex items-start gap-2"><Check className="h-3.5 w-3.5 text-emerald-600 mt-1" />Custom branding</li>}
              </ul>
              {isCurrent ? (
                <Button className="w-full mt-4" variant="outline" disabled>
                  <Check className="h-3.5 w-3.5" /> {label}
                </Button>
              ) : (
                <form action="/api/dashboard/billing/select" method="POST" className="mt-4">
                  <input type="hidden" name="planId" value={p.id} />
                  <Button className="w-full" type="submit">
                    {label} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {subs.length > 0 && (
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-2">History</h2>
          <ul className="text-sm divide-y divide-coffee-50">
            {subs.map((s) => (
              <li key={s.id} className="py-2 flex justify-between">
                <span>{formatDate(s.createdAt, { dateStyle: 'medium', timeStyle: undefined })}</span>
                <span className="font-semibold">₹{s.amount} · {s.billing}</span>
                <span className={`pill ${s.status === 'active' ? 'pill-wa' : 'pill-coffee'}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-coffee-500">
        Plan switches go through a UPI payment with auto-verify against the platform's bank inbox.
        Free plans activate instantly.
      </p>
    </div>
  );
}
