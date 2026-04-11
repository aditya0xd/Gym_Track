-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Member" ADD COLUMN "pausedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Member_adminUserId_membershipStatus_idx" ON "Member"("adminUserId", "membershipStatus");
