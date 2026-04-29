import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';
import { encrypt } from '@/lib/crypto';
import { getPlanLimits } from '@/lib/plan-limits';

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

  // Accept the currency override (defaults to INR). We deliberately don't
  // touch ownerId / status / planId here — those are super-admin domain.
  const cafeUpdate: any = {
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
  };
  if (typeof cafeFields.currency === 'string' && cafeFields.currency.length === 3) {
    cafeUpdate.currency = cafeFields.currency.toUpperCase();
  }
  await prisma.cafe.update({ where: { id: cafe.id }, data: cafeUpdate });

  const existing = await prisma.cafeSettings.findUnique({ where: { cafeId: cafe.id } });

  // Plan-tier feature lock: silently strip writes to columns the cafe's
  // plan doesn't unlock. Returning 200 with the field stripped is a
  // friendlier UX than rejecting the whole save (which would lose the
  // user's edits to non-locked fields). The dashboard UI should also
  // hide/disable these inputs visually so this is just defence-in-depth.
  const planLimits = await getPlanLimits(cafe.id);
  if (!planLimits.features.loyalty) {
    delete (settings as any).loyaltyEnabled;
    delete (settings as any).loyaltyPercent;
  }
  if (!planLimits.features.whatsapp) {
    delete (settings as any).whatsappProvider;
    delete (settings as any).waCloudToken;
    delete (settings as any).waCloudPhoneId;
    delete (settings as any).waCloudVerifyToken;
    delete (settings as any).baileysSessionId;
    delete (settings as any).welcomeAutoReply;
    delete (settings as any).welcomeMessage;
    delete (settings as any).welcomeTriggers;
  }
  if (!planLimits.features.payment) {
    delete (settings as any).upiId;
    delete (settings as any).upiQrUrl;
    delete (settings as any).paymentEnabled;
    delete (settings as any).paymentTiming;
    delete (settings as any).paymentNote;
    delete (settings as any).gmailUser;
    delete (settings as any).gmailAppPassword;
    delete (settings as any).gmailSenderFilter;
    delete (settings as any).gmailSubjectFilter;
  }

  // Plain (non-secret) fields we accept directly.
  const plain = pickPlain(settings, [
    'taxPercent', 'serviceCharge', 'packingCharge', 'deliveryCharge',
    'minOrderAmount', 'acceptDineIn', 'acceptTakeaway', 'acceptDelivery',
    'whatsappProvider', 'notifyOwnerWA', 'notifyCustomerWA', 'notifyOnStatuses',
    'waCloudPhoneId', 'baileysSessionId', 'notifyNumbers',
    'gmailUser', 'gmailSenderFilter', 'gmailSubjectFilter', 'paymentMatchWindowMinutes',
    'upiId', 'upiQrUrl', 'paymentEnabled', 'paymentTiming', 'paymentNote',
    'reviewEnabled', 'googleReviewUrl', 'primaryColor', 'accentColor',
    'enableSound', 'language',
    'country', 'deliveryPartnerPhone',
    'invoiceTemplate',
    'loyaltyEnabled', 'loyaltyPercent',
    'welcomeAutoReply', 'welcomeMessage', 'welcomeTriggers',
  ]);

  // Sanitize welcome triggers: lowercased, trimmed, deduped, length-capped.
  if (Array.isArray(plain.welcomeTriggers)) {
    plain.welcomeTriggers = Array.from(
      new Set(
        plain.welcomeTriggers
          .map((t: any) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
          .filter((t: string) => t.length > 0 && t.length <= 32),
      ),
    ).slice(0, 12);
  } else if (plain.welcomeTriggers !== undefined) {
    delete plain.welcomeTriggers;
  }
  if (typeof plain.welcomeMessage === 'string') {
    plain.welcomeMessage = plain.welcomeMessage.slice(0, 1000);
  }

  // Clamp loyalty percent to a sane band so a typo can't gift the cafe owner
  // a 1000% earn rate. 0–50% is plenty of headroom.
  if (plain.loyaltyPercent !== undefined) {
    const v = Number(plain.loyaltyPercent);
    plain.loyaltyPercent = Number.isFinite(v) ? Math.max(0, Math.min(50, v)) : 0;
  }

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

  if (plain.paymentTiming !== undefined) {
    plain.paymentTiming = plain.paymentTiming === 'postpaid' ? 'postpaid' : 'prepaid';
  }

  // Whitelist invoice template values so a tampered payload can't store
  // arbitrary strings the renderer would silently fall back to 'classic' on.
  if (plain.invoiceTemplate !== undefined) {
    const allowed = ['classic', 'modern', 'minimal', 'receipt', 'elegant', 'bold'];
    if (!allowed.includes(plain.invoiceTemplate)) plain.invoiceTemplate = 'classic';
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
