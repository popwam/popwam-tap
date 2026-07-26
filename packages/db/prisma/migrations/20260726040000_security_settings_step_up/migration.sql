-- Phase H is additive. Existing authentication credentials and rows remain valid.
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'STEP_UP';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'CHANGE_PHONE';
ALTER TYPE "PasskeyChallengeType" ADD VALUE IF NOT EXISTS 'STEP_UP';

CREATE TYPE "UserThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');
CREATE TYPE "UserLanguagePreference" AS ENUM ('SYSTEM', 'ENGLISH', 'ARABIC');
CREATE TYPE "UserFontPreference" AS ENUM ('DEFAULT', 'CAIRO', 'ABEEZEE');
CREATE TYPE "LogicalDeviceType" AS ENUM ('WEB_BROWSER', 'MOBILE_APP');
CREATE TYPE "SessionAuthMethod" AS ENUM ('OTP', 'PASSKEY', 'PASSWORD', 'LEGACY');
CREATE TYPE "StepUpPurpose" AS ENUM (
  'CHANGE_PHONE',
  'DELETE_ACCOUNT',
  'ADD_PASSKEY',
  'REMOVE_PASSKEY',
  'REVOKE_SESSION',
  'REVOKE_OTHER_SESSIONS',
  'PRODUCT_LOST',
  'PRODUCT_TRANSFER',
  'SECURITY_SETTINGS',
  'LINK_DEVICE_APPROVAL'
);
CREATE TYPE "StepUpMethod" AS ENUM ('PASSKEY', 'OTP');
CREATE TYPE "AccountDeletionRequestStatus" AS ENUM ('REQUESTED', 'REVIEWING', 'CANCELLED', 'COMPLETED');

ALTER TABLE "User"
  ADD COLUMN "sessionsRevokedBefore" TIMESTAMP(3);

ALTER TABLE "Session"
  ADD COLUMN "deviceSessionId" TEXT,
  ADD COLUMN "authMethod" "SessionAuthMethod" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastAuthenticatedAt" TIMESTAMP(3);

ALTER TABLE "MobileRefreshToken"
  ADD COLUMN "deviceSessionId" TEXT;

ALTER TABLE "AuthTicket"
  ADD COLUMN "authMethod" "SessionAuthMethod" NOT NULL DEFAULT 'OTP';

ALTER TABLE "PasskeyCredential"
  ADD COLUMN "deviceSessionId" TEXT;

ALTER TABLE "PasskeyChallenge"
  ADD COLUMN "stepUpPurpose" "StepUpPurpose",
  ADD COLUMN "sessionBindingHash" TEXT;

ALTER TABLE "DevicePushToken"
  ADD COLUMN "deviceSessionId" TEXT;

ALTER TABLE "OtpChallenge"
  ADD COLUMN "securityUserId" TEXT,
  ADD COLUMN "stepUpPurpose" "StepUpPurpose",
  ADD COLUMN "sessionBindingHash" TEXT;

ALTER TABLE "DeviceSession"
  ADD COLUMN "deviceType" "LogicalDeviceType" NOT NULL DEFAULT 'MOBILE_APP',
  ADD COLUMN "userLabel" TEXT,
  ADD COLUMN "browserName" TEXT,
  ADD COLUMN "appName" TEXT,
  ADD COLUMN "authMethod" "SessionAuthMethod" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "lastAuthenticatedAt" TIMESTAMP(3);

CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "theme" "UserThemePreference" NOT NULL DEFAULT 'SYSTEM',
  "language" "UserLanguagePreference" NOT NULL DEFAULT 'SYSTEM',
  "font" "UserFontPreference" NOT NULL DEFAULT 'DEFAULT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "generalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "securityEnabled" BOOLEAN NOT NULL DEFAULT true,
  "productsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StepUpGrant" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceSessionId" TEXT,
  "webSessionId" TEXT,
  "purpose" "StepUpPurpose" NOT NULL,
  "method" "StepUpMethod" NOT NULL,
  "assuranceLevel" INTEGER NOT NULL DEFAULT 2,
  "sessionBindingHash" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "StepUpGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE UNIQUE INDEX "StepUpGrant_tokenHash_key" ON "StepUpGrant"("tokenHash");

CREATE INDEX "Session_userId_expires_idx" ON "Session"("userId", "expires");
CREATE INDEX "Session_deviceSessionId_expires_idx" ON "Session"("deviceSessionId", "expires");
CREATE INDEX "MobileRefreshToken_deviceSessionId_revokedAt_idx" ON "MobileRefreshToken"("deviceSessionId", "revokedAt");
CREATE INDEX "PasskeyCredential_deviceSessionId_revokedAt_idx" ON "PasskeyCredential"("deviceSessionId", "revokedAt");
CREATE INDEX "PasskeyChallenge_userId_stepUpPurpose_expiresAt_idx" ON "PasskeyChallenge"("userId", "stepUpPurpose", "expiresAt");
CREATE INDEX "DevicePushToken_deviceSessionId_revokedAt_idx" ON "DevicePushToken"("deviceSessionId", "revokedAt");
CREATE INDEX "OtpChallenge_securityUserId_purpose_expiresAt_idx" ON "OtpChallenge"("securityUserId", "purpose", "expiresAt");
CREATE INDEX "DeviceSession_userId_deviceType_revokedAt_idx" ON "DeviceSession"("userId", "deviceType", "revokedAt");
CREATE INDEX "StepUpGrant_userId_purpose_expiresAt_idx" ON "StepUpGrant"("userId", "purpose", "expiresAt");
CREATE INDEX "StepUpGrant_deviceSessionId_expiresAt_idx" ON "StepUpGrant"("deviceSessionId", "expiresAt");
CREATE INDEX "StepUpGrant_webSessionId_expiresAt_idx" ON "StepUpGrant"("webSessionId", "expiresAt");
CREATE INDEX "AccountDeletionRequest_userId_status_requestedAt_idx" ON "AccountDeletionRequest"("userId", "status", "requestedAt");

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_deviceSessionId_fkey"
  FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MobileRefreshToken"
  ADD CONSTRAINT "MobileRefreshToken_deviceSessionId_fkey"
  FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PasskeyCredential"
  ADD CONSTRAINT "PasskeyCredential_deviceSessionId_fkey"
  FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DevicePushToken"
  ADD CONSTRAINT "DevicePushToken_deviceSessionId_fkey"
  FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPreference"
  ADD CONSTRAINT "UserPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StepUpGrant"
  ADD CONSTRAINT "StepUpGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StepUpGrant"
  ADD CONSTRAINT "StepUpGrant_deviceSessionId_fkey"
  FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StepUpGrant"
  ADD CONSTRAINT "StepUpGrant_webSessionId_fkey"
  FOREIGN KEY ("webSessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountDeletionRequest"
  ADD CONSTRAINT "AccountDeletionRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
