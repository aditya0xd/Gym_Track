-- CreateTable
CREATE TABLE "MembershipRenewal" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "billingDuration" "MemberBillingDuration" NOT NULL,
    "planPrice" DECIMAL(10,2) NOT NULL,
    "discountInr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_DONE',
    "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "upiScreenshot" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipRenewal_memberId_createdAt_idx" ON "MembershipRenewal"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipRenewal" ADD CONSTRAINT "MembershipRenewal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
