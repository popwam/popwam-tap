-- Phase G additive activation hardening.
-- Created locally only. Do not apply without an explicit deployment runbook.

CREATE TYPE "ActivationSecretState" AS ENUM (
  'LEGACY',
  'SCRATCH_READY',
  'LOCKED',
  'CONSUMED',
  'REISSUE_REQUIRED'
);

ALTER TABLE "Destination"
  ADD COLUMN "publicShareKey" TEXT;

CREATE UNIQUE INDEX "Destination_publicShareKey_key"
  ON "Destination"("publicShareKey");

ALTER TABLE "Card"
  ADD COLUMN "activationSecretHash" TEXT,
  ADD COLUMN "activationSecretState" "ActivationSecretState" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "activationSecretVersion" INTEGER,
  ADD COLUMN "activationSecretConsumedAt" TIMESTAMP(3),
  ADD COLUMN "activationAttemptWindowAt" TIMESTAMP(3),
  ADD COLUMN "activationFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "activationLockoutUntil" TIMESTAMP(3);

ALTER TABLE "ActivationAttempt"
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "contextFingerprintHash" TEXT,
  ADD COLUMN "networkFingerprintHash" TEXT,
  ADD COLUMN "method" TEXT,
  ADD COLUMN "failureClass" TEXT;

CREATE INDEX "ActivationAttempt_actorId_createdAt_idx"
  ON "ActivationAttempt"("actorId", "createdAt");

CREATE INDEX "ActivationAttempt_contextFingerprintHash_createdAt_idx"
  ON "ActivationAttempt"("contextFingerprintHash", "createdAt");

CREATE INDEX "ActivationAttempt_networkFingerprintHash_createdAt_idx"
  ON "ActivationAttempt"("networkFingerprintHash", "createdAt");

ALTER TABLE "ProducedTag"
  ADD COLUMN "scratchSecretExportCiphertext" TEXT,
  ADD COLUMN "scratchSecretExportedAt" TIMESTAMP(3),
  ADD COLUMN "activationSecretVersion" INTEGER;
