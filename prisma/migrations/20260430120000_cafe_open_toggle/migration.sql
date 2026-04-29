-- Owner-controlled "we're open now" toggle. Independent of the billing
-- CafeStatus enum — a cafe can be ACTIVE on the platform but closed
-- for the night. Default true so newly-onboarded cafes look open to
-- their first customer without any extra setup.

ALTER TABLE "Cafe"
  ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN NOT NULL DEFAULT true;
