-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('DONE', 'NOT_DONE');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "memberPhoto" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_DONE',
ADD COLUMN     "upiScreenshot" TEXT;
