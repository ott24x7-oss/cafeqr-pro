/**
 * External trigger for the renewal-reminder cron. The same logic also
 * runs in-process via the setInterval in instrumentation.ts; this
 * endpoint exists so an uptime monitor (or Railway cron) can hit it
 * to guarantee a fire even when the Node container has been idle.
 *
 * Auth: requires either a super-admin session (so the admin panel can
 * trigger manually) OR a matching `x-cron-secret` header against
 * CRON_SECRET env (so external triggers can hit it without a session).
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runRenewalReminders } from '@/lib/renewal-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorise(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) return { ok: true };
  const s = await getServerSession(authOptions);
  if (s?.user?.role === 'SUPER_ADMIN') return { ok: true };
  return { ok: false, status: 401, error: 'unauthorized' };
}

async function run(req: Request) {
  const auth = await authorise(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await runRenewalReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) { return run(req); }
export async function POST(req: Request) { return run(req); }
