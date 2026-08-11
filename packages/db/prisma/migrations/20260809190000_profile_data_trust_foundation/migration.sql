-- Additive profile-data and trust foundation. Existing profile and publication
-- rows remain untouched; no verification state is inferred or backfilled.
CREATE TYPE "ProfileVerificationKind" AS ENUM (
  'IDENTITY', 'BUSINESS', 'PROFESSIONAL', 'MEDICAL', 'CONTACT', 'DOMAIN'
);

CREATE TYPE "ProfileVerificationStatus" AS ENUM (
  'NOT_STARTED', 'REQUIRED', 'IN_PROGRESS', 'PENDING', 'VERIFIED',
  'REJECTED', 'NEEDS_UPDATE', 'EXPIRED'
);

CREATE TYPE "ProfileVerificationAuthority" AS ENUM ('SYSTEM', 'ADMIN', 'PROVIDER');

-- Canonical revisions must retain public identity values that already exist on
-- Profile instead of reading mutable draft scalars after publication.
ALTER TABLE "ProfileRevision"
  ADD COLUMN "profession" "ProfessionType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "customProfession" TEXT,
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "categorySlug" TEXT;

UPDATE "ProfileRevision" AS revision
SET "profession" = profile."profession",
    "customProfession" = profile."customProfession",
    "firstName" = profile."firstName",
    "lastName" = profile."lastName"
FROM "Profile" AS profile
WHERE revision."profileId" = profile."id";

UPDATE "ProfileRevision" AS revision
SET "categorySlug" = category."slug"
FROM "Profile" AS profile
LEFT JOIN "ProfileCategory" AS category ON category."id" = profile."categoryId"
WHERE revision."profileId" = profile."id";

CREATE TABLE "ProfileSectionEntry" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "moduleDefinitionId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "instanceKey" TEXT NOT NULL DEFAULT 'default',
  "value" JSONB NOT NULL,
  "visibility" "ProfileModuleVisibility" NOT NULL DEFAULT 'ONLY_ME',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileSectionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileRevisionSectionEntry" (
  "id" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "instanceKey" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "visibility" "ProfileModuleVisibility" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProfileRevisionSectionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileVerificationCase" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" "ProfileVerificationKind" NOT NULL,
  "status" "ProfileVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "authority" "ProfileVerificationAuthority" NOT NULL DEFAULT 'SYSTEM',
  "provider" TEXT,
  "reasonCode" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileVerificationCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileSectionEntry_profileId_fieldKey_instanceKey_key"
  ON "ProfileSectionEntry"("profileId", "fieldKey", "instanceKey");
CREATE INDEX "ProfileSectionEntry_profileId_moduleDefinitionId_visibility_sortOrder_idx"
  ON "ProfileSectionEntry"("profileId", "moduleDefinitionId", "visibility", "sortOrder");
CREATE UNIQUE INDEX "ProfileRevisionSectionEntry_revisionId_sourceId_key"
  ON "ProfileRevisionSectionEntry"("revisionId", "sourceId");
CREATE INDEX "ProfileRevisionSectionEntry_revisionId_moduleKey_visibility_sortOrder_idx"
  ON "ProfileRevisionSectionEntry"("revisionId", "moduleKey", "visibility", "sortOrder");
CREATE UNIQUE INDEX "ProfileVerificationCase_profileId_kind_key"
  ON "ProfileVerificationCase"("profileId", "kind");
CREATE INDEX "ProfileVerificationCase_profileId_status_kind_idx"
  ON "ProfileVerificationCase"("profileId", "status", "kind");
CREATE INDEX "ProfileVerificationCase_status_expiresAt_idx"
  ON "ProfileVerificationCase"("status", "expiresAt");

ALTER TABLE "ProfileSectionEntry"
  ADD CONSTRAINT "ProfileSectionEntry_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileSectionEntry"
  ADD CONSTRAINT "ProfileSectionEntry_moduleDefinitionId_fkey"
  FOREIGN KEY ("moduleDefinitionId") REFERENCES "ProfileModuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionSectionEntry"
  ADD CONSTRAINT "ProfileRevisionSectionEntry_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileVerificationCase"
  ADD CONSTRAINT "ProfileVerificationCase_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
