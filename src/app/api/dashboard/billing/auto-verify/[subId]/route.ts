/**
 * Subscription pay-page polling endpoint. Cafe owner waits on the pay page,
 * we poll this every ~5s; in-process per-platform debounce so concurrent
 * polls (multiple owners paying at once) don't hammer the SaaS owner's
 * Gmail. Each scan invokes `verifyPlatformSubscriptions` which matches the
 * payable amount against any pending subscription on the platform.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { verifyPlatformSubscriptions } from '@/lib/subscription-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_GAP_MS = 4_000;
const G = globalThis as any;
G.__cafeqr_last_platform_scan ??= 0;

export async function POST(_req: Request, { params }: { params: { subId: string } }) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { id: params.subId },
    include: { plan: true },
  });
  if (!sub || sub.cafeId !== cafe.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (sub.status === 'active') {
    return NextResponse.json({ paid: true, status: 'active', transactionId: sub.transactionId });
  }
  if (sub.status !== 'pending') {
    return NextResponse.json({ paid: false, status: sub.status });
  }

  // Platform-wide debounce — single scan covers every concurrent pending sub.
  let scanned = false;
  let scanSummary: any = null;
  if (Date.now() - (G.__cafeqr_last_platform_scan as number) >= MIN_GAP_MS) {
    G.__cafeqr_last_platform_scan = Date.now();
    try {
      scanSummary = await verifyPlatformSubscriptions();
      scanned = true;
    } catch (e: any) {
      scanSummary = { error: e?.message ?? String(e) };
    }
  }

  // Re-read this row to see if the scan flipped it.
  const fresh = await prisma.subscription.findUnique({ where: { id: sub.id } });
  return NextResponse.json({
    paid: fresh?.status === 'active',
    status: fresh?.status ?? sub.status,
    transactionId: fresh?.transactionId ?? null,
    paidAt: fresh?.paidAt ?? null,
    scanned,
    scanSummary,
  });
}
