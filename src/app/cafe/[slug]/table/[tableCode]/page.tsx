import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CustomerMenu } from '@/components/customer/customer-menu';
import { getCustomerProfile } from '@/lib/customer-profile';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const cafe = await prisma.cafe.findUnique({ where: { slug: params.slug } });
  return { title: `${cafe?.name ?? 'Order'} — Menu` };
}

export default async function CustomerMenuPage({ params }: { params: { slug: string; tableCode: string } }) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: params.slug },
    include: {
      settings: true,
      posters: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { variants: true, addons: true },
          },
        },
      },
    },
  });

  if (!cafe) notFound();
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

  let table = null;
  if (params.tableCode !== 'walk-in') {
    table = await prisma.table.findUnique({ where: { code: params.tableCode } });
    if (!table || table.cafeId !== cafe.id) notFound();
  }

  const customer = await getCustomerProfile(cafe.id, cafe.settings?.loyaltyEnabled ?? true);
  return <CustomerMenu cafe={cafe as any} table={table} customer={customer} />;
}
