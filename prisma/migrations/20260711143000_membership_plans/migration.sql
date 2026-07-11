-- CreateTable
CREATE TABLE "GymMembershipPlan" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMembershipPlanBenefit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymMembershipPlanBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMembershipPlanDurationPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "duration" "MemberBillingDuration" NOT NULL,
    "priceInr" DECIMAL(10,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembershipPlanDurationPrice_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "membershipPlanId" TEXT,
ADD COLUMN "membershipPlanName" TEXT;

-- AlterTable
ALTER TABLE "MembershipRenewal" ADD COLUMN "membershipPlanId" TEXT,
ADD COLUMN "membershipPlanName" TEXT;

-- CreateIndex
CREATE INDEX "GymMembershipPlan_adminUserId_deletedAt_idx" ON "GymMembershipPlan"("adminUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "GymMembershipPlan_adminUserId_category_idx" ON "GymMembershipPlan"("adminUserId", "category");

-- CreateIndex
CREATE INDEX "GymMembershipPlanBenefit_planId_deletedAt_idx" ON "GymMembershipPlanBenefit"("planId", "deletedAt");

-- CreateIndex
CREATE INDEX "GymMembershipPlanDurationPrice_planId_deletedAt_idx" ON "GymMembershipPlanDurationPrice"("planId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymMembershipPlanDurationPrice_planId_duration_key" ON "GymMembershipPlanDurationPrice"("planId", "duration");

-- CreateIndex
CREATE INDEX "Member_membershipPlanId_idx" ON "Member"("membershipPlanId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "GymMembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembershipPlan" ADD CONSTRAINT "GymMembershipPlan_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembershipPlanBenefit" ADD CONSTRAINT "GymMembershipPlanBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymMembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembershipPlanDurationPrice" ADD CONSTRAINT "GymMembershipPlanDurationPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymMembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy duration prices into a "Standard" plan per owner
INSERT INTO "GymMembershipPlan" ("id", "adminUserId", "name", "category", "description", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "adminUserId",
    'Standard',
    NULL,
    'Migrated from legacy duration pricing',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "GymOwnerDurationPrice"
WHERE "deletedAt" IS NULL
GROUP BY "adminUserId";

INSERT INTO "GymMembershipPlanDurationPrice" ("id", "planId", "duration", "priceInr", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    dp."duration",
    dp."priceInr",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "GymOwnerDurationPrice" dp
JOIN "GymMembershipPlan" p
  ON p."adminUserId" = dp."adminUserId"
 AND p."name" = 'Standard'
 AND p."deletedAt" IS NULL
WHERE dp."deletedAt" IS NULL;

INSERT INTO "GymMembershipPlanBenefit" ("id", "planId", "label", "sortOrder", "createdAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    'Full gym access',
    0,
    CURRENT_TIMESTAMP
FROM "GymMembershipPlan" p
WHERE p."name" = 'Standard' AND p."deletedAt" IS NULL;

-- Backfill existing members with Standard plan snapshot
UPDATE "Member" m
SET
    "membershipPlanId" = p."id",
    "membershipPlanName" = p."name"
FROM "GymMembershipPlan" p
WHERE p."adminUserId" = m."adminUserId"
  AND p."name" = 'Standard'
  AND p."deletedAt" IS NULL
  AND m."membershipPlanId" IS NULL;

UPDATE "MembershipRenewal" r
SET
    "membershipPlanId" = m."membershipPlanId",
    "membershipPlanName" = m."membershipPlanName"
FROM "Member" m
WHERE m."id" = r."memberId"
  AND r."membershipPlanId" IS NULL
  AND m."membershipPlanId" IS NOT NULL;
