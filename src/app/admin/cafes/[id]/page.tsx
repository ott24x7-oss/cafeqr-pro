import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminCafeDetail({ params }: { params: { id: string } }) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      plan: true,
      settings: true,
      _count: { select: { tables: true, menuItems: true, orders: true, staff: true, reviews: true } },
    },
  });
  if (!cafe) notFound();

  const revenue = await prisma.order.aggregate({
    where: { cafeId: cafe.id, status: 'COMPLETED' },
    _sum: { totalAmount: true },
  });

  return (
    <div className="space-y-4">
      <Link href="/admin/cafes" className="text-sm text-coffee-600 hover:text-coffee-900">← Back to cafes</Link>

      <div className="card-warm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-coffee-900">{cafe.name}</h1>
            <div className="text-coffee-600 text-sm">/{cafe.slug} · Created {formatDate(cafe.createdAt, { dateStyle: 'medium', timeStyle: undefined })}</div>
          </div>
          <div className="flex gap-2">
            <a href={`/cafe/${cafe.slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline"><ExternalLink className="h-4 w-4" /> Open public site</Button>
            </a>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Stat l="Status" v={cafe.status} />
          <Stat l="Plan" v={cafe.plan?.name ?? '—'} />
          <Stat l="Revenue" v={formatCurrency(revenue._sum.totalAmount ?? 0)} />
          <Stat l="Tables" v={cafe._count.tables} />
          <Stat l="Items" v={cafe._count.menuItems} />
          <Stat l="Staff" v={cafe._count.staff} />
          <Stat l="Orders" v={cafe._count.orders} />
          <Stat l="Reviews" v={cafe._count.reviews} />
        </div>
      </div>

      <div className="card-warm">
        <h2 className="font-bold text-coffee-900 mb-2">Owner</h2>
        <div className="text-sm">
          <div><b>{cafe.owner.name}</b> · {cafe.owner.email}</div>
          <div className="text-coffee-600">{cafe.owner.phone ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ l, v }: any) {
  return (
    <div className="rounded-xl bg-cream-100 p-3">
      <div className="text-xs text-coffee-500">{l}</div>
      <div className="font-bold text-coffee-900">{String(v)}</div>
    </div>
  );
}
