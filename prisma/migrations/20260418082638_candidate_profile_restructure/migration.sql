-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "status" SET DEFAULT '募集中';

-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "partnerId" INTEGER,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ResumeProfile" ADD COLUMN     "highSchoolEndDate" TEXT,
ADD COLUMN     "highSchoolName" TEXT,
ADD COLUMN     "highSchoolStartDate" TEXT,
ADD COLUMN     "japaneseLevel" TEXT,
ADD COLUMN     "japaneseLevelDate" TEXT,
ADD COLUMN     "licenseExpiryDate" TEXT,
ADD COLUMN     "licenseName" TEXT,
ADD COLUMN     "otherQualificationExpiryDate" TEXT,
ADD COLUMN     "otherQualificationName" TEXT,
ADD COLUMN     "traineeExperience" TEXT,
ADD COLUMN     "universityEndDate" TEXT,
ADD COLUMN     "universityName" TEXT,
ADD COLUMN     "universityStartDate" TEXT;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
