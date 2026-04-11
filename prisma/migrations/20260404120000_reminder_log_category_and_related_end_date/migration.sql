-- CreateEnum
CREATE TYPE "ReminderCategory" AS ENUM ('MANUAL', 'EXPIRY_ONE_DAY_BEFORE');

-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN "category" "ReminderCategory" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "ReminderLog" ADD COLUMN "relatedEndDate" DATE;

-- CreateIndex
CREATE INDEX "ReminderLog_memberId_category_relatedEndDate_idx" ON "ReminderLog"("memberId", "category", "relatedEndDate");
