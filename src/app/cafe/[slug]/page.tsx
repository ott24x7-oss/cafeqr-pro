import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CafeLobby } from '@/components/customer/cafe-lobby';
import { getCustomerProfile } from '@/lib/customer-profile';
import { getLiveOccupiedSet } from '@/lib/table-occupancy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const cafe = await prisma.cafe.findUnique({ where: { slug: params.slug } });
  return {
    title: cafe ? `${cafe.name} — order online` : 'Order online',
    description: cafe?.description ?? 'Scan, browse the menu and order from your table.',
  };
}

export default async function CafeIndexPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { walkin?: string; table?: string };
}) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: params.slug },
    include: {
      settings: true,
      tables: {
        orderBy: { number: 'asc' },
        select: { id: true, number: true, name: true, code: true, area: true, capacity: true, isOccupied: true },
      },
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: [{ isPopular: 'desc' }, { sortOrder: 'asc' }],
            select: {
              id: true, name: true, price: true, discountedPrice: true, imageUrl: true,
              isPopular: true, inStock: true, diet: true,
            },
          },
        },
      },
    },
  });
  if (!cafe) notFound();

  // Quick links from old QR codes / pre-share URLs.
  if (searchParams.table) {
    const t = cafe.tables.find((x) => x.code === searchParams.table || x.number === searchParams.table);
    if (t) redirect(`/cafe/${params.slug}/table/${t.code}`);
  }
  if (searchParams.walkin === '1') redirect(`/cafe/${params.slug}/table/walk-in`);

  if (cafe.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen grid place-items-center bg-forest-900 text-cream-50 p-6 text-center bg-forest-glow bg-fixed">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-gold">{cafe.name}</h1>
          <p className="mt-2 text-forest-300">This cafe is currently not accepting orders. Please ask staff for help.</p>
        </div>
      </div>
    );
  }

  // Override stored isOccupied with a live recompute so table availability
  // tracks open-order count, not a stale cached flag.
  const occupied = await getLiveOccupiedSet(cafe.id);
  cafe.tables = cafe.tables.map((t) => ({ ...t, isOccupied: occupied.has(t.id) }));

  const customer = await getCustomerProfile(cafe.id, cafe.settings?.loyaltyEnabled ?? true);
  return <CafeLobby cafe={cafe as any} customer={customer} />;
}
