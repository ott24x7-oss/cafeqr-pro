import { NextResponse } from 'next/server';
import { getOwnerCafe } from '@/lib/guards';
import { startSession, publicSession } from '@/lib/baileys-manager';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const sessionId: string = body.sessionId || cafe.settings?.baileysSessionId || cafe.id;

  // Persist the chosen sessionId so subsequent sends find the same socket.
  if (sessionId !== cafe.settings?.baileysSessionId) {
    await prisma.cafeSettings.upsert({
      where: { cafeId: cafe.id },
      create: { cafeId: cafe.id, baileysSessionId: sessionId },
      update: { baileysSessionId: sessionId },
    });
  }

  const sess = await startSession(sessionId);
  return NextResponse.json({ sessionId, ...publicSession(sess) });
}
