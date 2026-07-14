-- Phase 3 Android mobile authentication and NFC lifecycle support.
ALTER TYPE "SystemRole" ADD VALUE 'STAFF';

ALTER TABLE "Card" ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE TABLE "MobileRefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileRefreshToken_tokenHash_key" ON "MobileRefreshToken"("tokenHash");
CREATE INDEX "MobileRefreshToken_userId_revokedAt_idx" ON "MobileRefreshToken"("userId", "revokedAt");
CREATE INDEX "MobileRefreshToken_familyId_idx" ON "MobileRefreshToken"("familyId");
CREATE INDEX "MobileRefreshToken_expiresAt_idx" ON "MobileRefreshToken"("expiresAt");

ALTER TABLE "MobileRefreshToken" ADD CONSTRAINT "MobileRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
