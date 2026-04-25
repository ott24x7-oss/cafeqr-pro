import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = buildTransporter();
  return cachedTransporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mail] SMTP not configured — skipping send to', opts.to);
    return { ok: false, skipped: true };
  }
  const from = process.env.SMTP_FROM || `CafeQR Pro <no-reply@cafeqr.pro>`;
  await t.sendMail({ from, ...opts });
  return { ok: true };
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
