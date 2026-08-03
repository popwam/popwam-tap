CREATE TYPE "MobileAuthChallengeState" AS ENUM ('OPEN', 'PHONE_VERIFIED', 'CONSUMED', 'REVOKED');
CREATE TYPE "MobileEnrollmentState" AS ENUM ('PASSKEY_REQUIRED', 'BIOMETRIC_REQUIRED', 'READY_FOR_UPGRADE', 'COMPLETED', 'ABORTED');
CREATE TYPE "MobileBiometricPolicy" AS ENUM ('REQUIRED_WHEN_AVAILABLE');
CREATE TYPE "MobileBiometricOutcome" AS ENUM ('ENROLLED', 'UNAVAILABLE');
CREATE TYPE "DeviceCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'INVALIDATED');

CREATE TABLE "MobileAuthChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phoneHash" TEXT NOT NULL,
    "accountState" TEXT NOT NULL,
    "allowedMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredMethod" TEXT NOT NULL,
    "otpLength" INTEGER NOT NULL DEFAULT 6,
    "otpResendAfterSeconds" INTEGER NOT NULL DEFAULT 60,
    "otpExpiresAfterSeconds" INTEGER NOT NULL DEFAULT 300,
    "otpMaximumAttempts" INTEGER NOT NULL DEFAULT 5,
    "biometricPolicy" "MobileBiometricPolicy" NOT NULL DEFAULT 'REQUIRED_WHEN_AVAILABLE',
    "state" "MobileAuthChallengeState" NOT NULL DEFAULT 'OPEN',
    "firebaseSubjectHash" TEXT,
    "deviceChallengeHash" TEXT,
    "deviceChallengeExpiresAt" TIMESTAMP(3),
    "deviceChallengeConsumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MobileAuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileEnrollmentSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "MobileEnrollmentState" NOT NULL DEFAULT 'PASSKEY_REQUIRED',
    "biometricPolicy" "MobileBiometricPolicy" NOT NULL DEFAULT 'REQUIRED_WHEN_AVAILABLE',
    "biometricOutcome" "MobileBiometricOutcome",
    "passkeyCredentialId" TEXT,
    "deviceChallengeHash" TEXT,
    "deviceChallengeExpiresAt" TIMESTAMP(3),
    "deviceChallengeConsumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionKeyHash" TEXT,
    "completedDeviceSessionId" TEXT,
    "completionRetriedAt" TIMESTAMP(3),
    "abortedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MobileEnrollmentSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobileDeviceCredential" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentSessionId" TEXT NOT NULL,
    "deviceSessionId" TEXT,
    "publicKey" BYTEA NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'ES256',
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "biometricType" TEXT NOT NULL,
    "status" "DeviceCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "MobileDeviceCredential_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PasskeyChallenge" ADD COLUMN "enrollmentSessionId" TEXT;

CREATE UNIQUE INDEX "MobileEnrollmentSession_tokenHash_key" ON "MobileEnrollmentSession"("tokenHash");
CREATE UNIQUE INDEX "MobileEnrollmentSession_challengeId_key" ON "MobileEnrollmentSession"("challengeId");
CREATE UNIQUE INDEX "MobileDeviceCredential_credentialId_key" ON "MobileDeviceCredential"("credentialId");
CREATE UNIQUE INDEX "MobileDeviceCredential_enrollmentSessionId_key" ON "MobileDeviceCredential"("enrollmentSessionId");
CREATE UNIQUE INDEX "MobileDeviceCredential_deviceSessionId_key" ON "MobileDeviceCredential"("deviceSessionId");
CREATE INDEX "MobileAuthChallenge_phoneHash_state_expiresAt_idx" ON "MobileAuthChallenge"("phoneHash", "state", "expiresAt");
CREATE INDEX "MobileAuthChallenge_userId_state_expiresAt_idx" ON "MobileAuthChallenge"("userId", "state", "expiresAt");
CREATE INDEX "MobileAuthChallenge_expiresAt_idx" ON "MobileAuthChallenge"("expiresAt");
CREATE INDEX "MobileEnrollmentSession_userId_state_expiresAt_idx" ON "MobileEnrollmentSession"("userId", "state", "expiresAt");
CREATE INDEX "MobileEnrollmentSession_expiresAt_idx" ON "MobileEnrollmentSession"("expiresAt");
CREATE INDEX "MobileDeviceCredential_userId_status_idx" ON "MobileDeviceCredential"("userId", "status");
CREATE INDEX "MobileDeviceCredential_deviceSessionId_status_idx" ON "MobileDeviceCredential"("deviceSessionId", "status");
CREATE INDEX "PasskeyChallenge_enrollmentSessionId_type_expiresAt_idx" ON "PasskeyChallenge"("enrollmentSessionId", "type", "expiresAt");

ALTER TABLE "MobileAuthChallenge" ADD CONSTRAINT "MobileAuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileEnrollmentSession" ADD CONSTRAINT "MobileEnrollmentSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "MobileAuthChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileEnrollmentSession" ADD CONSTRAINT "MobileEnrollmentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileDeviceCredential" ADD CONSTRAINT "MobileDeviceCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileDeviceCredential" ADD CONSTRAINT "MobileDeviceCredential_enrollmentSessionId_fkey" FOREIGN KEY ("enrollmentSessionId") REFERENCES "MobileEnrollmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MobileDeviceCredential" ADD CONSTRAINT "MobileDeviceCredential_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasskeyChallenge" ADD CONSTRAINT "PasskeyChallenge_enrollmentSessionId_fkey" FOREIGN KEY ("enrollmentSessionId") REFERENCES "MobileEnrollmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TYPE "SessionAuthMethod" ADD VALUE IF NOT EXISTS 'DEVICE_CREDENTIAL';
