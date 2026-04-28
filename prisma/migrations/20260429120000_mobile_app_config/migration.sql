-- Singleton row that holds the runtime config consumed by the Android
-- companion app (com.watshop.cafe). Uploaded logos are stored as base64
-- data URLs (PNG / JPEG / WebP, <= 2 MB encoded) and re-served as binary
-- through /api/mobile-app/assets/[name]. The public read endpoint is
-- /api/mobile-app/config; the admin editor is /admin/mobile-app.

CREATE TABLE "MobileAppConfig" (
  "id"                    TEXT NOT NULL DEFAULT 'singleton',
  "appName"               TEXT NOT NULL DEFAULT 'WatShop Cafe',
  "logoData"              TEXT NOT NULL DEFAULT '',
  "splashLogoData"        TEXT NOT NULL DEFAULT '',
  "splashBackgroundColor" TEXT NOT NULL DEFAULT '#0B0F14',
  "primaryColor"          TEXT NOT NULL DEFAULT '#22C55E',
  "tagline"               TEXT NOT NULL DEFAULT 'QR Ordering for Cafes',
  "maintenanceMode"       BOOLEAN NOT NULL DEFAULT false,
  "maintenanceMessage"    TEXT NOT NULL DEFAULT 'App is under maintenance. Please try again later.',
  "forceUpdate"           BOOLEAN NOT NULL DEFAULT false,
  "minimumVersionCode"    INTEGER NOT NULL DEFAULT 1,
  "playStoreUrl"          TEXT NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.watshop.cafe',
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobileAppConfig_pkey" PRIMARY KEY ("id")
);
