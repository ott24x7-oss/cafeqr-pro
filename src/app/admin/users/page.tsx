import Link from 'next/link';
import { Users, IndianRupee, Clock, Coffee, Bell } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { UsersFilterTabs, RemindButton } from '@/components/admin/users-actions';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

type Filter = 'all' | 'subscribed' | 'free' | 'expiring' | 'expired';

function parseFilter(input: string | undefined): Filter {
  switch (input) {
    case 'subscribed':
    case 'free':
    case 'expiring':
    case 'expired':
      return input;
    default:
      return 'all';
  }
}

export default async function AdminUsers({
  searchParams,
}: { searchParams: { filter?: string; q?: string } }) {
  const filter = parseFilter(searchParams.filter);
  const q = (searchParams.q ?? '').trim();
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * DAY_MS);

  // KPIs across the whole platform — never filtered by the page tab so
  // the headline numbers stay stable regardless of which tab is active.
  const [totalUsers, totalCafes, activeSubsAll, expiringSoon, freeCafes, mrrAgg] = await Promise.all([
    prisma.user.count(),
    prisma.cafe.count(),
    prisma.subscription.count({ where: { status: 'active', endsAt: { gte: now } } }),
    prisma.subscription.count({ where: { status: 'active', endsAt: { gte: now, lte: sevenDaysFromNow } } }),
    prisma.cafe.count({ where: { plan: { slug: 'free' } } }),
    prisma.subscription.aggregate({
      where: { status: 'active', endsAt: { gte: now } },
      _sum: { amount: true },
    }),
  ]);

  // Build the cafe query for the table — we list cafes (not raw users)
  // because each cafe maps to one owner + one current subscription, and
  // that's the unit the admin actually wants to act on.
  const cafeWhere: any = {};
  if (q) {
    cafeWhere.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { owner: { is: { OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ] } } },
    ];
  }
  switch (filter) {
    case 'subscribed':
      cafeWhere.subscriptions = { some: { status: 'active', endsAt: { gte: now } } };
      cafeWhere.plan = { slug: { not: 'free' } };
      break;
    case 'free':
      cafeWhere.plan = { slug: 'free' };
      break;
    case 'expiring':
      cafeWhere.subscriptions = { some: { status: 'active', endsAt: { gte: now, lte: sevenDaysFromNow } } };
      break;
    case 'expired':
      cafeWhere.subscriptions = { some: { status: 'expired' } };
      break;
  }

  const cafes = await prisma.cafe.findMany({
    where: cafeWhere,
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      plan: { select: { name: true, slug: true, priceMonthly: true } },
      subscriptions: {
        orderBy: { endsAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Users &amp; subscriptions</h1>
        <p className="text-coffee-600 text-sm">Manage owners, plans, renewals and outreach.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={Users} label="Users"            value={totalUsers.toLocaleString()} />
        <Kpi icon={Coffee} label="Cafes"            value={totalCafes.toLocaleString()} />
        <Kpi icon={Bell}   label="Active subs"      value={activeSubsAll.toLocaleString()} tone="text-emerald-700" />
        <Kpi icon={Clock}  label="Expiring 7d"      value={expiringSoon.toLocaleString()} tone="text-amber-700" />
        <Kpi
          icon={IndianRupee}
          label="MRR (active)"
          value={`₹${(mrrAgg._sum.amount ?? 0).toLocaleString()}`}
          tone="text-coffee-900"
        />
      </div>

      {/* Filter + search bar */}
      <UsersFilterTabs current={filter} q={q} />

      {/* Table */}
      <div className="card-warm !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-coffee-500 border-b border-coffee-100 bg-cream-50">
                <th className="py-2 px-3">Cafe</th>
                <th className="px-3">Owner</th>
                <th className="px-3">Plan</th>
                <th className="px-3">Status</th>
                <th className="px-3">Renews</th>
                <th className="px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cafes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-coffee-500">
                    No cafes match this filter.
                  </td>
                </tr>
              )}
              {cafes.map((c) => {
                const sub = c.subscriptions[0] ?? null;
                const renewsIn = sub?.endsAt ? Math.ceil((sub.endsAt.getTime() - Date.now()) / DAY_MS) : null;
                const expiringSoonRow = renewsIn !== null && renewsIn >= 0 && renewsIn <= 7;
                const expired = renewsIn !== null && renewsIn < 0;
                return (
                  <tr key={c.id} className="border-b border-coffee-50 last:border-0 hover:bg-cream-50/50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-coffee-900">{c.name}</div>
                      <div className="text-[11px] text-coffee-500">/{c.slug}</div>
                    </td>
                    <td className="px-3">
                      <div className="text-coffee-900">{c.owner?.name ?? '—'}</div>
                      <div className="text-[11px] text-coffee-500 truncate max-w-[180px]">{c.owner?.email}</div>
                      {c.owner?.phone && (
                        <div className="text-[11px] text-coffee-500 font-mono">{c.owner.phone}</div>
                      )}
                    </td>
                    <td className="px-3">
                      <span className={`pill ${c.plan?.slug === 'free' ? 'bg-cream-200 text-coffee-700' : 'pill-coffee'}`}>
                        {c.plan?.name ?? '—'}
                      </span>
                      {(c.plan?.priceMonthly ?? 0) > 0 && (
                        <div className="text-[11px] text-coffee-500 mt-0.5">
                          ₹{c.plan?.priceMonthly}/mo
                        </div>
                      )}
                    </td>
                    <td className="px-3">
                      {sub ? (
                        <span className={`pill text-[10px] ${
                          sub.status === 'active' && !expired ? 'pill-wa' :
                          sub.status === 'pending' ? 'pill-amber' :
                          'pill-rose'
                        }`}>
                          {expired ? 'expired' : sub.status}
                        </span>
                      ) : (
                        <span className="pill text-[10px] bg-cream-200 text-coffee-600">no sub</span>
                      )}
                    </td>
                    <td className="px-3 text-xs">
                      {sub?.endsAt ? (
                        <div>
                          <div className={expiringSoonRow ? 'text-amber-700 font-semibold' : expired ? 'text-rose-600 font-semibold' : 'text-coffee-700'}>
                            {formatDate(sub.endsAt, { dateStyle: 'medium' })}
                          </div>
                          <div className="text-[10px] text-coffee-500">
                            {expired ? `${Math.abs(renewsIn ?? 0)}d ago` : `${renewsIn}d left`}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/cafes/${c.id}`}
                          className="text-xs font-semibold text-coffee-700 hover:text-coffee-900"
                        >
                          Open
                        </Link>
                        {sub && sub.status === 'active' && !expired && (
                          <RemindButton subscriptionId={sub.id} cafeName={c.name} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-coffee-500">
        Showing up to 200 cafes. Use the search bar above to narrow down by name / email / phone.
      </p>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'text-coffee-900' }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <div className="card-warm !p-3">
      <Icon className="h-4 w-4 text-caramel-dark" />
      <div className="text-[11px] text-coffee-500 mt-1">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
