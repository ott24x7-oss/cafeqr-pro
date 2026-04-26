/**
 * Public-but-debounced auto-verify endpoint, called by the customer's pay
 * page while they're waiting for their UPI payment to clear.
 *
 * The pay page polls this every ~10s. We rate-limit per-cafe IMAP scans to
 * once every 12s in-process so a hundred concurrent customers can't hammer
 * the inbox; in between, we just report the order's current paymentStatus
 * straight from the DB.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyFromGmail } from '@/lib/payment-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_GAP_MS = 12_000;
// Keep the rate-limiter on globalThis so it survives Next.js dev module
// reloading and is shared across all routes in a single Node process.
const lastScanAt: Map<string, number> =
  (globalThis as any).__cafeqr_last_imap_scan ??= new Map();

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { cafe: { include: { settings: true } }, payment: true },
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({
      paid: true,
      transactionId: order.payment?.transactionId ?? null,
      paidAt: order.payment?.paidAt ?? null,
      scanned: false,
      reason: 'already-paid',
    });
  }

  const cafeId = order.cafeId;
  const settings = order.cafe?.settings;
  const canScan = !!(settings?.gmailUser && settings?.gmailAppPassword);

  let scanned = false;
  let scanSummary: any = null;
  if (canScan) {
    const last = lastScanAt.get(cafeId) ?? 0;
    if (Date.now() - last >= MIN_GAP_MS) {
      lastScanAt.set(cafeId, Date.now());
      try {
        scanSummary = await verifyFromGmail(cafeId);
        scanned = true;
      } catch (e: any) {
        scanSummary = { error: e?.message ?? String(e) };
      }
    }
  }

  // Re-read the order to see if the scan flipped this one to PAID.
  const fresh = await prisma.order.findUnique({
    where: { id: order.id },
    include: { payment: true },
  });
  return NextResponse.json({
    paid: fresh?.paymentStatus === 'PAID',
    paymentStatus: fresh?.paymentStatus ?? order.paymentStatus,
    transactionId: fresh?.payment?.transactionId ?? null,
    paidAt: fresh?.payment?.paidAt ?? null,
    canScan,
    scanned,
    scanSummary,
  });
}
