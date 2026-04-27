-- Singleton row that holds the platform marketing site branding overrides
-- (logo data URL, brand name, tagline, footer text, primary color) so the
-- super admin can rebrand cafe.watshop.in without a redeploy. The runtime
-- patcher at /js/branding.js consumes /api/branding (60s public cache).

CREATE TABLE "PlatformBranding" (
  "id"           TEXT NOT NULL DEFAULT 'singleton',
  "logoDataUrl"  TEXT NOT NULL DEFAULT '',
  "brandName"    TEXT NOT NULL DEFAULT '',
  "tagline"      TEXT NOT NULL DEFAULT '',
  "footerText"   TEXT NOT NULL DEFAULT '',
  "primaryColor" TEXT NOT NULL DEFAULT '',
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformBranding_pkey" PRIMARY KEY ("id")
);
