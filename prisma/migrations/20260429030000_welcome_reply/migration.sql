-- Welcome auto-reply: when a customer DMs a cafe's WhatsApp number with a
-- trigger word ("hi", "hello", ...), the Baileys session replies once per
-- 7 days with welcomeMessage + the cafe's storefront URL. Owner controls
-- the toggle, message body and triggers from /dashboard/settings.

ALTER TABLE "CafeSettings"
  ADD COLUMN IF NOT EXISTS "welcomeAutoReply" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "welcomeMessage"   TEXT,
  ADD COLUMN IF NOT EXISTS "welcomeTriggers"  TEXT[] NOT NULL DEFAULT ARRAY['hi','hello']::TEXT[];

-- Per-customer ledger driving the 7-day cooldown. Single indexed lookup
-- per inbound message; upserted on every successful welcome send.
CREATE TABLE IF NOT EXISTS "WelcomeReplyLog" (
  "id"          TEXT          NOT NULL,
  "cafeId"      TEXT          NOT NULL,
  "phone"       TEXT          NOT NULL,
  "lastSentAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WelcomeReplyLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WelcomeReplyLog_cafeId_phone_key"
  ON "WelcomeReplyLog"("cafeId", "phone");
CREATE INDEX IF NOT EXISTS "WelcomeReplyLog_cafeId_idx"
  ON "WelcomeReplyLog"("cafeId");
