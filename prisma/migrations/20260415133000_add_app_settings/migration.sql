CREATE TABLE "AppSettings" (
  "id" INTEGER NOT NULL,
  "calendarEmbedUrl" TEXT,
  "calendarLabel" TEXT,
  "fixedQuestions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
