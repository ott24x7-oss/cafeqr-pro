// Lightweight polling endpoint for the Android companion app's full-screen
// new-order alert. Called every ~12s while the owner is signed in. Returns
// only the orders created strictly *after* the timestamp the device sends
// (and capped at 5 rows so a busy lunch rush can't flood the response).
//
// Auth: same NextAuth cookie the WebView already carries — the Android
// poller pulls it out of CookieManager and forwards it as the Cookie
// header on its OkHttp call.
//
// Responses:
//   { enabled: false, serverTime: <ms> }      ← owner has the toggle off
//   { enabled: true,  serverTime: <ms>, orders: [...] }
//
// `serverTime` lets the device avoid clock-drift issues by always
// echoing the value the server sent on the previous poll back as `t`.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 5;
// Don't surface anything older than this even if the device sends an old
// `t`. Prevents a misbehaving client from triggering an alert for an order
// that's been sitting unattended for hours.
const MAX_LOOKBACK_MS = 10 * 60 * 1000;

export async function GET(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const tParam = Number(url.searchParams.get('t') ?? 0);
  const now = Date.now();
  // Floor t to keep things bounded.
  const sinceMs = tParam > 0 && tParam < now
    ? Math.max(tParam, now - MAX_LOOKBACK_MS)
    : now - 30_000; // fresh poller / first call → look back 30s only.

  const settings = cafe.settings;
  // Honor the toggle. We still echo serverTime so the device can keep
  // moving its watermark forward and not double-trigger when the user
  // flips the toggle on.
  if (!settings?.notifyOwnerInApp) {
    return NextResponse.json(
      { enabled: false, serverTime: now },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  const orders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      // Only NEW orders deserve the loud alert — once the owner has
      // accepted, downstream status changes shouldn't keep ringing.
      status: 'NEW',
      createdAt: { gt: new Date(sinceMs) },
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_ROWS,
    select: {
      id: true,
      orderNumber: true,
      type: true,
      tableId: true,
      customerName: true,
      customerPhone: true,
      totalAmount: true,
      createdAt: true,
      table: { select: { number: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(
    {
      enabled: true,
      serverTime: now,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        customerName: o.customerName ?? '',
        customerPhone: o.customerPhone ?? '',
        totalAmount: o.totalAmount,
        itemCount: o._count.items,
        tableLabel: o.table
          ? (o.table.name || `Table ${o.table.number}`)
          : (o.type === 'TAKEAWAY' ? 'Takeaway' : o.type === 'DELIVERY' ? 'Delivery' : 'Walk-in'),
        createdAt: o.createdAt.toISOString(),
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
