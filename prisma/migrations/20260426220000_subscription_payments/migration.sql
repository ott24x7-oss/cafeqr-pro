-- Platform-side payment collection: SaaS owner (super admin) can configure a
-- UPI ID + Gmail for subscription auto-verify, mirroring the cafe-side flow.

ALTER TABLE "SiteSettings"
  ADD COLUMN "platformUpiId"            TEXT,
  ADD COLUMN "platformUpiQrUrl"         TEXT,
  ADD COLUMN "platformGmailUser"        TEXT,
  ADD COLUMN "platformGmailAppPassword" TEXT;

ALTER TABLE "Subscription"
  ADD COLUMN "payableAmount" DOUBLE PRECISION,
  ADD COLUMN "paidAt"        TIMESTAMP(3),
  ADD COLUMN "transactionId" TEXT;

-- New default for status is 'pending' for fresh rows. Existing rows stay at
-- whatever they were ('active' for the freebies the user already accumulated).
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
