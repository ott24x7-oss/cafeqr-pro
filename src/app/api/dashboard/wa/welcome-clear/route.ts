/**
 * Owner-auth'd cooldown reset for the welcome auto-reply ledger.
 *
 * Usage:
 *   GET  /api/dashboard/wa/welcome-clear              -> clears every
 *                                                       cooldown row for
 *                                                       this cafe (use
 *                                                       sparingly — wipes
 *                                                       all customers'
 *                                                       7-day windows)
 *   GET  /api/dashboard/wa/welcome-clear?phone=10420328878157
 *                                                    -> clears just that
 *                                                       phone (or lid id)
 *
 * Returns the number of rows deleted so the owner can verify the action
 * landed. Mostly meant as a testing helper while iterating on the bot;
 * not intended for end-customer-facing flows.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { normalizePhone } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'no cafe for this user' }, { status: 401 });

  const url = new URL(req.url);
  const phoneParam = url.searchParams.get('phone');

  if (phoneParam) {
    const normalized = normalizePhone(phoneParam) || phoneParam.replace(/\D/g, '');
    if (!normalized) {
      return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
    }
    const result = await prisma.welcomeReplyLog.deleteMany({
      where: { cafeId: cafe.id, phone: normalized },
    });
    return NextResponse.json({
      ok: true,
      action: 'cleared-one',
      cafeId: cafe.id,
      phone: normalized,
      deleted: result.count,
    });
  }

  const result = await prisma.welcomeReplyLog.deleteMany({
    where: { cafeId: cafe.id },
  });
  return NextResponse.json({
    ok: true,
    action: 'cleared-all',
    cafeId: cafe.id,
    deleted: result.count,
  });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
