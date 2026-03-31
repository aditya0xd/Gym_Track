-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'RAZORPAY');

-- AlterTable
ALTER TABLE "OwnerBillingInvoice"
ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT,
ADD COLUMN "razorpaySignature" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OwnerBillingInvoice_razorpayOrderId_key" ON "OwnerBillingInvoice"("razorpayOrderId");
