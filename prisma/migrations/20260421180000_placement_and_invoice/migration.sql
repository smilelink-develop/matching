-- Deal: new columns
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "requiredCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "recommendedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "interviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "offerCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contractCount" INTEGER NOT NULL DEFAULT 0;

-- PersonPlacement
CREATE TABLE IF NOT EXISTS "PersonPlacement" (
  "id" SERIAL NOT NULL,
  "personId" INTEGER NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "preInterviewAt" TIMESTAMP(3),
  "companyInterviewAt" TIMESTAMP(3),
  "offerAt" TIMESTAMP(3),
  "offerAcceptedAt" TIMESTAMP(3),
  "applicationPlannedAt" TIMESTAMP(3),
  "applicationAt" TIMESTAMP(3),
  "applicationResultAt" TIMESTAMP(3),
  "applicationType" TEXT,
  "applicantName" TEXT,
  "returnHomeFlag" TEXT,
  "returnHomeAt" TIMESTAMP(3),
  "entryPlannedAt" TIMESTAMP(3),
  "entryAt" TIMESTAMP(3),
  "joinPlannedAt" TIMESTAMP(3),
  "joinAt" TIMESTAMP(3),
  "sixMonthStatus" TEXT,
  "consultation" TEXT,
  "currentAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonPlacement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PersonPlacement_personId_key" ON "PersonPlacement"("personId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonPlacement_personId_fkey') THEN
    ALTER TABLE "PersonPlacement" ADD CONSTRAINT "PersonPlacement_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Invoice
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" SERIAL NOT NULL,
  "personId" INTEGER NOT NULL,
  "dealId" INTEGER,
  "unitPrice" TEXT,
  "invoiceDate" TIMESTAMP(3),
  "invoiceAmount" TEXT,
  "invoiceNumber" TEXT,
  "invoiceStatus" TEXT NOT NULL DEFAULT '未送付',
  "invoiceUrl" TEXT,
  "channel" TEXT NOT NULL DEFAULT '自社',
  "partnerId" INTEGER,
  "costAmount" TEXT,
  "paInvoiceUrl" TEXT,
  "paPaid" BOOLEAN NOT NULL DEFAULT false,
  "paPaidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Invoice_personId_idx" ON "Invoice"("personId");
CREATE INDEX IF NOT EXISTS "Invoice_dealId_idx" ON "Invoice"("dealId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_personId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_dealId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_partnerId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
