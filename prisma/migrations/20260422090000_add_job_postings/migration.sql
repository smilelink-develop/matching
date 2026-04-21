CREATE TABLE IF NOT EXISTS "JobPostingTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "templateUrl" TEXT NOT NULL,
  "driveFolderUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobPostingTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JobPosting" (
  "id" SERIAL NOT NULL,
  "dealId" INTEGER NOT NULL,
  "templateId" INTEGER,
  "title" TEXT NOT NULL,
  "documentId" TEXT,
  "documentUrl" TEXT,
  "driveFolderUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "jobDescription" TEXT,
  "workLocation" TEXT,
  "nearestStation" TEXT,
  "headcount" TEXT,
  "gender" TEXT,
  "nationality" TEXT,
  "workTime1Start" TEXT,
  "workTime1End" TEXT,
  "workTime2Start" TEXT,
  "workTime2End" TEXT,
  "overtime" TEXT,
  "avgMonthlyOvertime" TEXT,
  "fixedOvertimeHours" TEXT,
  "fixedOvertimePay" TEXT,
  "monthlyGross" TEXT,
  "basicSalary" TEXT,
  "salaryCalcMethod" TEXT,
  "perfectAttendance" TEXT,
  "housingAllowance" TEXT,
  "nightShiftAllowance" TEXT,
  "commuteAllowance" TEXT,
  "socialInsurance" TEXT,
  "employmentInsurance" TEXT,
  "healthInsurance" TEXT,
  "pensionInsurance" TEXT,
  "incomeTax" TEXT,
  "residentTax" TEXT,
  "mealProvision" TEXT,
  "mealAmount" TEXT,
  "dormProvision" TEXT,
  "dormAmount" TEXT,
  "utilitiesProvision" TEXT,
  "utilitiesAmount" TEXT,
  "holidays" TEXT,
  "otherBenefits" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobPosting_dealId_idx" ON "JobPosting"("dealId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobPosting_dealId_fkey') THEN
    ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobPosting_templateId_fkey') THEN
    ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "JobPostingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
