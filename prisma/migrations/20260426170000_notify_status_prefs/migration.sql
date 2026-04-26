-- Customer WhatsApp notification preferences (per-status checkboxes).
-- Default switches on order placed, accepted, served and the merged
-- payment+invoice+review message — keeping noise low.

ALTER TABLE "CafeSettings"
  ADD COLUMN "notifyOnStatuses" TEXT[] NOT NULL DEFAULT ARRAY['PLACED','ACCEPTED','SERVED','PAID']::TEXT[];
