import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { verifyFromGmail } from '@/lib/payment-verify';

// IMAP fetch is heavy; allow up to ~50s on Railway.
export const maxDuration = 60;

export async function POST() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await verifyFromGmail(cafe.id);
  return NextResponse.json(result);
}
