-- CreateEnum
CREATE TYPE "OwnerSubscriptionPlan" AS ENUM ('TRIAL', 'STARTER', 'PRO');

CREATE TYPE "MemberBillingDuration" AS ENUM ('ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_MONTHS');

-- CreateTable
CREATE TABLE "SuperAdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdminUser_email_key" ON "SuperAdminUser"("email");

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "subscriptionPlan" "OwnerSubscriptionPlan" NOT NULL DEFAULT 'TRIAL';

ALTER TABLE "AdminUser" ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GymOwnerDurationPrice" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "duration" "MemberBillingDuration" NOT NULL,
    "priceInr" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "GymOwnerDurationPrice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GymOwnerDurationPrice_adminUserId_idx" ON "GymOwnerDurationPrice"("adminUserId");

CREATE UNIQUE INDEX "GymOwnerDurationPrice_adminUserId_duration_key" ON "GymOwnerDurationPrice"("adminUserId", "duration");

ALTER TABLE "GymOwnerDurationPrice" ADD CONSTRAINT "GymOwnerDurationPrice_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Member: map legacy plan lengths to new billing durations
ALTER TABLE "Member" ADD COLUMN "billingDuration" "MemberBillingDuration";

UPDATE "Member" SET "billingDuration" = CASE
  WHEN "planType" = 'MONTHLY'::"PlanType" THEN 'ONE_MONTH'::"MemberBillingDuration"
  WHEN "planType" = 'QUARTERLY'::"PlanType" THEN 'THREE_MONTHS'::"MemberBillingDuration"
  WHEN "planType" = 'ANNUAL'::"PlanType" THEN 'TWELVE_MONTHS'::"MemberBillingDuration"
  ELSE 'ONE_MONTH'::"MemberBillingDuration"
END;

ALTER TABLE "Member" ALTER COLUMN "billingDuration" SET NOT NULL;

ALTER TABLE "Member" DROP COLUMN "planType";

DROP TYPE "PlanType";
