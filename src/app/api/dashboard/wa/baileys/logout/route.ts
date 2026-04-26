import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { logoutSession } from '@/lib/baileys-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const sessionId: string = body.sessionId || cafe.settings?.baileysSessionId || cafe.id;
  const ok = await logoutSession(sessionId);
  return NextResponse.json({ ok });
}
