import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CafeLobby } from '@/components/customer/cafe-lobby';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const cafe = await prisma.cafe.findUnique({ where: { slug: params.slug } });
    return {
      title: cafe ? `${cafe.name} — order online` : 'Order online',
      description: cafe?.description ?? 'Scan, browse the menu and order from your table.',
    };
  } catch {
    // Never let metadata generation crash the page — fall back to the
    // generic title and let the page itself surface the real error.
    return { title: 'Order online' };
  }
}

export default async function CafeIndexPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { walkin?: string; table?: string };
}) {
  // Wrap the Prisma fetch in a try/catch so the real error reaches Railway
  // logs even though the user sees the generic production error page. We
  // skip Next.js's own control-flow errors (redirect / notFound), which
  // carry a digest like 'NEXT_REDIRECT;...' or 'NEXT_NOT_FOUND' and must
  // be rethrown verbatim so Next.js can act on them.
  let cafe: Awaited<ReturnType<typeof loadCafe>>;
  try {
    cafe = await loadCafe(params.slug);
  } catch (e: any) {
    const digest = typeof e?.digest === 'string' ? e.digest : '';
    if (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND') throw e;
    // eslint-disable-next-line no-console
    console.error(
      `[cafe/${params.slug}] failed to load cafe page:`,
      {
        name: e?.name,
        message: e?.message,
        code: e?.code,
        meta: e?.meta,
        stack: e?.stack?.split('\n').slice(0, 8).join('\n'),
      },
    );
    throw e;
  }

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

  // Defensively normalise the data so a client-component crash on
  // malformed rows can't tank the whole render. Empty arrays are valid;
  // missing strings collapse to ''. Date-like fields go to ISO so
  // serialisation is unambiguous.
  const safeCafe = {
    id: cafe.id,
    slug: cafe.slug,
    name: cafe.name,
    description: cafe.description ?? null,
    logoUrl: cafe.logoUrl ?? null,
    coverUrl: cafe.coverUrl ?? null,
    city: cafe.city ?? null,
    address: cafe.address ?? null,
    phone: cafe.phone ?? null,
    currency: cafe.currency ?? 'INR',
    status: cafe.status,
    settings: cafe.settings ? {
      acceptDineIn: !!cafe.settings.acceptDineIn,
      acceptTakeaway: !!cafe.settings.acceptTakeaway,
      acceptDelivery: !!cafe.settings.acceptDelivery,
      primaryColor: cafe.settings.primaryColor ?? '#6B4E3D',
      accentColor: cafe.settings.accentColor ?? '#D4A574',
    } : null,
    tables: (cafe.tables ?? []).map((t) => ({
      id: t.id,
      number: String(t.number ?? ''),
      name: t.name ?? null,
      code: String(t.code ?? ''),
      area: t.area ?? null,
      capacity: typeof t.capacity === 'number' ? t.capacity : 0,
      isOccupied: !!t.isOccupied,
    })),
    categories: (cafe.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl ?? null,
      items: (c.items ?? []).map((i) => ({
        id: i.id,
        name: i.name ?? '',
        price: typeof i.price === 'number' ? i.price : 0,
        discountedPrice: typeof i.discountedPrice === 'number' ? i.discountedPrice : null,
        imageUrl: i.imageUrl ?? null,
        isPopular: !!i.isPopular,
        inStock: i.inStock !== false,
        diet: i.diet ?? 'VEG',
      })),
    })),
  };

  return <CafeLobby cafe={safeCafe as any} />;
}

function loadCafe(slug: string) {
  return prisma.cafe.findUnique({
    where: { slug },
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
}
