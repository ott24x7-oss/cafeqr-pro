import Link from 'next/link';
import { Award, Star, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LoyaltyDashboard() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const enabled = cafe.settings?.loyaltyEnabled ?? false;
  const percent = cafe.settings?.loyaltyPercent ?? 0;

  const [accounts, recentTxns, totals] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { cafeId: cafe.id },
      orderBy: { points: 'desc' },
      take: 50,
    }),
    prisma.loyaltyTransaction.findMany({
      where: { account: { cafeId: cafe.id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { account: { select: { phone: true, name: true } } },
    }),
    prisma.loyaltyAccount.aggregate({
      where: { cafeId: cafe.id },
      _sum: { points: true, lifetimeEarned: true, lifetimeRedeemed: true },
      _count: true,
    }),
  ]);

  const totalCustomers = totals._count ?? 0;
  const outstanding = totals._sum.points ?? 0;
  const lifetimeEarned = totals._sum.lifetimeEarned ?? 0;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-caramel-dark" /> Loyalty
          </h1>
          <p className="text-coffee-600 text-sm">
            {enabled ? (
              <>
                Earn rate: {percent}% of subtotal · 1 point = 1 {cafe.currency || 'INR'}
                <span className="text-coffee-500"> · हर paid order पर ग्राहक को {percent}% points मिलते हैं</span>
              </>
            ) : (
              <>
                Loyalty is disabled. Turn it on under Settings → Loyalty to start crediting points.
                <span className="text-coffee-500"> · Settings → Loyalty में जाकर on करें।</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-coffee-700 hover:text-coffee-900 inline-flex items-center gap-1"
        >
          Configure <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Customers" value={totalCustomers.toString()} tone="text-coffee-900" />
        <Stat label="Outstanding points" value={outstanding.toLocaleString()} tone="text-emerald-700" />
        <Stat label="Lifetime earned" value={lifetimeEarned.toLocaleString()} tone="text-caramel-dark" />
      </div>

      {/* Accounts list */}
      <div className="card-warm p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-coffee-100">
          <div className="font-bold text-coffee-900">Top accounts</div>
          <span className="text-xs text-coffee-500">{accounts.length} of {totalCustomers}</span>
        </div>
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-coffee-500 text-sm">
            No customers have earned points yet. Once an order's payment is confirmed, points are
            credited automatically.
          </div>
        ) : (
          <div className="divide-y divide-coffee-100">
            {accounts.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-coffee-900 truncate">{a.name || 'Customer'}</div>
                  <div className="text-xs text-coffee-500 font-mono">{a.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-emerald-700 inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-caramel text-caramel" />
                    {a.points.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-coffee-500">
                    earned {a.lifetimeEarned.toLocaleString()} · redeemed {a.lifetimeRedeemed.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="card-warm p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-coffee-100 font-bold text-coffee-900">Recent activity</div>
        {recentTxns.length === 0 ? (
          <div className="p-8 text-center text-coffee-500 text-sm">No activity yet.</div>
        ) : (
          <div className="divide-y divide-coffee-100">
            {recentTxns.map((t) => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-coffee-900 truncate">
                    <span className={`pill text-[10px] ${t.type === 'EARN' ? 'bg-emerald-100 text-emerald-800' : t.type === 'REDEEM' ? 'bg-rose-100 text-rose-700' : 'bg-cream-200 text-coffee-700'}`}>
                      {t.type}
                    </span>{' '}
                    <span className="font-semibold">{t.account.name || t.account.phone}</span>
                    {t.note && <span className="text-coffee-500"> · {t.note}</span>}
                  </div>
                  <div className="text-[10px] text-coffee-500">{formatDate(t.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <div className={`font-bold shrink-0 ${t.type === 'REDEEM' ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {t.type === 'REDEEM' ? '-' : '+'}{t.points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="card-warm !p-3">
      <div className="text-[11px] text-coffee-500">{label}</div>
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
