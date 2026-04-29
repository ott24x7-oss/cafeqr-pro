/**
 * One-shot rescue endpoint for the welcome auto-reply.
 *
 * The settings page has a toggle but a user reported it not persisting.
 * This route bypasses the form entirely: visiting it (or POSTing) while
 * logged in as the cafe owner sets welcomeAutoReply=true and seeds
 * default triggers if they're empty. Returns the resulting DB state so
 * the owner can verify it actually landed.
 *
 * Usage:
 *   GET  /api/dashboard/wa/welcome-enable     -> force on
 *   POST /api/dashboard/wa/welcome-enable     -> same
 *   GET  /api/dashboard/wa/welcome-enable?off=1 -> force off
 *   GET  /api/dashboard/wa/welcome-enable?status=1 -> read-only inspection
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function applyAndReport(turnOn: boolean) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'no cafe for this user' }, { status: 401 });

  const existing = await prisma.cafeSettings.findUnique({ where: { cafeId: cafe.id } });
  const triggers = (existing?.welcomeTriggers && existing.welcomeTriggers.length > 0)
    ? existing.welcomeTriggers
    : ['hi', 'hello', 'start', 'menu'];

  const updated = existing
    ? await prisma.cafeSettings.update({
        where: { cafeId: cafe.id },
        data: { welcomeAutoReply: turnOn, welcomeTriggers: triggers },
      })
    : await prisma.cafeSettings.create({
        data: { cafeId: cafe.id, welcomeAutoReply: turnOn, welcomeTriggers: triggers },
      });

  return NextResponse.json({
    ok: true,
    action: turnOn ? 'enabled' : 'disabled',
    cafeId: cafe.id,
    cafeName: cafe.name,
    settings: {
      welcomeAutoReply: updated.welcomeAutoReply,
      welcomeMessage: updated.welcomeMessage,
      welcomeTriggers: updated.welcomeTriggers,
      whatsappProvider: updated.whatsappProvider,
      baileysSessionId: updated.baileysSessionId,
    },
  });
}

async function readOnlyStatus() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'no cafe for this user' }, { status: 401 });
  const settings = await prisma.cafeSettings.findUnique({ where: { cafeId: cafe.id } });
  return NextResponse.json({
    ok: true,
    cafeId: cafe.id,
    cafeName: cafe.name,
    settings: {
      welcomeAutoReply: settings?.welcomeAutoReply ?? false,
      welcomeMessage: settings?.welcomeMessage ?? null,
      welcomeTriggers: settings?.welcomeTriggers ?? null,
      whatsappProvider: settings?.whatsappProvider ?? null,
      baileysSessionId: settings?.baileysSessionId ?? null,
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('status') === '1') return readOnlyStatus();
  const turnOn = url.searchParams.get('off') !== '1';
  return applyAndReport(turnOn);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const turnOn = url.searchParams.get('off') !== '1';
  return applyAndReport(turnOn);
}
