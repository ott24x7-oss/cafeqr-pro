/**
 * Next.js boot hook. Runs once when the Node server starts.
 *
 * IMPORTANT: this file must live at `src/instrumentation.ts` because the
 * project uses `src/app/`. With that layout Next.js refuses to load a
 * root-level `instrumentation.ts` and the hook silently never runs.
 *
 *   - Bootstraps the database (super admin from env vars) so a fresh
 *     Railway deploy is usable without a manual `npm run db:seed`.
 *   - Re-opens every paired Baileys session, so the cafe stays
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

}
