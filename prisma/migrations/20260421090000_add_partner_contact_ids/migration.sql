-- Add contact IDs to Partner
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "lineUserId" TEXT;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "messengerPsid" TEXT;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "whatsappId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Partner_lineUserId_key" ON "Partner"("lineUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Partner_messengerPsid_key" ON "Partner"("messengerPsid");
