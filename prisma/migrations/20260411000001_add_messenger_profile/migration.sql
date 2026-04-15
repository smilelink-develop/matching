-- CreateTable
CREATE TABLE "MessengerProfile" (
    "id" SERIAL NOT NULL,
    "psid" TEXT NOT NULL,
    "lastMessageText" TEXT,
    "lastWebhookType" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessengerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessengerProfile_psid_key" ON "MessengerProfile"("psid");
