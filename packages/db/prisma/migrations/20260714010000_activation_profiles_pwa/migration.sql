-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('PERSONAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'ACTIVATION');

-- CreateEnum
CREATE TYPE "OtpDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActivationClaimStatus" AS ENUM ('PENDING_OTP', 'VERIFIED', 'CONSUMED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProfileTheme" ADD VALUE 'BUSINESS_DARK';
ALTER TYPE "ProfileTheme" ADD VALUE 'BUSINESS_LIGHT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "addressAr" TEXT,
ADD COLUMN     "addressEn" TEXT,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "bioAr" TEXT,
ADD COLUMN     "bioEn" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "contactNotesAr" TEXT,
ADD COLUMN     "contactNotesEn" TEXT,
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "displayNameAr" TEXT,
ADD COLUMN     "displayNameEn" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "industryAr" TEXT,
ADD COLUMN     "industryEn" TEXT,
ADD COLUMN     "jobTitleAr" TEXT,
ADD COLUMN     "jobTitleEn" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "logoStorageKey" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "organizationNameAr" TEXT,
ADD COLUMN     "organizationNameEn" TEXT,
ADD COLUMN     "primaryLanguage" TEXT NOT NULL DEFAULT 'ar',
ADD COLUMN     "type" "ProfileType" NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE "ProfileField" ADD COLUMN     "labelAr" TEXT,
ADD COLUMN     "labelEn" TEXT;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "displayTitleAr" TEXT,
ADD COLUMN     "displayTitleEn" TEXT,
ADD COLUMN     "originalName" TEXT;

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "titleAr" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "activationTokenConsumedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProfileService" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "url" TEXT,
    "iconKey" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileBranch" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT,
    "addressAr" TEXT,
    "addressEn" TEXT,
    "phone" TEXT,
    "mapUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationClaimSession" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "activationTokenHash" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT,
    "status" "ActivationClaimStatus" NOT NULL DEFAULT 'PENDING_OTP',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationClaimSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationAttempt" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "claimSessionId" TEXT,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "deliveryStatus" "OtpDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpSendLog" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "status" "OtpDeliveryStatus" NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileService_profileId_isVisible_sortOrder_idx" ON "ProfileService"("profileId", "isVisible", "sortOrder");

-- CreateIndex
CREATE INDEX "ProfileBranch_profileId_isVisible_sortOrder_idx" ON "ProfileBranch"("profileId", "isVisible", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationClaimSession_sessionTokenHash_key" ON "ActivationClaimSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "ActivationClaimSession_cardId_status_idx" ON "ActivationClaimSession"("cardId", "status");

-- CreateIndex
CREATE INDEX "ActivationClaimSession_expiresAt_idx" ON "ActivationClaimSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ActivationAttempt_cardId_createdAt_idx" ON "ActivationAttempt"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_claimSessionId_idx" ON "OtpChallenge"("claimSessionId");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpSendLog_phoneHash_createdAt_idx" ON "OtpSendLog"("phoneHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthTicket_tokenHash_key" ON "AuthTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthTicket_userId_expiresAt_idx" ON "AuthTicket"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "ProfileService" ADD CONSTRAINT "ProfileService_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileBranch" ADD CONSTRAINT "ProfileBranch_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationClaimSession" ADD CONSTRAINT "ActivationClaimSession_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationClaimSession" ADD CONSTRAINT "ActivationClaimSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationAttempt" ADD CONSTRAINT "ActivationAttempt_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_claimSessionId_fkey" FOREIGN KEY ("claimSessionId") REFERENCES "ActivationClaimSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthTicket" ADD CONSTRAINT "AuthTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve all Phase 1 content while making it immediately available to both locales.
UPDATE "Profile" SET
  "displayNameAr" = CASE WHEN "primaryLanguage" = 'ar' THEN "displayName" ELSE NULL END,
  "displayNameEn" = CASE WHEN "primaryLanguage" = 'en' THEN "displayName" ELSE NULL END,
  "jobTitleAr" = CASE WHEN "primaryLanguage" = 'ar' THEN "title" ELSE NULL END,
  "jobTitleEn" = CASE WHEN "primaryLanguage" = 'en' THEN "title" ELSE NULL END,
  "bioAr" = CASE WHEN "primaryLanguage" = 'ar' THEN "bio" ELSE NULL END,
  "bioEn" = CASE WHEN "primaryLanguage" = 'en' THEN "bio" ELSE NULL END,
  "addressAr" = CASE WHEN "primaryLanguage" = 'ar' THEN "locationText" ELSE NULL END,
  "addressEn" = CASE WHEN "primaryLanguage" = 'en' THEN "locationText" ELSE NULL END;

UPDATE "ProfileField" SET "labelAr" = "label";
UPDATE "Destination" SET "titleAr" = "title";
UPDATE "UploadedFile" SET "originalName" = "originalFilename", "displayTitleAr" = "title";
