import { Star } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;
  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where: { cafeId: cafe.id },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.review.aggregate({ where: { cafeId: cafe.id }, _avg: { rating: true }, _count: true }),
  ]);

  const buckets = [5, 4, 3, 2, 1].map((r) => ({
    r,
    n: reviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">Reviews</h1>
        <p className="text-coffee-600 text-sm">{agg._count} reviews · average {(agg._avg.rating ?? 0).toFixed(1)}★</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-warm">
          <div className="text-center">
            <div className="font-display text-5xl font-bold text-coffee-900">{(agg._avg.rating ?? 0).toFixed(1)}</div>
            <div className="flex justify-center gap-0.5 my-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < Math.round(agg._avg.rating ?? 0) ? 'fill-caramel text-caramel' : 'text-coffee-200'}`} />
              ))}
            </div>
            <div className="text-sm text-coffee-600">{agg._count} total reviews</div>
          </div>
          <div className="mt-5 space-y-1.5">
            {buckets.map((b) => (
              <div key={b.r} className="flex items-center gap-2 text-xs">
                <span className="w-4 font-semibold">{b.r}★</span>
                <div className="flex-1 h-2 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className="h-full bg-caramel"
                    style={{ width: `${agg._count ? (b.n / agg._count) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-coffee-600">{b.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {reviews.length === 0 && (
            <div className="card-warm text-center text-coffee-500 py-10">
              <Star className="mx-auto h-10 w-10 mb-2 text-coffee-300" />
              No reviews yet. Send the review link to customers after orders complete.
            </div>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="card-warm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-caramel text-caramel' : 'text-coffee-200'}`} />
                    ))}
                  </div>
                  <div className="font-semibold text-coffee-900 mt-1">{r.customerName ?? 'Guest'}</div>
                  <div className="text-xs text-coffee-500">{formatDate(r.createdAt)} · #{r.order?.orderNumber ?? '—'}</div>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm text-coffee-700">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
