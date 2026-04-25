import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CafeIndexPage({ params }: { params: { slug: string } }) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug: params.slug },
    include: { tables: { take: 1, orderBy: { number: 'asc' } } },
  });
  if (!cafe) notFound();
  // If cafe has at least 1 table, redirect to first table for default browse
  if (cafe.tables.length) redirect(`/cafe/${params.slug}/table/${cafe.tables[0].code}`);
  redirect(`/cafe/${params.slug}/table/walk-in`);
}
