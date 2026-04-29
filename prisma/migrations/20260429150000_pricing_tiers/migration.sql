-- Pricing tiers v1: Free Lifetime / Startup / Silver / Gold.
-- Schema gains a per-month order limit and per-feature opt-in flags
-- (loyalty, payment, coupons; whatsapp already existed). The 4 plans
-- are upserted by slug so re-runs are safe; existing cafes pointing
-- at older plan rows are grandfathered onto Startup.

ALTER TABLE "Plan"
  ADD COLUMN IF NOT EXISTS "maxOrdersPerMonth" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loyaltyEnabled"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "paymentEnabled"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "couponsEnabled"    BOOLEAN NOT NULL DEFAULT true;

-- Seed / upsert the canonical 4 plans. Deterministic IDs so the
-- grandfather UPDATE below + future joins can hard-code the Startup id.
INSERT INTO "Plan" (
  "id", "name", "slug",
  "priceMonthly", "priceYearly",
  "maxTables", "maxMenuItems", "maxStaff", "maxOrdersPerMonth",
  "whatsappEnabled", "loyaltyEnabled", "paymentEnabled", "couponsEnabled",
  "customBranding", "customSubdomain", "prioritySupport", "analytics", "multiLanguage",
  "features", "isActive", "isPopular", "sortOrder", "description",
  "createdAt", "updatedAt"
) VALUES
  ('plan_free_v1',    'Free Lifetime', 'free',     0,   0,    2,  10, 1,  30,
    false, false, false, false,  false, false, false, false, false,
    ARRAY[]::TEXT[], true, false, 0,
    'Get started for free — perfect for testing or very small cafes.',
    NOW(), NOW()),
  ('plan_startup_v1', 'Startup',       'startup',  199, 1200, 10, 25, 2,  100,
    true,  true,  true,  true,   false, false, false, true,  false,
    ARRAY[]::TEXT[], true, false, 1,
    'For small cafes ready to take real orders online.',
    NOW(), NOW()),
  ('plan_silver_v1',  'Silver',        'silver',   299, 1799, 25, 50, 5,  200,
    true,  true,  true,  true,   true,  false, false, true,  false,
    ARRAY[]::TEXT[], true, true,  2,
    'Most popular — for growing cafes with steady online demand.',
    NOW(), NOW()),
  ('plan_gold_v1',    'Gold',          'gold',     499, 2999, 50, 200, 10, 1000,
    true,  true,  true,  true,   true,  true,  true,  true,  true,
    ARRAY[]::TEXT[], true, false, 3,
    'For high-volume cafes and small chains.',
    NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "name"             = EXCLUDED."name",
  "priceMonthly"     = EXCLUDED."priceMonthly",
  "priceYearly"      = EXCLUDED."priceYearly",
  "maxTables"        = EXCLUDED."maxTables",
  "maxMenuItems"     = EXCLUDED."maxMenuItems",
  "maxStaff"         = EXCLUDED."maxStaff",
  "maxOrdersPerMonth" = EXCLUDED."maxOrdersPerMonth",
  "whatsappEnabled"  = EXCLUDED."whatsappEnabled",
  "loyaltyEnabled"   = EXCLUDED."loyaltyEnabled",
  "paymentEnabled"   = EXCLUDED."paymentEnabled",
  "couponsEnabled"   = EXCLUDED."couponsEnabled",
  "customBranding"   = EXCLUDED."customBranding",
  "customSubdomain"  = EXCLUDED."customSubdomain",
  "prioritySupport"  = EXCLUDED."prioritySupport",
  "analytics"        = EXCLUDED."analytics",
  "multiLanguage"    = EXCLUDED."multiLanguage",
  "isActive"         = EXCLUDED."isActive",
  "isPopular"        = EXCLUDED."isPopular",
  "sortOrder"        = EXCLUDED."sortOrder",
  "description"      = EXCLUDED."description",
  "updatedAt"        = NOW();

-- Hide any older legacy plan rows (starter/pro/business/etc.) from the
-- public pricing page without deleting them — existing cafes that
-- reference those rows keep working, the row just won't show on /pricing.
UPDATE "Plan"
   SET "isActive" = false
 WHERE "slug" NOT IN ('free', 'startup', 'silver', 'gold');

-- Option A grandfather: any cafe with a missing / orphaned planId moves
-- onto Startup (paid tier) so they keep the loyalty/whatsapp/payment
-- features they were already using. Existing TRIAL cafes also flip to
-- ACTIVE since the trial concept is replaced by Free Lifetime going
-- forward.
UPDATE "Cafe"
   SET "planId" = 'plan_startup_v1'
 WHERE "planId" IS NULL
    OR "planId" NOT IN (SELECT "id" FROM "Plan");

UPDATE "Cafe" SET "status" = 'ACTIVE' WHERE "status" = 'TRIAL';
