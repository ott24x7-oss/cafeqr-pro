-- Cafe-selectable invoice template — drives which PDF style is attached on
-- the post-payment WhatsApp. Default 'classic' keeps existing behaviour.

ALTER TABLE "CafeSettings"
  ADD COLUMN "invoiceTemplate" TEXT NOT NULL DEFAULT 'classic';
