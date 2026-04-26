-- Cafe-level country (used to set the default WA dial code) and
-- a delivery partner WhatsApp number that gets pinged when a
-- DELIVERY-type order lands.

ALTER TABLE "CafeSettings"
  ADD COLUMN "country"              TEXT NOT NULL DEFAULT 'IN',
  ADD COLUMN "deliveryPartnerPhone" TEXT;
