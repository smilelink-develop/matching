-- CreateTable
CREATE TABLE IF NOT EXISTS "PersonCustomQuestion" (
  "id" SERIAL NOT NULL,
  "personId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "answer" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PersonCustomQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PersonCustomQuestion_personId_sortOrder_idx"
  ON "PersonCustomQuestion"("personId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PersonCustomQuestion_personId_fkey'
  ) THEN
    ALTER TABLE "PersonCustomQuestion" ADD CONSTRAINT "PersonCustomQuestion_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
