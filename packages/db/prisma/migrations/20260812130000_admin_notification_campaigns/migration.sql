CREATE TYPE "AdminNotificationStatus" AS ENUM ('DRAFT', 'PROCESSING', 'SENT', 'PARTIAL', 'SUPPRESSED', 'FAILED');
CREATE TYPE "AdminNotificationAudience" AS ENUM ('USER', 'SELECTED', 'SEGMENT', 'TEST');
CREATE TYPE "AdminNotificationDeliveryStatus" AS ENUM ('SENT', 'SUPPRESSED', 'FAILED');

CREATE TABLE "AdminNotificationCampaign" (
  "id" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" "AdminNotificationStatus" NOT NULL DEFAULT 'DRAFT',
  "audienceType" "AdminNotificationAudience" NOT NULL,
  "audience" JSONB NOT NULL,
  "title" JSONB NOT NULL,
  "body" JSONB NOT NULL,
  "defaultLocale" TEXT NOT NULL DEFAULT 'en',
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "deepLink" TEXT,
  "imageUrl" TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "AdminNotificationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotificationDelivery" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "status" "AdminNotificationDeliveryStatus" NOT NULL,
  "attemptedTokens" INTEGER NOT NULL DEFAULT 0,
  "successfulTokens" INTEGER NOT NULL DEFAULT 0,
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminNotificationCampaign_status_createdAt_idx" ON "AdminNotificationCampaign"("status", "createdAt");
CREATE INDEX "AdminNotificationCampaign_createdById_createdAt_idx" ON "AdminNotificationCampaign"("createdById", "createdAt");
CREATE UNIQUE INDEX "AdminNotificationDelivery_campaignId_recipientUserId_key" ON "AdminNotificationDelivery"("campaignId", "recipientUserId");
CREATE INDEX "AdminNotificationDelivery_recipientUserId_createdAt_idx" ON "AdminNotificationDelivery"("recipientUserId", "createdAt");

ALTER TABLE "AdminNotificationCampaign" ADD CONSTRAINT "AdminNotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminNotificationDelivery" ADD CONSTRAINT "AdminNotificationDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdminNotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminNotificationDelivery" ADD CONSTRAINT "AdminNotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
