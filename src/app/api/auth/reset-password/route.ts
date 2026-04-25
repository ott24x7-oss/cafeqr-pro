import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const { token, password } = schema.parse(await req.json());
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token invalid or expired' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: reset.userId }, data: { password: await hashPassword(password) } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed' }, { status: 400 });
  }
}
