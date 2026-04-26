import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { sendMessage, configFromCafe, normalizePhone } from '@/lib/whatsapp';

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const phone = normalizePhone(body.to || cafe.whatsappNo || '');
  if (!phone) return NextResponse.json({ error: 'No destination phone' }, { status: 400 });

  const fresh = await prisma.cafe.findUnique({
    where: { id: cafe.id },
    include: { settings: true },
  });
  if (!fresh) return NextResponse.json({ error: 'Cafe not found' }, { status: 404 });

  const config = configFromCafe(fresh as any);
  const message =
    body.message ||
    `✅ Test message from *${fresh.name}* via CafeQR Pro. Provider: ${config.provider ?? 'manual'}.`;

  const result = await sendMessage({ to: phone, message, config });
  return NextResponse.json(result);
}
