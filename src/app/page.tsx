import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

// Single-cafe build: the root just sends visitors straight to the cafe's
// menu/lobby. (The old multi-tenant marketing landing has been removed.)
export const dynamic = 'force-dynamic';

export default async function Home() {
  const cafe = await prisma.cafe
    .findFirst({ orderBy: { createdAt: 'asc' }, select: { slug: true } })
    .catch(() => null);

  if (cafe) redirect(`/cafe/${cafe.slug}`);

  return (
    <div className="min-h-screen grid place-items-center bg-forest-900 text-cream-50 p-6 text-center bg-forest-glow bg-fixed">
      <div>
        <h1 className="font-display text-3xl font-bold text-gradient-gold">Cafe QR</h1>
        <p className="mt-2 text-forest-300">No cafe has been set up yet.</p>
      </div>
    </div>
  );
}
