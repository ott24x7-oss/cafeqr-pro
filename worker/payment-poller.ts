/**
 * CafeQR Pro — Payment auto-verification worker.
 *
 * Long-running process that polls every cafe with Gmail credentials configured
 * and reuses the same `verifyFromGmail` matcher exposed to the dashboard's
 * "Verify from email" button.
 *
 * Deploy as a separate Railway service:
 *   1. Add a new Railway service from the same repo.
 *   2. Override the start command:
 *        npx prisma generate && npx tsx worker/payment-poller.ts
 *   3. Share DATABASE_URL + ENCRYPTION_KEY env vars with the main app.
 *
 * Environment:
 *   POLL_INTERVAL_SEC  — interval between full sweeps (default 60)
 *   POLL_CONCURRENCY   — cafes processed in parallel (default 3)
 */
import { prisma } from '../src/lib/prisma';
import { verifyFromGmail } from '../src/lib/payment-verify';

const INTERVAL = Number(process.env.POLL_INTERVAL_SEC ?? 60) * 1000;
const CONCURRENCY = Math.max(1, Number(process.env.POLL_CONCURRENCY ?? 3));

async function processOnce() {
  const cafes = await prisma.cafe.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      settings: { gmailUser: { not: null }, gmailAppPassword: { not: null } },
    },
    select: { id: true, name: true },
  });

  if (cafes.length === 0) return;

  // Simple parallelism gate.
  for (let i = 0; i < cafes.length; i += CONCURRENCY) {
    const batch = cafes.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (c) => {
      try {
        const r = await verifyFromGmail(c.id);
        if (r.matched > 0) {
          console.log(`[poller] ${c.name}: matched=${r.matched} scanned=${r.scanned}`);
        } else if (r.errors.length > 0) {
          console.warn(`[poller] ${c.name}: errors=${r.errors.length} ${r.errors[0]}`);
        }
      } catch (e) {
        console.error(`[poller] ${c.name}: failed`, e);
      }
    }));
  }
}

async function main() {
  console.log(`[poller] starting — interval ${INTERVAL / 1000}s, concurrency ${CONCURRENCY}`);
  // First run immediately, then on interval.
  while (true) {
    const t0 = Date.now();
    try {
      await processOnce();
    } catch (e) {
      console.error('[poller] tick failed', e);
    }
    const elapsed = Date.now() - t0;
    const wait = Math.max(1000, INTERVAL - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
