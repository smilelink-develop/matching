CREATE TABLE "OnboardingFormTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingFormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingFormQuestion" (
  "id" SERIAL NOT NULL,
  "templateId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingFormQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingFormQuestion_templateId_sortOrder_idx"
ON "OnboardingFormQuestion"("templateId", "sortOrder");

ALTER TABLE "OnboardingFormQuestion"
ADD CONSTRAINT "OnboardingFormQuestion_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "OnboardingFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
