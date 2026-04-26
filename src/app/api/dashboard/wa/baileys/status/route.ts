import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { getSession, publicSession } from '@/lib/baileys-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId') || cafe.settings?.baileysSessionId || cafe.id;
  const sess = getSession(sessionId);
  return NextResponse.json({ sessionId, ...publicSession(sess) });
}
