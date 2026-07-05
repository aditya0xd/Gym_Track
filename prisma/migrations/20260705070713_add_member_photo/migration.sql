-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_adminUserId_fkey";

-- DropForeignKey
ALTER TABLE "ReminderLog" DROP CONSTRAINT "ReminderLog_memberId_fkey";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "profilePhoto" TEXT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
