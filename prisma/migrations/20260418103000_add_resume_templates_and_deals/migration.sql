CREATE TABLE "ResumeTemplate" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "templateUrl" TEXT NOT NULL,
    "driveFolderUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResumeTemplate"
ADD CONSTRAINT "ResumeTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ResumeDocument" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "documentUrl" TEXT,
    "driveFolderUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResumeDocument"
ADD CONSTRAINT "ResumeDocument_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeDocument"
ADD CONSTRAINT "ResumeDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ResumeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeDocument"
ADD CONSTRAINT "ResumeDocument_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Deal" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "partnerId" INTEGER,
    "ownerId" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "StaffAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DealCandidate" (
    "id" SERIAL NOT NULL,
    "dealId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DealCandidate_dealId_personId_key" ON "DealCandidate"("dealId", "personId");

ALTER TABLE "DealCandidate"
ADD CONSTRAINT "DealCandidate_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealCandidate"
ADD CONSTRAINT "DealCandidate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
