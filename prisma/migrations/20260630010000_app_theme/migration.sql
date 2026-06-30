-- Customer-app colour theme selector (coffee | maroon | midnight | forest | latte).
ALTER TABLE "CafeSettings" ADD COLUMN "appTheme" TEXT NOT NULL DEFAULT 'coffee';
