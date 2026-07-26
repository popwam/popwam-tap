-- Phase E publishing foundation. This migration is additive and is intentionally
-- not applied by the local implementation workflow.
CREATE TYPE "ProfileAccess" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
CREATE TYPE "ProfileRevisionStatus" AS ENUM ('PUBLISHED', 'SUPERSEDED');
CREATE TYPE "ProfileMediaState" AS ENUM ('TEMPORARY', 'DRAFT_ATTACHED', 'PUBLISHED', 'ORPHANED', 'DELETED');
CREATE TYPE "ProfileMediaPurpose" AS ENUM ('AVATAR', 'COVER', 'LOGO', 'GALLERY', 'ONBOARDING_IMAGE');

ALTER TABLE "Profile"
  ADD COLUMN "access" "ProfileAccess" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "draftRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "draftSlug" TEXT;

CREATE TABLE "ProfileRevision" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "sourceDraftRevision" INTEGER NOT NULL,
  "draftFingerprint" TEXT NOT NULL,
  "status" "ProfileRevisionStatus" NOT NULL DEFAULT 'PUBLISHED',
  "access" "ProfileAccess" NOT NULL,
  "slug" TEXT,
  "displayName" TEXT NOT NULL,
  "displayLabel" TEXT,
  "type" "ProfileType" NOT NULL,
  "profileKind" "ProfileKind",
  "primaryLanguage" TEXT NOT NULL,
  "displayNameAr" TEXT,
  "displayNameEn" TEXT,
  "title" TEXT,
  "jobTitleAr" TEXT,
  "jobTitleEn" TEXT,
  "company" TEXT,
  "bio" TEXT,
  "bioAr" TEXT,
  "bioEn" TEXT,
  "organizationNameAr" TEXT,
  "organizationNameEn" TEXT,
  "industryAr" TEXT,
  "industryEn" TEXT,
  "descriptionAr" TEXT,
  "descriptionEn" TEXT,
  "avatarUrl" TEXT,
  "coverUrl" TEXT,
  "logoUrl" TEXT,
  "phone" TEXT,
  "alternatePhone" TEXT,
  "whatsappBusiness" TEXT,
  "whatsappPrivate" TEXT,
  "email" TEXT,
  "website" TEXT,
  "facebook" TEXT,
  "linkedin" TEXT,
  "github" TEXT,
  "tiktok" TEXT,
  "vcfUrl" TEXT,
  "locationText" TEXT,
  "addressAr" TEXT,
  "addressEn" TEXT,
  "contactNotesAr" TEXT,
  "contactNotesEn" TEXT,
  "theme" "ProfileTheme" NOT NULL,
  "showAvatar" BOOLEAN NOT NULL,
  "showCover" BOOLEAN NOT NULL,
  "showDisplayName" BOOLEAN NOT NULL,
  "showTitle" BOOLEAN NOT NULL,
  "showBio" BOOLEAN NOT NULL,
  "showPhone" BOOLEAN NOT NULL,
  "showEmail" BOOLEAN NOT NULL,
  "showWebsite" BOOLEAN NOT NULL,
  "showLocation" BOOLEAN NOT NULL,
  "showWhatsappBusiness" BOOLEAN NOT NULL,
  "showWhatsappPrivate" BOOLEAN NOT NULL,
  "showSocialLinks" BOOLEAN NOT NULL,
  "showCustomFields" BOOLEAN NOT NULL,
  "showUploadedFiles" BOOLEAN NOT NULL,
  "showSaveContact" BOOLEAN NOT NULL,
  "allowInstallable" BOOLEAN NOT NULL,
  "templateSlug" TEXT,
  "templateConfiguration" JSONB,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfilePublication" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "publishedRevisionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfilePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileRevisionModule" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL, "visibility" "ProfileModuleVisibility" NOT NULL,
  "sortOrder" INTEGER NOT NULL, "configuration" JSONB,
  CONSTRAINT "ProfileRevisionModule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionField" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "label" TEXT NOT NULL, "labelAr" TEXT, "labelEn" TEXT, "value" TEXT NOT NULL,
  "type" "ProfileFieldType" NOT NULL, "iconKey" TEXT, "customIconUrl" TEXT,
  "actionUrl" TEXT, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ProfileRevisionField_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionDestination" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "titleAr" TEXT, "titleEn" TEXT, "type" "DestinationType" NOT NULL,
  "url" TEXT NOT NULL, "icon" TEXT, "iconKey" TEXT, "customIconUrl" TEXT, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ProfileRevisionDestination_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionFile" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL, "originalFilename" TEXT NOT NULL, "originalName" TEXT,
  "mimeType" TEXT NOT NULL, "title" TEXT, "displayTitleAr" TEXT, "displayTitleEn" TEXT,
  "sortOrder" INTEGER NOT NULL, CONSTRAINT "ProfileRevisionFile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionService" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "nameAr" TEXT, "nameEn" TEXT, "descriptionAr" TEXT, "descriptionEn" TEXT,
  "url" TEXT, "iconKey" TEXT, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ProfileRevisionService_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionBranch" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "nameAr" TEXT, "nameEn" TEXT, "addressAr" TEXT, "addressEn" TEXT,
  "phone" TEXT, "mapUrl" TEXT, "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "ProfileRevisionBranch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileRevisionMedia" (
  "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "mediaId" TEXT NOT NULL,
  "purpose" "ProfileMediaPurpose" NOT NULL, "publicUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProfileRevisionMedia_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileSlugHistory" (
  "id" TEXT NOT NULL, "profileId" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileSlugHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProfileMediaAsset" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "profileId" TEXT,
  "purpose" "ProfileMediaPurpose" NOT NULL, "state" "ProfileMediaState" NOT NULL DEFAULT 'TEMPORARY',
  "visibility" "ProfileModuleVisibility" NOT NULL DEFAULT 'ONLY_ME',
  "storageKey" TEXT NOT NULL, "publicStorageKey" TEXT, "publicUrl" TEXT,
  "originalFilename" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeBytes" BIGINT NOT NULL,
  "width" INTEGER, "height" INTEGER, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "temporaryExpiresAt" TIMESTAMP(3), "orphanedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfilePublication_profileId_key" ON "ProfilePublication"("profileId");
CREATE UNIQUE INDEX "ProfilePublication_publishedRevisionId_key" ON "ProfilePublication"("publishedRevisionId");
CREATE UNIQUE INDEX "ProfileRevision_profileId_revisionNumber_key" ON "ProfileRevision"("profileId","revisionNumber");
CREATE UNIQUE INDEX "ProfileRevisionModule_revisionId_key_key" ON "ProfileRevisionModule"("revisionId","key");
CREATE UNIQUE INDEX "ProfileRevisionMedia_revisionId_mediaId_key" ON "ProfileRevisionMedia"("revisionId","mediaId");
CREATE UNIQUE INDEX "ProfileSlugHistory_slug_key" ON "ProfileSlugHistory"("slug");
CREATE UNIQUE INDEX "ProfileMediaAsset_storageKey_key" ON "ProfileMediaAsset"("storageKey");
CREATE UNIQUE INDEX "ProfileMediaAsset_publicStorageKey_key" ON "ProfileMediaAsset"("publicStorageKey");
CREATE INDEX "ProfileRevision_profileId_status_revisionNumber_idx" ON "ProfileRevision"("profileId","status","revisionNumber");
CREATE INDEX "ProfileRevisionModule_revisionId_enabled_visibility_sortOrder_idx" ON "ProfileRevisionModule"("revisionId","enabled","visibility","sortOrder");
CREATE INDEX "ProfileRevisionField_revisionId_sortOrder_idx" ON "ProfileRevisionField"("revisionId","sortOrder");
CREATE INDEX "ProfileRevisionDestination_revisionId_sortOrder_idx" ON "ProfileRevisionDestination"("revisionId","sortOrder");
CREATE INDEX "ProfileRevisionFile_revisionId_sortOrder_idx" ON "ProfileRevisionFile"("revisionId","sortOrder");
CREATE INDEX "ProfileRevisionService_revisionId_sortOrder_idx" ON "ProfileRevisionService"("revisionId","sortOrder");
CREATE INDEX "ProfileRevisionBranch_revisionId_sortOrder_idx" ON "ProfileRevisionBranch"("revisionId","sortOrder");
CREATE INDEX "ProfileRevisionMedia_revisionId_sortOrder_idx" ON "ProfileRevisionMedia"("revisionId","sortOrder");
CREATE INDEX "ProfileSlugHistory_profileId_createdAt_idx" ON "ProfileSlugHistory"("profileId","createdAt");
CREATE INDEX "ProfileMediaAsset_userId_state_createdAt_idx" ON "ProfileMediaAsset"("userId","state","createdAt");
CREATE INDEX "ProfileMediaAsset_profileId_state_sortOrder_idx" ON "ProfileMediaAsset"("profileId","state","sortOrder");
CREATE INDEX "ProfileMediaAsset_state_temporaryExpiresAt_idx" ON "ProfileMediaAsset"("state","temporaryExpiresAt");
CREATE INDEX "ProfileMediaAsset_state_orphanedAt_idx" ON "ProfileMediaAsset"("state","orphanedAt");

ALTER TABLE "ProfileRevision" ADD CONSTRAINT "ProfileRevision_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePublication" ADD CONSTRAINT "ProfilePublication_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePublication" ADD CONSTRAINT "ProfilePublication_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "ProfileRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionModule" ADD CONSTRAINT "ProfileRevisionModule_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionField" ADD CONSTRAINT "ProfileRevisionField_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionDestination" ADD CONSTRAINT "ProfileRevisionDestination_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionFile" ADD CONSTRAINT "ProfileRevisionFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionService" ADD CONSTRAINT "ProfileRevisionService_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionBranch" ADD CONSTRAINT "ProfileRevisionBranch_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileRevisionMedia" ADD CONSTRAINT "ProfileRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileSlugHistory" ADD CONSTRAINT "ProfileSlugHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileMediaAsset" ADD CONSTRAINT "ProfileMediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileMediaAsset" ADD CONSTRAINT "ProfileMediaAsset_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
