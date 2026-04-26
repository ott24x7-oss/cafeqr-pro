import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendMail, passwordResetEmail } from '@/lib/mail';

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to avoid email enumeration
    if (!user) return NextResponse.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });

    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${base}/reset-password/${token}`;

    const result = await sendMail({
      to: user.email,
      subject: 'Reset your CafeQR Pro password',
      html: passwordResetEmail(user.name ?? '', resetUrl),
    });

    return NextResponse.json({
      ok: true,
      // Surface the URL to the dev client when SMTP isn't configured.
      resetUrl: result.transport === 'none' ? resetUrl : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 400 });
  }
}
