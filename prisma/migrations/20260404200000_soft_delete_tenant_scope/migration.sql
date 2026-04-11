-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GymOwnerDurationPrice" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OwnerBillingInvoice" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AdminUser_deletedAt_idx" ON "AdminUser"("deletedAt");

-- CreateIndex
CREATE INDEX "Member_adminUserId_deletedAt_idx" ON "Member"("adminUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "OwnerBillingInvoice_adminUserId_deletedAt_idx" ON "OwnerBillingInvoice"("adminUserId", "deletedAt");
