-- Guest checkout: customers can place an order with just name + number,
-- skipping the 1-tap WhatsApp verification. Owners who want to keep login
-- mandatory can switch this off in Settings → Tax & charges.
ALTER TABLE "CafeSettings"
  ADD COLUMN IF NOT EXISTS "allowGuestCheckout" BOOLEAN NOT NULL DEFAULT true;
