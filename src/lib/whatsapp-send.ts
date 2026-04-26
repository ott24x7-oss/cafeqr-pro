/**
 * Server-only WhatsApp sender.
 *
 * Holds the network-y bits (Cloud API, Baileys) so client bundles never
 * transitively pull in fs/path/baileys. Importing this from a client file
 * will produce a build error thanks to `server-only`.
 */
import 'server-only';
import { decrypt } from './crypto';
import { normalizePhone, waLink, type WAProvider, type CafeWAConfig } from './whatsapp';

export interface SendResult {
  ok: boolean;
  provider: WAProvider;
  link?: string;
  error?: string;
}

export interface SendOpts {
  to: string;
  message: string;
  provider?: WAProvider;
  config?: CafeWAConfig;
  /** Optional image URL — sent as the message media with `message` as caption. */
  imageUrl?: string;
}

function maybeDecrypt(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(v)) {
    const out = decrypt(v);
    return out || v;
  }
  return v;
}

export async function sendMessage({ to, message, provider, config, imageUrl }: SendOpts): Promise<SendResult> {
  const link = waLink(to, message);
  const eff: WAProvider = (provider ?? config?.provider ?? 'manual') as WAProvider;

  if (eff === 'manual') {
    return { ok: true, provider: 'manual', link };
  }

  if (eff === 'cloud_api') {
    try {
      const token   = maybeDecrypt(config?.cloudToken)   ?? process.env.WHATSAPP_CLOUD_TOKEN;
      const phoneId = maybeDecrypt(config?.cloudPhoneId) ?? process.env.WHATSAPP_CLOUD_PHONE_ID;
      if (!token || !phoneId) return { ok: false, provider: eff, error: 'Cloud API not configured', link };
      const body = imageUrl
        ? {
            messaging_product: 'whatsapp',
            to: normalizePhone(to),
            type: 'image',
            image: { link: imageUrl, caption: message },
          }
        : {
            messaging_product: 'whatsapp',
            to: normalizePhone(to),
            type: 'text',
            text: { body: message },
          };
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { ok: false, provider: eff, error: await res.text(), link };
      return { ok: true, provider: eff, link };
    } catch (e: any) {
      return { ok: false, provider: eff, error: e?.message ?? 'send failed', link };
    }
  }

  if (eff === 'baileys') {
    const base = process.env.BAILEYS_WORKER_URL;
    if (!base) {
      // In-process Baileys (default).
      try {
        const { sendBaileysInProcess } = await import('./baileys-manager');
        const r = await sendBaileysInProcess({
          sessionId: config?.baileysSessionId ?? undefined,
          to: normalizePhone(to),
          message,
          imageUrl,
        });
        return { ok: r.ok, provider: eff, link, error: r.error };
      } catch (e: any) {
        return { ok: false, provider: eff, error: e?.message ?? 'baileys send failed', link };
      }
    }
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.BAILEYS_WORKER_TOKEN ? { Authorization: `Bearer ${process.env.BAILEYS_WORKER_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          sessionId: config?.baileysSessionId ?? 'default',
          to: normalizePhone(to),
          message,
          imageUrl,
        }),
      });
      if (!res.ok) return { ok: false, provider: eff, error: await res.text(), link };
      return { ok: true, provider: eff, link };
    } catch (e: any) {
      return { ok: false, provider: eff, error: e?.message ?? 'baileys send failed', link };
    }
  }

  return { ok: false, provider: eff, error: 'unknown provider', link };
}
