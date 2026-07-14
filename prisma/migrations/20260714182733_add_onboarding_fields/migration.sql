-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "gymName" TEXT,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;
