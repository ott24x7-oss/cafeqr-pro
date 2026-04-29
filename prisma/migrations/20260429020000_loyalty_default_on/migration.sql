-- Default loyalty to ON for new cafes AND for existing rows that were
-- still on the old `false` default. This is safe because the loyalty
-- programme was just shipped — no existing cafe has had a chance to
-- intentionally turn it off, so flipping any false rows to true is a
-- sensible "make the feature visible" move rather than overriding
-- explicit user intent.

ALTER TABLE "CafeSettings" ALTER COLUMN "loyaltyEnabled" SET DEFAULT true;

UPDATE "CafeSettings" SET "loyaltyEnabled" = true WHERE "loyaltyEnabled" = false;
