-- Company に externalId と driveFolderUrl を追加
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "driveFolderUrl" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Company_externalId_key" ON "Company"("externalId");

-- ResumeTemplate.driveFolderUrl を nullable に
ALTER TABLE "ResumeTemplate" ALTER COLUMN "driveFolderUrl" DROP NOT NULL;
