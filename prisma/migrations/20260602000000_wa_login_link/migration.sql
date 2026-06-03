-- One-tap WhatsApp login ("text-to-login").
--
-- 1. Per-cafe controls on CafeSettings: a toggle (on by default) and the
--    trigger words a customer can DM the cafe's WhatsApp number to receive a
--    single-use login link. Only fires on the Baileys provider.
ALTER TABLE "CafeSettings"
  ADD COLUMN IF NOT EXISTS "waLoginEnabled"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "waLoginTriggers" TEXT[]  NOT NULL DEFAULT ARRAY['login','log in','sign in','signin']::TEXT[];

-- 2. WhatsAppMagicLink ledger. This table backs both the existing customer
--    web magic-link login and the new text-to-login flow. It was previously
--    only created via `prisma db push`, so a fresh `prisma migrate deploy`
--    never had it — create it idempotently here so both paths work on a
--    clean database.
CREATE TABLE IF NOT EXISTS "WhatsAppMagicLink" (
  "id"         TEXT          NOT NULL,
  "cafeId"     TEXT          NOT NULL,
  "cafeSlug"   TEXT          NOT NULL,
  "phone"      TEXT          NOT NULL,
  "token"      TEXT          NOT NULL,
  "expiresAt"  TIMESTAMP(3)  NOT NULL,
  "usedAt"     TIMESTAMP(3),
  "ip"         TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppMagicLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMagicLink_token_key"
  ON "WhatsAppMagicLink"("token");
CREATE INDEX IF NOT EXISTS "WhatsAppMagicLink_cafeId_phone_idx"
  ON "WhatsAppMagicLink"("cafeId", "phone");
CREATE INDEX IF NOT EXISTS "WhatsAppMagicLink_expiresAt_idx"
  ON "WhatsAppMagicLink"("expiresAt");

-- Foreign key → Cafe(id), cascade on delete. Wrapped so re-running on a DB
-- where db:push already added the constraint is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppMagicLink_cafeId_fkey'
  ) THEN
    ALTER TABLE "WhatsAppMagicLink"
      ADD CONSTRAINT "WhatsAppMagicLink_cafeId_fkey"
      FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
