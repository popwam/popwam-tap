-- Phase J Nearby is additive and privacy-defaulted. This migration does not
-- create a presence row or opt any existing/new account into Nearby.

ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'NEARBY_PRIVACY';
ALTER TYPE "FriendRequestSource" ADD VALUE IF NOT EXISTS 'NEARBY';
ALTER TYPE "UserBlockSource" ADD VALUE IF NOT EXISTS 'NEARBY';

DO $$ BEGIN
  CREATE TYPE "UserReportSource" AS ENUM ('FRIENDS', 'PROFILE', 'NEARBY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NearbyPresenceSource" AS ENUM ('WEB', 'ANDROID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NearbyRateLimitKind" AS ENUM ('ENABLE', 'PRESENCE_UPDATE', 'DISCOVERY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "UserLegalConsent"
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

ALTER TABLE "UserReport"
  ADD COLUMN IF NOT EXISTS "source" "UserReportSource" NOT NULL DEFAULT 'FRIENDS';

ALTER TABLE "NearbyPreference"
  ADD COLUMN IF NOT EXISTS "discoverable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "NearbyPreference_enabled_discoverable_updatedAt_idx"
  ON "NearbyPreference"("enabled", "discoverable", "updatedAt");

CREATE TABLE IF NOT EXISTS "NearbyPresence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "coarseCell" TEXT NOT NULL,
  "cellVersion" INTEGER NOT NULL DEFAULT 1,
  "generation" INTEGER NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "source" "NearbyPresenceSource" NOT NULL,
  "cellWindowStartedAt" TIMESTAMP(3) NOT NULL,
  "cellChangesInWindow" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NearbyPresence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NearbyPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NearbyPresence_userId_key"
  ON "NearbyPresence"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "NearbyPresence_sessionHash_key"
  ON "NearbyPresence"("sessionHash");
CREATE INDEX IF NOT EXISTS "NearbyPresence_coarseCell_expiresAt_idx"
  ON "NearbyPresence"("coarseCell", "expiresAt");
CREATE INDEX IF NOT EXISTS "NearbyPresence_expiresAt_idx"
  ON "NearbyPresence"("expiresAt");

CREATE TABLE IF NOT EXISTS "NearbyRateLimitBucket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "NearbyRateLimitKind" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NearbyRateLimitBucket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NearbyRateLimitBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NearbyRateLimitBucket_userId_kind_key"
  ON "NearbyRateLimitBucket"("userId", "kind");
CREATE INDEX IF NOT EXISTS "NearbyRateLimitBucket_kind_windowStart_idx"
  ON "NearbyRateLimitBucket"("kind", "windowStart");
