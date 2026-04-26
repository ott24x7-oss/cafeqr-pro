-- Global site-settings singleton: branding, support email, SMTP creds and a
-- JSON content blob the marketing pages can read.

CREATE TABLE "SiteSettings" (
  "id"           TEXT NOT NULL DEFAULT 'singleton',
  "siteName"     TEXT NOT NULL DEFAULT 'CafeQR Pro',
  "tagline"      TEXT,
  "supportEmail" TEXT,
  "smtpHost"     TEXT,
  "smtpPort"     INTEGER,
  "smtpUser"     TEXT,
  "smtpPass"     TEXT,
  "smtpFrom"     TEXT,
  "content"      JSONB,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "updatedBy"    TEXT,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
