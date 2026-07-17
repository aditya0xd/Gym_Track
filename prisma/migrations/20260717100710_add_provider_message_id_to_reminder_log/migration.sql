-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN     "providerMessageId" TEXT;

-- CreateIndex
CREATE INDEX "ReminderLog_providerMessageId_idx" ON "ReminderLog"("providerMessageId");
