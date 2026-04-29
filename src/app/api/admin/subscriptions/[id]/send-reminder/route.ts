/**
 * Super-admin manual trigger for the renewal reminder. Bypasses the
 * 24h dedupe (force=true) so the admin can resend on demand from
 * /admin/users — useful when an owner says "I never got the message"
 * or the platform is doing outreach for a specific upcoming renewal.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendRenewalReminder } from '@/lib/renewal-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (s?.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const result = await sendRenewalReminder(params.id, { force: true });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
