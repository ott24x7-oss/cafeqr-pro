/**
 * Whenever the Plan table is mutated (create / update / delete / bulk
 * resort / purge / cleanup), every page that renders pricing has to
 * throw away its cached HTML. Without this, the landing teaser,
 * /pricing and /dashboard/billing keep serving the previous plan list
 * until the route's `revalidate` window elapses (60-300s).
 *
 * Cheap to call — Next.js just marks the path as needing regeneration
 * on the next visit. No DB hit.
 */
import { revalidatePath } from 'next/cache';

export function revalidatePlanSurfaces() {
  revalidatePath('/');
  revalidatePath('/pricing');
  revalidatePath('/dashboard/billing');
}
