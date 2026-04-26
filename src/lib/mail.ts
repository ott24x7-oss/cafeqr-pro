/**
 * Outgoing email transport.
 *
 * Resolution order on each send():
 *   1. SiteSettings.smtp* (set via Super Admin → Site → Email)
 *   2. SMTP_HOST + SMTP_USER + SMTP_PASS env vars
 *   3. PHP relay at PHP_MAILER_URL (defaults to ott24x7's relay)
 *
 * Each transport is tried in order; the first to succeed wins. Failures are
 * logged but never thrown — callers branch on the returned `transport`.
 */
import nodemailer from 'nodemailer';
import { getSiteSettings } from './site-settings';

const PHP_MAILER_URL =
  process.env.PHP_MAILER_URL || 'https://ott24x7.com/mailer/send.php';
const PHP_MAILER_KEY = process.env.PHP_MAILER_KEY || '';
const FROM_DEFAULT =
  process.env.SMTP_FROM || 'CafeQR Pro <no-reply@cafeqr.pro>';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

async function resolveSmtp(): Promise<SmtpConfig | null> {
  // 1) DB-backed Site Settings
  try {
    const s = await getSiteSettings();
    if (s.smtpHost && s.smtpUser && s.smtpPass) {
      return {
        host: s.smtpHost,
        port: s.smtpPort ?? 587,
        user: s.smtpUser,
        pass: s.smtpPass,
        from: s.smtpFrom ?? undefined,
      };
    }
  } catch {/* DB unavailable — fall through to env */}

  // 2) Env vars
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return { host, port, user, pass, from: process.env.SMTP_FROM };
  }
  return null;
}

function buildTransporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/** @deprecated kept for backwards compat with existing callers. */
export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return buildTransporter({ host, port, user, pass, from: process.env.SMTP_FROM });
}

async function sendViaPhpRelay(opts: { to: string; subject: string; html: string; text?: string; from?: string }) {
  try {
    const res = await fetch(PHP_MAILER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PHP_MAILER_KEY ? { 'X-Api-Key': PHP_MAILER_KEY } : {}),
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        from: opts.from ?? FROM_DEFAULT,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[mail] php relay error', res.status, body.slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[mail] php relay threw', e);
    return { ok: false };
  }
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string; from?: string }) {
  const smtp = await resolveSmtp();
  if (smtp) {
    try {
      const t = buildTransporter(smtp);
      await t.sendMail({ from: opts.from ?? smtp.from ?? FROM_DEFAULT, ...opts });
      return { ok: true, transport: 'smtp' as const };
    } catch (e) {
      console.warn('[mail] SMTP send failed, falling back to php relay', (e as any)?.message ?? e);
    }
  }
  const r = await sendViaPhpRelay({ ...opts, from: opts.from ?? FROM_DEFAULT });
  if (r.ok) return { ok: true, transport: 'php' as const };
  return { ok: false, transport: 'none' as const };
}

/** Verifies SMTP credentials by opening a connection without sending a real
 *  message. Used by the Site Settings → Email "Test" button. */
export async function verifySmtp(cfg: SmtpConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = buildTransporter(cfg);
    await t.verify();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export function passwordResetEmail(name: string, link: string) {
  return `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px 24px; background: #FFFBF5; border-radius: 16px;">
    <h1 style="color: #6B4E3D; margin: 0 0 16px;">CafeQR Pro</h1>
    <p style="color: #523C30;">Hi ${name || 'there'},</p>
    <p style="color: #523C30;">You asked to reset your password. Click the button below — link expires in 30 minutes.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${link}" style="background: #6B4E3D; color: #FFFBF5; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600;">Reset Password</a>
    </p>
    <p style="color: #85604A; font-size: 13px;">If you didn't request this, ignore this email.</p>
  </div>`;
}

export function orderReceiptEmail(order: any, cafe: any) {
  const items = (order.items || [])
    .map(
      (i: any) =>
        `<tr><td style="padding:6px 0;">${i.name}${i.variantName ? ` (${i.variantName})` : ''}</td><td align="center">${i.quantity}</td><td align="right">₹${i.totalPrice.toFixed(0)}</td></tr>`
    )
    .join('');
  return `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; background: #FFFBF5;">
    <h2 style="color: #6B4E3D; margin: 0;">${cafe.name}</h2>
    <p style="color: #85604A; margin: 4px 0 24px;">Order Receipt — #${order.orderNumber}</p>
    <table style="width:100%; border-collapse: collapse; color: #523C30;">
      <thead><tr style="border-bottom: 1px solid #E8D5BE;"><th align="left">Item</th><th>Qty</th><th align="right">Price</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <p style="text-align:right; margin-top:24px; font-size:18px; color: #6B4E3D;"><b>Total: ₹${order.totalAmount.toFixed(0)}</b></p>
  </div>`;
}
