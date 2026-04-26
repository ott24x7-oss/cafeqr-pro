import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { encrypt } from '@/lib/crypto';

const ENCRYPTED_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;
const SENTINEL = '__unchanged__';

function maybeEncrypt(value: unknown, existing?: string | null): string | null | undefined {
  if (value === undefined) return undefined;            // not provided → don't touch
  if (value === SENTINEL) return undefined;             // client says "leave existing"
  if (value === null || value === '') return null;      // explicit clear
  if (typeof value !== 'string') return undefined;
  if (ENCRYPTED_RE.test(value)) return value;           // already encrypted (round-trip)
  if (value === existing) return existing;
  return encrypt(value);
}

function pickPlain<T extends Record<string, any>>(obj: T, keys: (keyof T)[]) {
  const out: Record<string, any> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k as string] = obj[k];
  return out;
}

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

  const existing = await prisma.cafeSettings.findUnique({ where: { cafeId: cafe.id } });

  // Plain (non-secret) fields we accept directly.
  const plain = pickPlain(settings, [
    'taxPercent', 'serviceCharge', 'packingCharge', 'deliveryCharge',
    'minOrderAmount', 'acceptDineIn', 'acceptTakeaway', 'acceptDelivery',
    'whatsappProvider', 'notifyOwnerWA', 'notifyCustomerWA', 'notifyOnStatuses',
    'waCloudPhoneId', 'baileysSessionId', 'notifyNumbers',
    'gmailUser', 'gmailSenderFilter', 'gmailSubjectFilter', 'paymentMatchWindowMinutes',
    'upiId', 'upiQrUrl', 'paymentEnabled', 'paymentNote',
    'reviewEnabled', 'googleReviewUrl', 'primaryColor', 'accentColor',
    'enableSound', 'language',
  ]);

  // Whitelist the values we'll accept for notifyOnStatuses so a tampered
  // payload can't sneak random strings into the array column.
  const ALLOWED_NOTIF_STATUSES = new Set([
    'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'PAID',
  ]);
  if (Array.isArray(plain.notifyOnStatuses)) {
    plain.notifyOnStatuses = Array.from(
      new Set(plain.notifyOnStatuses.filter((s: any) => typeof s === 'string' && ALLOWED_NOTIF_STATUSES.has(s)))
    );
  } else {
    delete plain.notifyOnStatuses;
  }

  // Secrets — encrypted at rest. Use SENTINEL from client when leaving alone.
  const secretUpdates: Record<string, any> = {};
  const waToken = maybeEncrypt(settings.waCloudToken, existing?.waCloudToken);
  if (waToken !== undefined) secretUpdates.waCloudToken = waToken;
  const waVerify = maybeEncrypt(settings.waCloudVerifyToken, existing?.waCloudVerifyToken);
  if (waVerify !== undefined) secretUpdates.waCloudVerifyToken = waVerify;
  const gmailPass = maybeEncrypt(settings.gmailAppPassword, existing?.gmailAppPassword);
  if (gmailPass !== undefined) secretUpdates.gmailAppPassword = gmailPass;

  // Normalize notifyNumbers to digits-only.
  if (Array.isArray(plain.notifyNumbers)) {
    plain.notifyNumbers = plain.notifyNumbers
      .map((n: string) => String(n || '').replace(/\D/g, ''))
      .filter((n: string) => n.length >= 10);
  }

  if (existing) {
    await prisma.cafeSettings.update({
      where: { cafeId: cafe.id },
      data: { ...plain, ...secretUpdates },
    });
  } else {
    await prisma.cafeSettings.create({
      data: { cafeId: cafe.id, ...plain, ...secretUpdates },
    });
  }

  return NextResponse.json({ ok: true });
}
