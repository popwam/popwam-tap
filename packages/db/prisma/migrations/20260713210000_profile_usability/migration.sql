-- End-to-end profile usability, editable plans, custom icons, sorting and branding.
ALTER TABLE "Profile"
  ADD COLUMN "showAvatar" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCover" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showDisplayName" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showTitle" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showBio" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showPhone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showWebsite" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showLocation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showWhatsappBusiness" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showWhatsappPrivate" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showSocialLinks" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCustomFields" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showUploadedFiles" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showSaveContact" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Destination"
  ADD COLUMN "customIconStorageKey" TEXT,
  ADD COLUMN "customIconType" TEXT,
  ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "UploadedFile" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Plan"
  ADD COLUMN "nameAr" TEXT,
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "descriptionAr" TEXT,
  ADD COLUMN "descriptionEn" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "allowCustomIcons" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserLimitOverride" ADD COLUMN "allowCustomIcons" BOOLEAN;

UPDATE "Plan" SET
  "nameEn" = "name",
  "descriptionEn" = "description",
  "nameAr" = CASE "slug" WHEN 'free' THEN 'مجانية' WHEN 'personal' THEN 'شخصية' WHEN 'pro' THEN 'احترافية' WHEN 'business' THEN 'أعمال' ELSE "name" END,
  "sortOrder" = CASE "slug" WHEN 'free' THEN 10 WHEN 'personal' THEN 20 WHEN 'pro' THEN 30 WHEN 'business' THEN 40 ELSE 100 END,
  "allowCustomIcons" = CASE WHEN "slug" IN ('pro', 'business') THEN true ELSE false END;

WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "profileId" ORDER BY "createdAt", "id") - 1 AS position FROM "Destination"
)
UPDATE "Destination" d SET "sortOrder" = ranked.position FROM ranked WHERE d."id" = ranked."id";

WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "profileId" ORDER BY "createdAt", "id") - 1 AS position FROM "UploadedFile"
)
UPDATE "UploadedFile" f SET "sortOrder" = ranked.position FROM ranked WHERE f."id" = ranked."id";

CREATE TABLE "BrandSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "mainLogoUrl" TEXT,
  "mainLogoStorageKey" TEXT,
  "lightLogoUrl" TEXT,
  "lightLogoStorageKey" TEXT,
  "darkLogoUrl" TEXT,
  "darkLogoStorageKey" TEXT,
  "appIconUrl" TEXT,
  "appIconStorageKey" TEXT,
  "faviconUrl" TEXT,
  "faviconStorageKey" TEXT,
  "appleTouchIconUrl" TEXT,
  "appleTouchIconStorageKey" TEXT,
  "pwaIcon192Url" TEXT,
  "pwaIcon512Url" TEXT,
  "defaultOgImageUrl" TEXT,
  "defaultOgImageStorageKey" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Destination_profileId_isVisible_sortOrder_idx" ON "Destination"("profileId", "isVisible", "sortOrder");
CREATE INDEX "UploadedFile_profileId_isVisible_sortOrder_idx" ON "UploadedFile"("profileId", "isVisible", "sortOrder");
