-- AlterTable: add persisted totals with safe backfill for existing rows
ALTER TABLE "Order"
  ADD COLUMN "shippingFeeInCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "taxInCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalInCents" INTEGER;

-- Backfill existing rows using subtotal + defaults
UPDATE "Order"
SET "totalInCents" = "subtotalInCents" + "shippingFeeInCents" + "taxInCents"
WHERE "totalInCents" IS NULL;

-- Enforce required total column
ALTER TABLE "Order"
  ALTER COLUMN "totalInCents" SET NOT NULL;
