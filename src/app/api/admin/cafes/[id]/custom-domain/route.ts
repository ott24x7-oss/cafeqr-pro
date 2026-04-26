/**
 * Admin approves / rejects a cafe's custom-domain request.
 *
 *   POST { action: 'approve' }              → status='verified', stamps verifiedAt
 *   POST { action: 'reject', note?: '…' }   → status='failed', keeps the host so the cafe owner can fix DNS
 *   POST { action: 'clear' }                → wipes the request entirely
 *
 * Approving here is the SECOND step. The admin must already have:
 *   1. Verified the CNAME points at cafe.watshop.in (dig / nslookup), and
 *   2. Added the hostname under Railway → Custom Domains so Let's Encrypt
 *      can issue a cert. (Until that's done, traffic to the host won't even
 *      reach our middleware.)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action?: string; note?: string } = {};
  try { body = await req.json(); } catch {}
  const action = body.action;

  const cafe = await prisma.cafe.findUnique({ where: { id: params.id } });
  if (!cafe) return NextResponse.json({ error: 'cafe not found' }, { status: 404 });

  if (action === 'approve') {
    if (!cafe.customDomain) return NextResponse.json({ error: 'no domain on file' }, { status: 400 });
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: {
        customDomainStatus: 'verified',
        customDomainNote: null,
        customDomainVerifiedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, status: 'verified' });
  }

  if (action === 'reject') {
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: {
        customDomainStatus: 'failed',
        customDomainNote: body.note ?? 'Rejected by admin',
        customDomainVerifiedAt: null,
      },
    });
    return NextResponse.json({ ok: true, status: 'failed' });
  }

  if (action === 'clear') {
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainNote: null,
        customDomainRequestedAt: null,
        customDomainVerifiedAt: null,
      },
    });
    return NextResponse.json({ ok: true, cleared: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
