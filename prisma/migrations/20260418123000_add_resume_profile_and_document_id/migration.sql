ALTER TABLE "ResumeDocument"
ADD COLUMN "documentId" TEXT;

CREATE TABLE "ResumeProfile" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "gender" TEXT,
    "country" TEXT,
    "spouseStatus" TEXT,
    "childrenCount" TEXT,
    "phoneHome" TEXT,
    "visaType" TEXT,
    "visaExpiryDate" TEXT,
    "workVisa" TEXT,
    "remarks" TEXT,
    "educations" JSONB,
    "workExperiences" JSONB,
    "certifications" JSONB,
    "motivation" TEXT,
    "selfIntroduction" TEXT,
    "japanPurpose" TEXT,
    "currentJob" TEXT,
    "retirementReason" TEXT,
    "preferenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResumeProfile_personId_key" ON "ResumeProfile"("personId");

ALTER TABLE "ResumeProfile"
ADD CONSTRAINT "ResumeProfile_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
