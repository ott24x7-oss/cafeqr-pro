-- Capture a structured delivery address on each Order. Required when
-- type='DELIVERY' (enforced in the API), nullable for dine-in / takeaway.
ALTER TABLE "Order" ADD COLUMN "customerAddress" TEXT;
