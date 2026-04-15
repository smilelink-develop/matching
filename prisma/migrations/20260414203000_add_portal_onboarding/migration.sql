CREATE TABLE "PersonOnboarding" (
  "id" SERIAL NOT NULL,
  "personId" INTEGER NOT NULL,
  "fullNameKana" TEXT,
  "birthDate" TEXT,
  "phoneNumber" TEXT,
  "postalCode" TEXT,
  "address" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "emergencyRelationship" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PersonOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortalDocument" (
  "id" SERIAL NOT NULL,
  "personId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT,
  "autoJudgeStatus" TEXT NOT NULL DEFAULT 'pending',
  "autoJudgeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PortalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonOnboarding_personId_key" ON "PersonOnboarding"("personId");
CREATE UNIQUE INDEX "PortalDocument_personId_kind_key" ON "PortalDocument"("personId", "kind");

ALTER TABLE "PersonOnboarding"
ADD CONSTRAINT "PersonOnboarding_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalDocument"
ADD CONSTRAINT "PortalDocument_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
