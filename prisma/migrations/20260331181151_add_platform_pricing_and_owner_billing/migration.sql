-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "PlatformPlanPrice" (
    "id" TEXT NOT NULL,
    "plan" "OwnerSubscriptionPlan" NOT NULL,
    "priceInr" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerBillingInvoice" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "plan" "OwnerSubscriptionPlan" NOT NULL,
    "amountInr" DECIMAL(10,2) NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerBillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPlanPrice_plan_key" ON "PlatformPlanPrice"("plan");

-- CreateIndex
CREATE INDEX "OwnerBillingInvoice_adminUserId_createdAt_idx" ON "OwnerBillingInvoice"("adminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "OwnerBillingInvoice" ADD CONSTRAINT "OwnerBillingInvoice_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
