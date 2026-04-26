-- Whether the cafe collects payment before or after serving the food.
-- 'prepaid'  → pay-now button + QR scan flow as before.
-- 'postpaid' → bot sends a payment-link WA when the order is marked Served.

ALTER TABLE "CafeSettings"
  ADD COLUMN "paymentTiming" TEXT NOT NULL DEFAULT 'prepaid';
