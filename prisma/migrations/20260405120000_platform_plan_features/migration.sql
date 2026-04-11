-- CreateEnum
CREATE TYPE "PlanFeatureKey" AS ENUM (
  'ANALYTICS',
  'BULK_IMPORT_EXPORT',
  'SCHEDULED_EXPIRY_REMINDERS',
  'MANUAL_MEMBER_REMINDERS',
  'CUSTOM_MEMBERSHIP_PRICING'
);

-- CreateTable
CREATE TABLE "PlatformPlanFeature" (
  "id" TEXT NOT NULL,
  "plan" "OwnerSubscriptionPlan" NOT NULL,
  "featureKey" "PlanFeatureKey" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformPlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPlanFeature_plan_featureKey_key" ON "PlatformPlanFeature"("plan", "featureKey");

-- CreateIndex
CREATE INDEX "PlatformPlanFeature_plan_idx" ON "PlatformPlanFeature"("plan");
