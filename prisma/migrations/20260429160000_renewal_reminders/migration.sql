-- Renewal reminder ledger column. Stamped by the cron after each
-- WhatsApp ping so we don't double-send within 24h. Index on endsAt
-- so the daily query that selects "subscriptions expiring in <= 3
-- days" is a fast range scan rather than a full table sweep.

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Subscription_endsAt_idx" ON "Subscription"("endsAt");
