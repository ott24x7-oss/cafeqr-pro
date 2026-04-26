-- Phase A: per-cafe WhatsApp creds, admin notify list, Gmail auto-verify, staff notify toggle.

ALTER TABLE "CafeSettings"
  ADD COLUMN     "waCloudToken"             TEXT,
  ADD COLUMN     "waCloudPhoneId"           TEXT,
  ADD COLUMN     "waCloudVerifyToken"       TEXT,
  ADD COLUMN     "baileysSessionId"         TEXT,
  ADD COLUMN     "notifyNumbers"            TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "gmailUser"                TEXT,
  ADD COLUMN     "gmailAppPassword"         TEXT,
  ADD COLUMN     "gmailSenderFilter"        TEXT,
  ADD COLUMN     "gmailSubjectFilter"       TEXT,
  ADD COLUMN     "paymentMatchWindowMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Staff"
  ADD COLUMN     "notifyOnNewOrder" BOOLEAN NOT NULL DEFAULT false;
