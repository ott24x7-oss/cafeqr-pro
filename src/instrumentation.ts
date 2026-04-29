/**
 * Next.js boot hook. Runs once when the Node server starts.
 *
 * IMPORTANT: this file must live at `src/instrumentation.ts` because the
 * project uses `src/app/`. With that layout Next.js refuses to load a
 * root-level `instrumentation.ts` and the hook silently never runs.
 *
 *   - Bootstraps the database (plans + super admin from env vars) so a
 *     fresh Railway deploy is usable without a manual `npm run db:seed`.
 *   - Re-opens every paired Baileys session, so cafe owners stay
 *     connected through redeploys.
 *
 * Both steps are idempotent and best-effort — failures here log a
 * warning and never crash the server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // 1) DB bootstrap (plans + super admin)
  try {
    const { bootstrapDatabase } = await import('./lib/bootstrap');
    const r = await bootstrapDatabase();
    // eslint-disable-next-line no-console
    console.log(`[boot] db: plans=${r.plans} admin=${r.admin}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[boot] db bootstrap skipped:', (e as any)?.message ?? e);
  }

  // 2) Baileys hydrate
  try {
    const { hydrateAllSessions } = await import('./lib/baileys-manager');
    const { count } = await hydrateAllSessions();
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[boot] Baileys: hydrating ${count} session${count > 1 ? 's' : ''}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[boot] Baileys hydrate skipped:', (e as any)?.message ?? e);
  }

  // 3) Renewal-reminder scheduler — fires every 6 hours in-process.
  //    Idempotent (per-subscription dedupe via lastReminderAt) so even
  //    if Railway restarts mid-day, missed runs are picked up on the
  //    next boot. /api/cron/renewal-reminders is also exposed for
  //    external triggers (uptime monitor / Railway cron) — both paths
  //    call the same runRenewalReminders() function.
  try {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const tick = async () => {
      try {
        const { runRenewalReminders } = await import('./lib/renewal-reminders');
        const r = await runRenewalReminders();
        if (r.scanned > 0) {
          // eslint-disable-next-line no-console
          console.log(`[cron] renewal-reminders scanned=${r.scanned} sent=${r.sent} skipped=${r.skipped}`);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[cron] renewal-reminders tick failed:', (e as any)?.message ?? e);
      }
    };
    // Fire once 30s after boot (so DB pool is warm), then every 6 hours.
    setTimeout(tick, 30_000);
    setInterval(tick, SIX_HOURS);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[boot] reminder scheduler skipped:', (e as any)?.message ?? e);
  }
}
