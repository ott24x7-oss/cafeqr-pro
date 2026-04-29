import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Award, Receipt, ArrowLeft, ArrowRight, Utensils, LogOut, Sparkles, Coffee } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { CustomerOrderActions } from '@/components/customer/account-actions';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage({ params }: { params: { slug: string } }) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, name: true, slug: true, currency: true, logoUrl: true,
      settings: { select: { loyaltyEnabled: true, loyaltyPercent: true } },
    },
  });
  if (!cafe) notFound();

  const session = getCustomerSession();
  if (!session) {
    redirect(`/cafe/${params.slug}/account/login?next=${encodeURIComponent(`/cafe/${params.slug}/account`)}`);
  }

  const tail = session.phone.slice(-10);

  const [orders, loyalty, totalsAgg] = await Promise.all([
    prisma.order.findMany({
      where: { cafeId: cafe.id, customerPhone: { contains: tail } },
      include: { items: { select: { id: true, name: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.loyaltyAccount.findUnique({
      where: { cafeId_phone: { cafeId: cafe.id, phone: session.phone } },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 8 },
      },
    }),
    prisma.order.aggregate({
      where: {
        cafeId: cafe.id,
        customerPhone: { contains: tail },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const points = loyalty?.points ?? 0;
  const lifetimeEarned = loyalty?.lifetimeEarned ?? 0;
  const loyaltyOn = cafe.settings?.loyaltyEnabled ?? true;
  const earnRate = cafe.settings?.loyaltyPercent ?? 0;
  const totalOrders = totalsAgg._count ?? 0;
  const totalSpent = totalsAgg._sum.totalAmount ?? 0;
  const displayName = loyalty?.name?.trim() || orders.find((o) => o.customerName)?.customerName || 'You';
  const initial = (displayName?.[0] ?? session.phone.slice(-2)).toUpperCase();

  const activeOrders = orders.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));
  const pastOrders = orders.filter((o) => !['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Compact header — back-to-cafe + greeting + sign out */}
      <div className="bg-coffee-gradient text-cream-50 px-4 pt-4 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="container max-w-3xl relative">
          <Link
            href={`/cafe/${params.slug}`}
            className="text-cream-200/90 inline-flex items-center gap-1 text-sm hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {cafe.name}
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur font-display text-xl font-bold">
              {initial}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl md:text-2xl font-bold leading-tight truncate">
                Hi, {displayName.split(' ')[0]}
              </div>
              <div className="text-cream-200/80 text-xs font-mono">{session.phone}</div>
            </div>
            <a
              href={`/cafe/${params.slug}/account/logout`}
              className="text-xs text-cream-200/85 hover:text-white shrink-0 inline-flex items-center gap-1"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </a>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl -mt-4 space-y-4">
        {/* Big loyalty card */}
        {loyaltyOn ? (
          <div className="rounded-2xl bg-gradient-to-br from-coffee-700 via-coffee-600 to-caramel-dark text-cream-50 p-5 shadow-coffee relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur shrink-0">
                <Award className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider opacity-80">Loyalty balance</div>
                <div className="font-display text-4xl font-bold leading-none mt-0.5">
                  {points.toLocaleString()}
                  <span className="text-base font-semibold opacity-80 ml-1">pts</span>
                </div>
                <div className="text-xs opacity-85 mt-1">
                  1 pt = 1 {cafe.currency || 'INR'} ·
                  {lifetimeEarned > 0
                    ? ` Earned ${lifetimeEarned.toLocaleString()} all-time`
                    : ` Earn ${earnRate}% back on every paid order`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-coffee-300 bg-cream-100 p-4 text-sm text-coffee-700 flex items-center gap-3">
            <Award className="h-5 w-5 text-coffee-500 shrink-0" />
            <span>This cafe hasn't enabled loyalty points yet.</span>
          </div>
        )}

        {/* Quick stats — orders + spend */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-warm !p-3">
            <div className="text-[11px] text-coffee-500">Orders here</div>
            <div className="font-display text-2xl font-bold text-coffee-900">{totalOrders}</div>
          </div>
          <div className="card-warm !p-3">
            <div className="text-[11px] text-coffee-500">Total spent</div>
            <div className="font-display text-2xl font-bold text-coffee-900">{formatCurrency(totalSpent, cafe.currency)}</div>
          </div>
        </div>

        {/* Continue ordering CTA — keep them in the food flow */}
        <Link
          href={`/cafe/${params.slug}`}
          className="block rounded-2xl bg-coffee-gradient text-cream-50 p-4 shadow-coffee text-center hover:-translate-y-0.5 transition"
        >
          <div className="inline-flex items-center gap-2 font-semibold">
            <Utensils className="h-4 w-4" /> Browse menu &amp; order
          </div>
        </Link>

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold text-coffee-900 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-caramel-dark" /> In progress
            </h2>
            <div className="space-y-2">
              {activeOrders.map((o) => (
                <div key={o.id} className="card-warm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-bold text-coffee-900">#{o.orderNumber}</div>
                      <div className="text-xs text-coffee-500 truncate">
                        {o.items.slice(0, 2).map((i) => i.name).join(', ')}
                        {o.items.length > 2 && ` +${o.items.length - 2} more`}
                      </div>
                      <div className="text-[10px] text-coffee-400 mt-0.5">
                        {formatDate(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <span className="pill bg-coffee-700 text-cream-50 text-[10px] shrink-0">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-coffee-100 flex items-center justify-between gap-2">
                    <div className="font-bold text-coffee-900">{formatCurrency(o.totalAmount, cafe.currency)}</div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/order/${o.id}`}
                        className="text-xs font-semibold text-coffee-700 hover:text-coffee-900 inline-flex items-center gap-1"
                      >
                        Track <ArrowRight className="h-3 w-3" />
                      </Link>
                      <CustomerOrderActions
                        orderId={o.id}
                        cancellable={o.status === 'NEW' || o.status === 'ACCEPTED'}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent loyalty activity (only when there's something to show) */}
        {loyaltyOn && (loyalty?.transactions?.length ?? 0) > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold text-coffee-900 mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-caramel-dark" /> Points activity
            </h2>
            <div className="card-warm divide-y divide-coffee-100 !p-0">
              {loyalty!.transactions.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="text-coffee-900 truncate">
                      {t.note ?? (t.type === 'EARN' ? 'Order reward' : t.type === 'REDEEM' ? 'Redeemed' : 'Adjustment')}
                    </div>
                    <div className="text-[10px] text-coffee-500">{formatDate(t.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </div>
                  <div className={`font-bold shrink-0 ${t.type === 'REDEEM' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {t.type === 'REDEEM' ? '-' : '+'}{t.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order history */}
        <div>
          <h2 className="font-display text-lg font-bold text-coffee-900 mb-2 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Past orders
          </h2>
          {pastOrders.length === 0 && activeOrders.length === 0 ? (
            <div className="card-warm text-center text-coffee-500 py-8">
              <Coffee className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No orders yet — tap "Browse menu" above to place your first order.
            </div>
          ) : pastOrders.length === 0 ? (
            <div className="card-warm text-center text-coffee-500 py-6 text-sm">
              No past orders yet — your in-progress orders are above.
            </div>
          ) : (
            <div className="space-y-2">
              {pastOrders.map((o) => (
                <Link key={o.id} href={`/order/${o.id}`} className="card-warm block hover:-translate-y-0.5 transition">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-coffee-900 truncate">{o.items.slice(0, 2).map((i) => i.name).join(', ') || `#${o.orderNumber}`}</div>
                      <div className="text-xs text-coffee-500">
                        #{o.orderNumber} · {formatDate(o.createdAt, { dateStyle: 'medium' })}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-bold text-coffee-900">{formatCurrency(o.totalAmount, cafe.currency)}</div>
                      <span className="pill-coffee text-[10px]">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
