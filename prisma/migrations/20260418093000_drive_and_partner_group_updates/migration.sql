-- Drop existing partner group member rows because the membership target changes
DELETE FROM "GroupMember";

-- DropForeignKey (personId fkey)
ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_personId_fkey";

-- Drop the unique constraint that also drops the index
ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_groupId_personId_key";

-- Safety net: drop the index directly if it still exists (no constraint depending on it)
DROP INDEX IF EXISTS "GroupMember_groupId_personId_key";

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "field" TEXT;

-- AlterTable: swap personId for partnerId
ALTER TABLE "GroupMember" DROP COLUMN IF EXISTS "personId";
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "partnerId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "linkStatus" TEXT NOT NULL DEFAULT '未';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "driveFolderUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_groupId_partnerId_key" ON "GroupMember"("groupId", "partnerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GroupMember_partnerId_fkey'
  ) THEN
    ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
