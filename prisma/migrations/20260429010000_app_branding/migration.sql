-- App-mockup branding: super admin can upload a custom app icon and splash
-- image (rendered on the landing page near the download buttons) and set
-- the APK download URLs for the Google and Amazon variants.
--
-- IF NOT EXISTS so this is safe to re-run after `prisma db push` or when
-- a partial state already exists in the target DB.

ALTER TABLE "PlatformBranding"
  ADD COLUMN IF NOT EXISTS "appIconDataUrl"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "splashImageDataUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "apkUrlGoogle"       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "apkUrlAmazon"       TEXT NOT NULL DEFAULT '';
