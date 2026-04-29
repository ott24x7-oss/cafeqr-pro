import Link from 'next/link';
import { ArrowUpRight, Coffee, ListOrdered, Star, CreditCard, ChefHat, AlertCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CafeStoreLink } from '@/components/dashboard/cafe-store-link';
import { RevenueSparkline } from '@/components/dashboard/revenue-sparkline';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { UsageBanner } from '@/components/dashboard/usage-banner';
import { PlanCard } from '@/components/dashboard/plan-card';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const sparkSince = new Date(Date.now() - 30 * 86400000);
  sparkSince.setHours(0, 0, 0, 0);

  const [todayOrders, allTodayOrders, pendingOrders, completedToday, reviewAgg, latestOrders, topItems, sparkOrders, menuItemCount, tableCount] = await Promise.all([
    prisma.order.aggregate({
      where: { cafeId: cafe.id, createdAt: { gte: since } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.order.count({ where: { cafeId: cafe.id, createdAt: { gte: since } } }),
    prisma.order.count({ where: { cafeId: cafe.id, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] } } }),
    prisma.order.count({ where: { cafeId: cafe.id, status: 'COMPLETED', createdAt: { gte: since } } }),
    prisma.review.aggregate({ where: { cafeId: cafe.id }, _avg: { rating: true }, _count: true }),
    prisma.order.findMany({
      where: { cafeId: cafe.id },
      include: { items: true, table: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.orderItem.groupBy({
      by: ['name'],
      where: { order: { cafeId: cafe.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.order.findMany({
      where: { cafeId: cafe.id, createdAt: { gte: sparkSince }, status: { not: 'CANCELLED' } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.menuItem.count({ where: { cafeId: cafe.id } }),
    prisma.table.count({ where: { cafeId: cafe.id } }),
  ]);

  // First-time setup checklist — shown until everything is ✓.
  const setupItems = [
    {
      done: Boolean(cafe.name && cafe.address && cafe.phone),
      enLabel: 'Fill in cafe profile (name, address, phone)',
      hiLabel: 'अपने कैफ़े की जानकारी भरें — नाम, पता, फ़ोन',
      href: '/dashboard/settings',
    },
    {
      done: Boolean(cafe.settings?.upiId || cafe.settings?.upiQrUrl),
      enLabel: 'Set your UPI ID so customers can pay you',
      hiLabel: 'UPI ID डालें ताकि ग्राहक पैसे भेज सकें',
      href: '/dashboard/settings',
    },
    {
      done: menuItemCount > 0,
      enLabel: 'Add at least one menu item',
      hiLabel: 'मेनू में कम से कम एक चीज़ जोड़ें',
      href: '/dashboard/menu',
    },
    {
      done: tableCount > 0,
      enLabel: 'Create a table & generate its QR code',
      hiLabel: 'टेबल बनाएं और उसका QR कोड निकालें',
      href: '/dashboard/tables',
    },
    {
      done: cafe.settings?.whatsappProvider !== undefined && cafe.settings?.whatsappProvider !== 'manual',
      enLabel: 'Connect WhatsApp for live order alerts (optional)',
      hiLabel: 'WhatsApp जोड़ें ताकि नए ऑर्डर तुरंत मिलें (वैकल्पिक)',
      href: '/dashboard/settings',
    },
  ];

  // Bucket the last 30 days into per-day revenue totals (oldest → newest).
  const dayCount = 30;
  const buckets = new Array(dayCount).fill(0) as number[];
  const startMidnight = sparkSince.getTime();
  for (const o of sparkOrders) {
    const d = new Date(o.createdAt);
    d.setHours(0, 0, 0, 0);
    const idx = Math.floor((d.getTime() - startMidnight) / 86400000);
    if (idx >= 0 && idx < dayCount) buckets[idx] += o.totalAmount;
  }
  const totalRevenue30d = buckets.reduce((a, b) => a + b, 0);
  const avgPerDay = totalRevenue30d / dayCount;

  const stats = [
    { l: "Today's revenue", v: formatCurrency(todayOrders._sum.totalAmount ?? 0), s: `${allTodayOrders} orders`, tone: 'text-emerald-600', icon: Coffee },
    { l: 'Pending orders', v: pendingOrders, s: 'Need action', tone: 'text-amber-600', icon: ListOrdered },
    { l: 'Completed today', v: completedToday, s: 'On track', tone: 'text-coffee-700', icon: ChefHat },
    { l: 'Reviews', v: (reviewAgg._avg.rating ?? 0).toFixed(1) + '★', s: `${reviewAgg._count} ratings`, tone: 'text-caramel-dark', icon: Star },
  ];

  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || '';

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Dashboard</h1>
        <p className="text-coffee-600 text-sm">
          Here's what's happening at {cafe.name} today.
          <span className="text-coffee-500"> · आज {cafe.name} में क्या हो रहा है।</span>
        </p>
      </div>

      <UsageBanner cafeId={cafe.id} />

      <PlanCard cafeId={cafe.id} />

      <SetupChecklist items={setupItems} />

      <CafeStoreLink
        slug={cafe.slug}
        cafeName={cafe.name}
        appUrl={appUrl}
        customDomain={cafe.customDomain}
        customDomainStatus={cafe.customDomainStatus}
        full={false}
      />

      {cafe.status === 'TRIAL' && cafe.trialEndsAt && (
        <div className="card-warm border-amber-200 bg-amber-50 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm flex-1">
            <span className="font-semibold text-amber-900">You're on trial.</span>
            <span className="text-amber-800"> Upgrade before {new Date(cafe.trialEndsAt).toLocaleDateString('en-IN')} to keep all features.</span>
          </div>
          <Link href="/dashboard/billing"><Button size="sm">Upgrade</Button></Link>
        </div>
      )}

      <RevenueSparkline
        buckets={buckets}
        totalRevenue={totalRevenue30d}
        avgPerDay={avgPerDay}
        currency={cafe.currency ?? 'INR'}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="card-warm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-coffee-500">{s.l}</div>
                <div className="font-display text-2xl font-bold text-coffee-900 mt-1">{s.v}</div>
                <div className={`text-xs ${s.tone}`}>{s.s}</div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-cream-100 grid place-items-center text-coffee-700">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Latest orders */}
        <div className="card-warm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-coffee-900">Latest orders</h2>
            <Link href="/dashboard/orders" className="text-xs text-coffee-700 hover:text-coffee-900 flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {latestOrders.length === 0 ? (
            <div className="text-center text-coffee-500 py-10 text-sm">No orders yet — share your QR codes!</div>
          ) : (
            <div className="divide-y divide-coffee-50">
              {latestOrders.map((o) => (
                <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between py-3 hover:bg-cream-50 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-semibold text-coffee-900 text-sm">#{o.orderNumber}</div>
                    <div className="text-xs text-coffee-600">
                      {o.items.length} items · {o.table ? `Table ${o.table.number}` : o.type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-coffee-900 text-sm">{formatCurrency(o.totalAmount)}</div>
                    <span className={`pill text-[10px] ${o.status === 'NEW' ? 'pill-amber' : o.status === 'COMPLETED' ? 'pill-coffee' : 'pill-wa'}`}>
                      {o.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top items */}
        <div className="card-warm">
          <h2 className="font-bold text-coffee-900 mb-3">Top items (7d)</h2>
          {topItems.length === 0 ? (
            <div className="text-center text-coffee-500 py-6 text-sm">Not enough data.</div>
          ) : (
            <ul className="space-y-2">
              {topItems.map((it, i) => (
                <li key={it.name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cream-200 text-xs font-bold text-coffee-800">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-coffee-900 truncate">{it.name}</div>
                    <div className="text-xs text-coffee-500">{it._sum.quantity} sold</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { t: 'Add menu item', d: 'Expand your offerings', href: '/dashboard/menu', icon: Coffee },
          { t: 'Create QR table', d: 'Generate code & print', href: '/dashboard/tables', icon: ListOrdered },
          { t: 'Verify payment', d: 'Pending UPI checks', href: '/dashboard/payments', icon: CreditCard },
          { t: 'Read reviews', d: 'See what customers say', href: '/dashboard/reviews', icon: Star },
        ].map((c) => (
          <Link key={c.t} href={c.href} className="card-warm hover:-translate-y-0.5 transition">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-coffee-gradient grid place-items-center text-cream-50">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-coffee-900 text-sm">{c.t}</div>
                <div className="text-xs text-coffee-500">{c.d}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
