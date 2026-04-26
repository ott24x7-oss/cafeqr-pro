/**
 * Trigger a one-shot platform IMAP scan from the admin UI. Returns the
 * `SubVerifyResult` so the page can show how many subs flipped, plus any
 * scan errors.
 */
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/guards';
import { verifyPlatformSubscriptions } from '@/lib/subscription-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  await requireSuperAdmin();
  const result = await verifyPlatformSubscriptions();
  return NextResponse.json(result);
}
