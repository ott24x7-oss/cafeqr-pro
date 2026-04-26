/**
 * Next.js boot hook. Runs once when the Node server starts.
 *   - Bootstraps the database (plans + super admin from env vars) so a
 *     fresh Railway deploy is usable without a manual `npm run db:seed`.
 *   - Re-opens every paired Baileys session, so cafe owners stay
 *     connected through redeploys.
 * Both steps are idempotent and best-effort — failures here log a
 * warning and never crash the server.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // 1) DB bootstrap (plans + super admin)
  try {
    const { bootstrapDatabase } = await import('./src/lib/bootstrap');
    const r = await bootstrapDatabase();
    // eslint-disable-next-line no-console
    console.log(`[boot] db: plans=${r.plans} admin=${r.admin}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[boot] db bootstrap skipped:', (e as any)?.message ?? e);
  }

  // 2) Baileys hydrate
  try {
    const { hydrateAllSessions } = await import('./src/lib/baileys-manager');
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
