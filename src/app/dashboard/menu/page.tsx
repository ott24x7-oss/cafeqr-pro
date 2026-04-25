import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { MenuManager } from '@/components/dashboard/menu-manager';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return null;

  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      where: { cafeId: cafe.id },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.menuItem.findMany({
      where: { cafeId: cafe.id },
      include: { variants: true, addons: true, category: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return <MenuManager categories={categories} items={items as any} />;
}
