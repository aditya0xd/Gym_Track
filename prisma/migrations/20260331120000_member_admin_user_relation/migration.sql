-- AlterTable
ALTER TABLE "Member" ADD COLUMN "adminUserId" TEXT;

-- When members exist but no admin row yet, create a seed admin so we can satisfy NOT NULL + FK.
-- Password matches GymPass123! (bcrypt). Replace after first login if needed.
INSERT INTO "AdminUser" ("id", "name", "email", "passwordHash", "createdAt", "updatedAt")
SELECT
  '99999999-9999-9999-9999-999999999999',
  'Seed Admin',
  'seed-admin@gym.local',
  '$2b$12$RdjIdI3NGH1r.e/9Oq2naupYNxIaZ808kW3/mjeflM3/q/GxLsm7m',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "Member")
  AND NOT EXISTS (SELECT 1 FROM "AdminUser");

-- Attach existing members to the earliest admin account (typical single-gym migration).
UPDATE "Member" m
SET "adminUserId" = (SELECT id FROM "AdminUser" ORDER BY "createdAt" ASC LIMIT 1)
WHERE m."adminUserId" IS NULL;

ALTER TABLE "Member" ALTER COLUMN "adminUserId" SET NOT NULL;

CREATE INDEX "Member_adminUserId_idx" ON "Member"("adminUserId");

ALTER TABLE "Member" ADD CONSTRAINT "Member_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
