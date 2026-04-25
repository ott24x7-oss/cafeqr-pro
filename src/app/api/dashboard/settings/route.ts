import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { cafe: cafeFields, settings } = await req.json();

  await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      name: cafeFields.name,
      description: cafeFields.description,
      address: cafeFields.address,
      city: cafeFields.city,
      phone: cafeFields.phone,
      whatsappNo: cafeFields.whatsappNo,
      email: cafeFields.email,
      gstNumber: cafeFields.gstNumber,
      fssaiNumber: cafeFields.fssaiNumber,
      logoUrl: cafeFields.logoUrl || null,
      coverUrl: cafeFields.coverUrl || null,
    },
  });

  await prisma.cafeSettings.upsert({
    where: { cafeId: cafe.id },
    create: { cafeId: cafe.id, ...settings },
    update: settings,
  });

  return NextResponse.json({ ok: true });
}
