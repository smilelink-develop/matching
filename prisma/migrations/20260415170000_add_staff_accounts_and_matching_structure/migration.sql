CREATE TABLE "StaffAccount" (
    "id" SERIAL NOT NULL,
    "loginId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "passcodeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffAccount_loginId_key" ON "StaffAccount"("loginId");

CREATE TABLE "StaffSession" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "impersonatedById" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffSession_token_key" ON "StaffSession"("token");

ALTER TABLE "StaffSession"
ADD CONSTRAINT "StaffSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "OnboardingFormQuestion";
DROP TABLE IF EXISTS "OnboardingFormTemplate";
DROP TABLE IF EXISTS "AppSettings";
DROP TABLE IF EXISTS "MessageTemplate";

CREATE TABLE "AppSettings" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "calendarEmbedUrl" TEXT,
    "calendarLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSettings_accountId_key" ON "AppSettings"("accountId");

ALTER TABLE "AppSettings"
ADD CONSTRAINT "AppSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CoreSettings" (
    "id" INTEGER NOT NULL,
    "fixedQuestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageTemplate" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MessageTemplate"
ADD CONSTRAINT "MessageTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OnboardingFormTemplate" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingFormTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OnboardingFormTemplate"
ADD CONSTRAINT "OnboardingFormTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OnboardingFormQuestion" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "fixedKey" TEXT,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingFormQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingFormQuestion_templateId_sortOrder_idx" ON "OnboardingFormQuestion"("templateId", "sortOrder");

ALTER TABLE "OnboardingFormQuestion"
ADD CONSTRAINT "OnboardingFormQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
