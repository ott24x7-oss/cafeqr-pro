import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CafeLobby } from '@/components/customer/cafe-lobby';

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
      <div className="min-h-screen grid place-items-center bg-cream-50 p-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-coffee-900">{cafe.name}</h1>
          <p className="mt-2 text-coffee-600">This cafe is currently not accepting orders. Please ask staff for help.</p>
        </div>
      </div>
    );
  }

  return <CafeLobby cafe={cafe as any} />;
}
