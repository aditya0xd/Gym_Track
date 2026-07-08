-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill existing fully-paid memberships.
UPDATE "Member"
SET "amountPaid" = "planPrice"
WHERE "paymentStatus" = 'DONE';

-- AlterTable
ALTER TABLE "MembershipRenewal" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill existing fully-paid renewals.
UPDATE "MembershipRenewal"
SET "amountPaid" = "planPrice"
WHERE "paymentStatus" = 'DONE';
