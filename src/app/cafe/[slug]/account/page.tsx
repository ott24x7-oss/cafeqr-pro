import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Award, Receipt, ArrowLeft, Star, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';
import { formatCurrency, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils';
import { CustomerOrderActions } from '@/components/customer/account-actions';

export const dynamic = 'force-dynamic';

export default async function CustomerAccountPage({ params }: { params: { slug: string } }) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, currency: true, logoUrl: true, settings: { select: { loyaltyEnabled: true, loyaltyPercent: true } } },
  });
  if (!cafe) notFound();

  const session = getCustomerSession();
  if (!session) {
    redirect(`/cafe/${params.slug}/account/login?next=${encodeURIComponent(`/cafe/${params.slug}/account`)}`);
  }

  const tail = session.phone.slice(-10);

  const [orders, loyalty] = await Promise.all([
    prisma.order.findMany({
      where: { cafeId: cafe.id, customerPhone: { contains: tail } },
      include: { items: { select: { id: true, name: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.loyaltyAccount.findUnique({
      where: { cafeId_phone: { cafeId: cafe.id, phone: session.phone } },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    }),
  ]);

  const points = loyalty?.points ?? 0;
  const lifetimeEarned = loyalty?.lifetimeEarned ?? 0;
  const loyaltyOn = cafe.settings?.loyaltyEnabled ?? false;

  const activeOrders = orders.filter((o) => ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));
  const pastOrders = orders.filter((o) => !['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));

  return (
    <div className="min-h-screen bg-cream-50 pb-20">
      {/* Header */}
      <div className="bg-coffee-gradient text-cream-50 px-4 pt-5 pb-8">
        <div className="container max-w-3xl">
          <Link href={`/cafe/${params.slug}`} className="text-cream-200/90 inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="h-4 w-4" /> {cafe.name}
          </Link>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">My account</h1>
              <p className="text-cream-200/80 text-sm font-mono">{session.phone}</p>
            </div>
            <a
              href={`/cafe/${params.slug}/account/logout`}
              className="text-xs underline text-cream-200/85 hover:text-white shrink-0"
            >
              Sign out
            </a>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl -mt-6 space-y-4">
        {/* Loyalty points card */}
        {loyaltyOn && (
          <div className="card-warm bg-gradient-to-br from-cream-100 to-cream-200 border-caramel/40">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-coffee-gradient text-cream-50 shadow-coffee">
                <Award className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-coffee-600">Loyalty points</div>
                <div className="font-display text-3xl font-bold text-coffee-900 leading-none">
                  {points.toLocaleString()}
                </div>
                <div className="text-[11px] text-coffee-500 mt-0.5">
                  {lifetimeEarned > 0
                    ? `${lifetimeEarned.toLocaleString()} earned all-time · 1 pt = 1 ${cafe.currency || 'INR'}`
                    : `Earn ${cafe.settings?.loyaltyPercent ?? 0}% back on online orders.`}
                </div>
              </div>
            </div>

            {(loyalty?.transactions?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-coffee-100 pt-3">
                <div className="text-xs font-semibold text-coffee-700 mb-1.5">Recent activity</div>
                <ul className="space-y-1 text-sm">
                  {loyalty!.transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-coffee-700">
                      <span className="truncate">
                        <span className={`pill text-[10px] ${t.type === 'EARN' ? 'bg-emerald-100 text-emerald-800' : t.type === 'REDEEM' ? 'bg-rose-100 text-rose-700' : 'bg-cream-200 text-coffee-700'}`}>
                          {t.type}
                        </span>{' '}
                        {t.note ?? ''}
                      </span>
                      <span className={`font-bold shrink-0 ${t.type === 'REDEEM' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {t.type === 'REDEEM' ? '-' : '+'}{t.points}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Active orders — track + cancel */}
        {activeOrders.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold text-coffee-900 mb-2">In progress</h2>
            <div className="space-y-2">
              {activeOrders.map((o) => (
                <div key={o.id} className="card-warm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-coffee-900">#{o.orderNumber}</div>
                      <div className="text-xs text-coffee-500">
                        {o.items.length} items · {formatDate(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    <span className="pill bg-coffee-700 text-cream-50">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="font-bold text-coffee-900">{formatCurrency(o.totalAmount, cafe.currency)}</div>
                    <div className="flex items-center gap-2">
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

        {/* Order history */}
        <div>
          <h2 className="font-display text-lg font-bold text-coffee-900 mb-2 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> History
          </h2>
          {pastOrders.length === 0 && activeOrders.length === 0 ? (
            <div className="card-warm text-center text-coffee-500 py-8">
              No orders yet. Browse the menu and place your first order.
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
                    <div className="font-semibold text-coffee-900">#{o.orderNumber}</div>
                    <span className="pill-coffee text-[10px]">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                  </div>
                  <div className="text-xs text-coffee-500 mt-1">
                    {o.items.length} items · {formatDate(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="font-bold text-coffee-900 mt-1">{formatCurrency(o.totalAmount, cafe.currency)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

