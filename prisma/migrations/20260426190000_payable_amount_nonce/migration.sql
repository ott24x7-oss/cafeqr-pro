-- Per-order unique paise nonce so the IMAP matcher can identify the right
-- pending payment from a credit alert by amount alone.

ALTER TABLE "Order"
  ADD COLUMN "payableAmount" DOUBLE PRECISION;
