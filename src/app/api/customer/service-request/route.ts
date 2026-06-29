/**
 * Customer-side "Call Waiter" / service request. Creates an in-app
 * notification for the cafe owner so staff see it on the dashboard bell.
 * Body: { cafeSlug, tableCode?, kind, orderId? }.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const LABELS: Record<string, string> = {
  call_waiter: 'Call waiter',
  water: 'Asked for water',
  tissue: 'Needs tissue',
  clean_table: 'Requested table cleaning',
  bill: 'Requested the bill',
  cutlery: 'Needs extra cutlery',
};

export async function POST(req: Request) {
  try {
    const { cafeSlug, tableCode, kind, orderId } = await req.json();
    if (!cafeSlug || !kind || !LABELS[kind]) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const cafe = await prisma.cafe.findUnique({ where: { slug: cafeSlug } });
    if (!cafe) return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });

    let tableLabel = '';
    if (tableCode && tableCode !== 'walk-in') {
      const table = await prisma.table.findUnique({ where: { code: tableCode } });
      if (table && table.cafeId === cafe.id) tableLabel = ` · Table ${table.number}`;
    }

    await prisma.notification.create({
      data: {
        userId: cafe.ownerId,
        cafeId: cafe.id,
        kind: 'SYSTEM',
        title: `${LABELS[kind]}${tableLabel}`,
        body: 'A customer needs assistance.',
        link: orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders',
      },
    });

    return NextResponse.json({ ok: true, label: LABELS[kind] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'request failed' }, { status: 400 });
  }
}
