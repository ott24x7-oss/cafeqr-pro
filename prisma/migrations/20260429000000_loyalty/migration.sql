-- Loyalty programme. Per-cafe configuration (enabled flag + earn rate)
-- lives on CafeSettings; the actual ledger lives in two new tables.
-- Points credit automatically when a paid order's payment confirms (see
-- src/lib/post-payment.ts → awardLoyaltyForOrder). 1 point = 1 unit of
-- the cafe's currency.
--
-- Statements use IF NOT EXISTS / DO blocks so this migration is safe to
-- re-run on a database where the columns/tables were created manually
-- via `prisma db push`.

-- 1. Per-cafe loyalty settings.
ALTER TABLE "CafeSettings"
  ADD COLUMN IF NOT EXISTS "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "loyaltyPercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0;

-- 2. Transaction type enum.
DO $$ BEGIN
  CREATE TYPE "LoyaltyTxnType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. One account per (cafe, customer phone). Phone is the same identity
-- already on Order.customerPhone so order history joins cleanly.
CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
  "id"               TEXT          NOT NULL,
  "cafeId"           TEXT          NOT NULL,
  "phone"            TEXT          NOT NULL,
  "name"             TEXT,
  "points"           INTEGER       NOT NULL DEFAULT 0,
  "lifetimeEarned"   INTEGER       NOT NULL DEFAULT 0,
  "lifetimeRedeemed" INTEGER       NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_cafeId_phone_key" ON "LoyaltyAccount"("cafeId", "phone");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_cafeId_idx" ON "LoyaltyAccount"("cafeId");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_phone_idx" ON "LoyaltyAccount"("phone");

DO $$ BEGIN
  ALTER TABLE "LoyaltyAccount"
    ADD CONSTRAINT "LoyaltyAccount_cafeId_fkey"
    FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Ledger. The compound (accountId, orderId, type) unique makes EARN
-- credits per order idempotent at the DB level — calling
-- awardLoyaltyForOrder repeatedly cannot double-credit. orderId is
-- nullable for manual REDEEM/ADJUST rows.
CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
  "id"        TEXT             NOT NULL,
  "accountId" TEXT             NOT NULL,
  "type"      "LoyaltyTxnType" NOT NULL,
  "points"    INTEGER          NOT NULL,
  "orderId"   TEXT,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyTransaction_accountId_orderId_type_key"
  ON "LoyaltyTransaction"("accountId", "orderId", "type");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");

DO $$ BEGIN
  ALTER TABLE "LoyaltyTransaction"
    ADD CONSTRAINT "LoyaltyTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
