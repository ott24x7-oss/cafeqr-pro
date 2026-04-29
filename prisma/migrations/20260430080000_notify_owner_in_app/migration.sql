-- New CafeSettings flag controlling whether the Android companion app
-- polls for new orders and fires a full-screen alert. Default false so
-- existing cafes don't start ringing unexpectedly when a build with the
-- poller installed is in their owner's hands.

ALTER TABLE "CafeSettings"
  ADD COLUMN "notifyOwnerInApp" BOOLEAN NOT NULL DEFAULT false;
