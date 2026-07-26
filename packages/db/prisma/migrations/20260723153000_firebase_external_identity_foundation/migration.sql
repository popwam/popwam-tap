-- Firebase identities remain external to POP User.id. This additive migration is intentionally not applied by Phase 1.
CREATE TYPE "ExternalIdentityProvider" AS ENUM ('FIREBASE');
CREATE TYPE "ExternalIdentityType" AS ENUM ('ANONYMOUS', 'VERIFIED');
CREATE TYPE "ExternalIdentityStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "ExternalIdentityProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "identityType" "ExternalIdentityType" NOT NULL DEFAULT 'ANONYMOUS',
    "status" "ExternalIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalIdentity_provider_providerSubject_key" ON "ExternalIdentity"("provider", "providerSubject");
CREATE INDEX "ExternalIdentity_userId_provider_status_idx" ON "ExternalIdentity"("userId", "provider", "status");
CREATE INDEX "ExternalIdentity_provider_status_idx" ON "ExternalIdentity"("provider", "status");

ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
