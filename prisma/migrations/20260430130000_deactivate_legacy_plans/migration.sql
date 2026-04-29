-- Hide the legacy seed plans (Pro / Starter / Business) by default. The
-- new tier set (Free / Startup / Silver / Gold) replaces them on /pricing
-- and /dashboard/billing. We deactivate rather than delete so that any
-- historical Subscription rows still resolve their FK and a super-admin
-- can flip them back on if needed via /admin/plans.
--
-- Idempotent — re-running on a fresh DB or a DB where the admin has
-- already reactivated them does nothing harmful (no rows match → no
-- updates).
UPDATE "Plan"
SET "isActive" = false
WHERE "slug" IN ('pro', 'starter', 'business')
  AND "isActive" = true;
