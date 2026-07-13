-- POPWAM Tap platform upgrade. This migration is additive so existing users and tags remain intact.
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'EXPIRED', 'CANCELED');
CREATE TYPE "ProfileFieldType" AS ENUM ('TEXT', 'PHONE', 'EMAIL', 'URL', 'WHATSAPP', 'LOCATION', 'FILE', 'SOCIAL', 'CUSTOM');
CREATE TYPE "ProfileTheme" AS ENUM ('CLASSIC_DARK', 'CLASSIC_LIGHT', 'ELEGANT_DARK', 'ELEGANT_LIGHT');

ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'INSTAGRAM';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'X';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'YOUTUBE';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'TELEGRAM';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'LOCATION';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'FILE';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'SOCIAL';
ALTER TYPE "DestinationType" ADD VALUE IF NOT EXISTS 'CUSTOM_FIELD';

ALTER TABLE "User"
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "locale" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "Profile"
  ADD COLUMN "theme" "ProfileTheme" NOT NULL DEFAULT 'CLASSIC_DARK',
  ADD COLUMN "avatarCrop" JSONB,
  ADD COLUMN "coverCrop" JSONB;

ALTER TABLE "Destination"
  ADD COLUMN "iconKey" TEXT,
  ADD COLUMN "customIconUrl" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Keep the original token immutable for legacy /t URLs; the user-facing short code is independently editable.
ALTER TABLE "Tag" ADD COLUMN "shortCode" TEXT;
WITH normalized AS (
  SELECT "id", trim(both '-' from lower(regexp_replace("token", '[^a-zA-Z0-9-]+', '-', 'g'))) AS base
  FROM "Tag"
), ranked AS (
  SELECT "id", base, row_number() OVER (PARTITION BY base ORDER BY "id") AS duplicate_number
  FROM normalized
)
UPDATE "Tag" AS tag
SET "shortCode" = CASE
  WHEN length(ranked.base) >= 2
    AND ranked.duplicate_number = 1
    AND ranked.base NOT IN ('admin','dashboard','login','api','auth','health','p','t','settings','new','edit','uploads','manifest.json','favicon.ico','robots.txt','sitemap.xml','offline','sw.js')
  THEN ranked.base
  ELSE coalesce(nullif(ranked.base, ''), 'tag') || '-' || right(tag."id", 6)
END
FROM ranked WHERE ranked."id" = tag."id";
ALTER TABLE "Tag" ALTER COLUMN "shortCode" SET NOT NULL;
CREATE UNIQUE INDEX "Tag_shortCode_key" ON "Tag"("shortCode");
CREATE INDEX "Tag_shortCode_idx" ON "Tag"("shortCode");

CREATE TABLE "TagAlias" (
  "code" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TagAlias_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "TagAlias_tagId_idx" ON "TagAlias"("tagId");
ALTER TABLE "TagAlias" ADD CONSTRAINT "TagAlias_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "TagAlias" ("code", "tagId") SELECT "shortCode", "id" FROM "Tag" ON CONFLICT ("code") DO NOTHING;

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "maxProfiles" INTEGER NOT NULL DEFAULT 1,
  "maxLinks" INTEGER NOT NULL DEFAULT 5,
  "maxCustomFields" INTEGER NOT NULL DEFAULT 3,
  "maxTags" INTEGER NOT NULL DEFAULT 1,
  "maxUploads" INTEGER NOT NULL DEFAULT 0,
  "maxStorageBytes" BIGINT NOT NULL DEFAULT 0,
  "allowCustomSlug" BOOLEAN NOT NULL DEFAULT false,
  "allowThemes" BOOLEAN NOT NULL DEFAULT false,
  "allowCustomTheme" BOOLEAN NOT NULL DEFAULT false,
  "allowAnalytics" BOOLEAN NOT NULL DEFAULT false,
  "allowFileUploads" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLimitOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "maxProfiles" INTEGER,
  "maxLinks" INTEGER,
  "maxCustomFields" INTEGER,
  "maxTags" INTEGER,
  "maxUploads" INTEGER,
  "maxStorageBytes" BIGINT,
  "allowCustomSlug" BOOLEAN,
  "allowThemes" BOOLEAN,
  "allowCustomTheme" BOOLEAN,
  "allowAnalytics" BOOLEAN,
  "allowFileUploads" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLimitOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileField" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "type" "ProfileFieldType" NOT NULL DEFAULT 'TEXT',
  "iconKey" TEXT,
  "customIconUrl" TEXT,
  "actionUrl" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadedFile" (
  "id" TEXT NOT NULL,
  "profileId" TEXT,
  "uploaderUserId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "title" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "operation" TEXT NOT NULL,
  "route" TEXT,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "UserPlan_userId_status_idx" ON "UserPlan"("userId", "status");
CREATE INDEX "UserPlan_planId_idx" ON "UserPlan"("planId");
CREATE UNIQUE INDEX "UserLimitOverride_userId_key" ON "UserLimitOverride"("userId");
CREATE INDEX "ProfileField_profileId_isVisible_sortOrder_idx" ON "ProfileField"("profileId", "isVisible", "sortOrder");
CREATE INDEX "ProfileField_userId_idx" ON "ProfileField"("userId");
CREATE UNIQUE INDEX "UploadedFile_storageKey_key" ON "UploadedFile"("storageKey");
CREATE INDEX "UploadedFile_uploaderUserId_createdAt_idx" ON "UploadedFile"("uploaderUserId", "createdAt");
CREATE INDEX "UploadedFile_profileId_isVisible_idx" ON "UploadedFile"("profileId", "isVisible");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserLimitOverride" ADD CONSTRAINT "UserLimitOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileField" ADD CONSTRAINT "ProfileField_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileField" ADD CONSTRAINT "ProfileField_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default commercial catalog. Upserts are implemented in the repair script; these inserts bootstrap existing databases.
INSERT INTO "Plan" ("id", "name", "slug", "description", "maxProfiles", "maxLinks", "maxCustomFields", "maxTags", "maxUploads", "maxStorageBytes", "allowCustomSlug", "allowThemes", "allowCustomTheme", "allowAnalytics", "allowFileUploads", "updatedAt") VALUES
  ('plan_free', 'Free', 'free', 'Starter plan', 1, 5, 3, 1, 0, 0, false, false, false, false, false, CURRENT_TIMESTAMP),
  ('plan_personal', 'Personal', 'personal', 'Personal digital identity', 2, 15, 10, 2, 10, 52428800, true, true, false, true, true, CURRENT_TIMESTAMP),
  ('plan_pro', 'Pro', 'pro', 'Professional profile toolkit', 5, 50, 30, 5, 50, 524288000, true, true, true, true, true, CURRENT_TIMESTAMP),
  ('plan_business', 'Business', 'business', 'Teams and high-volume cards', 25, 250, 100, 100, 500, 5368709120, true, true, true, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "UserPlan" ("id", "userId", "planId", "status", "updatedAt")
SELECT 'free_' || u."id", u."id", p."id", 'ACTIVE', CURRENT_TIMESTAMP
FROM "User" u CROSS JOIN "Plan" p
WHERE p."slug" = 'free'
  AND NOT EXISTS (SELECT 1 FROM "UserPlan" up WHERE up."userId" = u."id" AND up."status" = 'ACTIVE');
