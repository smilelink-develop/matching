ALTER TABLE "Deal"
ADD COLUMN "unitPrice" TEXT,
ADD COLUMN "deadline" TIMESTAMP(3);

UPDATE "Deal"
SET "status" = CASE
  WHEN "priority" = 'urgent' THEN '至急募集'
  ELSE '募集中'
END
WHERE "status" = 'active';

UPDATE "Deal"
SET "status" = '成約'
WHERE "status" = 'closed';

UPDATE "Deal"
SET "status" = '面接中'
WHERE "status" = 'paused';
