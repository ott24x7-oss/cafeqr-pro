-- Add Amazon Appstore link beside the Play Store link. Amazon is the
-- primary distribution channel (Fire OS devices); Play Store is kept as a
-- secondary build target. The Android client picks the right URL at
-- runtime by inspecting the installer package, but admins can set both
-- URLs from /admin/mobile-app.

ALTER TABLE "MobileAppConfig"
  ADD COLUMN "amazonAppstoreUrl" TEXT NOT NULL
  DEFAULT 'https://www.amazon.com/gp/mas/dl/android?p=com.watshop.cafe';
