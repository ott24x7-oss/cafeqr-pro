import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { PostersManager } from '@/components/dashboard/posters-manager';

export const dynamic = 'force-dynamic';

export default async function PostersPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const [posters, categories, items] = await Promise.all([
    prisma.poster.findMany({
      where: { cafeId: cafe.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.category.findMany({
      where: { cafeId: cafe.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.menuItem.findMany({
      where: { cafeId: cafe.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return <PostersManager posters={posters} categories={categories} items={items} />;
}
