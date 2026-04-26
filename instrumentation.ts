/**
 * Next.js boot hook. Runs once when the Node server starts. We use it to
 * re-open every paired Baileys session from the database, so cafe owners
 * stay connected through Railway redeploys without anyone clicking
 * 'Pair device' again.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // Lazy import — keeps Baileys / pino out of the edge runtime path.
  try {
    const { hydrateAllSessions } = await import('./src/lib/baileys-manager');
    const { count } = await hydrateAllSessions();
    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(`[boot] Baileys: hydrating ${count} session${count > 1 ? 's' : ''}`);
    }
  } catch (e) {
    // Don't crash the server if hydration fails — just log.
    // eslint-disable-next-line no-console
    console.warn('[boot] Baileys hydrate skipped:', (e as any)?.message ?? e);
  }
}
