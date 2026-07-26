-- Phase B profile foundation. This migration is additive and intentionally not applied by this task.
CREATE TYPE "ProfileKind" AS ENUM ('PERSONAL', 'BUSINESS');
CREATE TYPE "ProfileLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
CREATE TYPE "ProfileModuleVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'ONLY_ME', 'UNLISTED');
CREATE TYPE "ProfileEntitlementSourceType" AS ENUM ('PLAN', 'PRODUCT', 'PURCHASE', 'ADMIN', 'PROMOTION', 'LEGACY');
CREATE TYPE "ProfileEntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY');
CREATE TYPE "LegalConsentSource" AS ENUM ('WEB', 'ANDROID', 'ONBOARDING');

CREATE TABLE "ProfileCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "profileKind" "ProfileKind" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Profile"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "profileKind" "ProfileKind",
  ADD COLUMN "lifecycle" "ProfileLifecycle" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "creationKey" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "ProfileTemplate"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "profileKind" "ProfileKind";

CREATE TABLE "ProfileModuleDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supportsVisibility" BOOLEAN NOT NULL DEFAULT true,
    "supportsMultiple" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileModuleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileModule" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "moduleDefinitionId" TEXT NOT NULL,
    "instanceKey" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "ProfileModuleVisibility" NOT NULL DEFAULT 'PUBLIC',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configurationVersion" INTEGER NOT NULL DEFAULT 1,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileTemplateModule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "moduleDefinitionId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "enabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultSortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultConfiguration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfileTemplateModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "sourceType" "ProfileEntitlementSourceType" NOT NULL,
    "sourceId" TEXT,
    "profileLimitIncrement" INTEGER NOT NULL DEFAULT 0,
    "status" "ProfileEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLegalConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalDocumentId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LegalConsentSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserLegalConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileCategory_slug_key" ON "ProfileCategory"("slug");
CREATE INDEX "ProfileCategory_profileKind_isActive_sortOrder_idx" ON "ProfileCategory"("profileKind", "isActive", "sortOrder");
CREATE INDEX "ProfileCategory_defaultTemplateId_idx" ON "ProfileCategory"("defaultTemplateId");
CREATE UNIQUE INDEX "Profile_creationKey_key" ON "Profile"("creationKey");
CREATE INDEX "Profile_userId_lifecycle_idx" ON "Profile"("userId", "lifecycle");
CREATE INDEX "Profile_categoryId_idx" ON "Profile"("categoryId");
CREATE INDEX "Profile_templateId_idx" ON "Profile"("templateId");
CREATE UNIQUE INDEX "Profile_one_active_primary_per_user_key" ON "Profile"("userId") WHERE "isPrimary" = true AND "archivedAt" IS NULL;
CREATE INDEX "ProfileTemplate_categoryId_profileKind_isActive_idx" ON "ProfileTemplate"("categoryId", "profileKind", "isActive");
CREATE UNIQUE INDEX "ProfileModuleDefinition_key_key" ON "ProfileModuleDefinition"("key");
CREATE INDEX "ProfileModuleDefinition_isActive_key_idx" ON "ProfileModuleDefinition"("isActive", "key");
CREATE UNIQUE INDEX "ProfileModule_profileId_moduleDefinitionId_instanceKey_key" ON "ProfileModule"("profileId", "moduleDefinitionId", "instanceKey");
CREATE INDEX "ProfileModule_profileId_enabled_visibility_sortOrder_idx" ON "ProfileModule"("profileId", "enabled", "visibility", "sortOrder");
CREATE INDEX "ProfileModule_moduleDefinitionId_enabled_idx" ON "ProfileModule"("moduleDefinitionId", "enabled");
CREATE UNIQUE INDEX "ProfileTemplateModule_templateId_moduleDefinitionId_key" ON "ProfileTemplateModule"("templateId", "moduleDefinitionId");
CREATE INDEX "ProfileTemplateModule_templateId_allowed_enabledByDefault_defaultSortOrder_idx" ON "ProfileTemplateModule"("templateId", "allowed", "enabledByDefault", "defaultSortOrder");
CREATE INDEX "ProfileTemplateModule_moduleDefinitionId_idx" ON "ProfileTemplateModule"("moduleDefinitionId");
CREATE UNIQUE INDEX "ProfileEntitlement_profileId_key" ON "ProfileEntitlement"("profileId");
CREATE INDEX "ProfileEntitlement_userId_status_startsAt_endsAt_idx" ON "ProfileEntitlement"("userId", "status", "startsAt", "endsAt");
CREATE INDEX "ProfileEntitlement_sourceType_sourceId_idx" ON "ProfileEntitlement"("sourceType", "sourceId");
CREATE UNIQUE INDEX "LegalDocument_documentType_version_locale_key" ON "LegalDocument"("documentType", "version", "locale");
CREATE INDEX "LegalDocument_documentType_isActive_effectiveAt_idx" ON "LegalDocument"("documentType", "isActive", "effectiveAt");
CREATE UNIQUE INDEX "UserLegalConsent_userId_legalDocumentId_key" ON "UserLegalConsent"("userId", "legalDocumentId");
CREATE INDEX "UserLegalConsent_userId_acceptedAt_idx" ON "UserLegalConsent"("userId", "acceptedAt");
CREATE INDEX "UserLegalConsent_legalDocumentId_idx" ON "UserLegalConsent"("legalDocumentId");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProfileCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProfileTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfileTemplate" ADD CONSTRAINT "ProfileTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProfileCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfileCategory" ADD CONSTRAINT "ProfileCategory_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "ProfileTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfileModule" ADD CONSTRAINT "ProfileModule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileModule" ADD CONSTRAINT "ProfileModule_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES "ProfileModuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileTemplateModule" ADD CONSTRAINT "ProfileTemplateModule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProfileTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileTemplateModule" ADD CONSTRAINT "ProfileTemplateModule_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES "ProfileModuleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfileEntitlement" ADD CONSTRAINT "ProfileEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileEntitlement" ADD CONSTRAINT "ProfileEntitlement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserLegalConsent" ADD CONSTRAINT "UserLegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLegalConsent" ADD CONSTRAINT "UserLegalConsent_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Controlled catalogues only; no user/profile data is changed or backfilled here.
INSERT INTO "ProfileCategory" ("id", "slug", "profileKind", "nameEn", "nameAr", "sortOrder", "updatedAt") VALUES
  ('seed-profile-category-personal', 'personal', 'PERSONAL', 'Personal', 'شخصي', 10, CURRENT_TIMESTAMP),
  ('seed-profile-category-freelancer', 'freelancer', 'PERSONAL', 'Freelancer', 'مستقل', 20, CURRENT_TIMESTAMP),
  ('seed-profile-category-professional', 'professional', 'PERSONAL', 'Professional', 'محترف', 30, CURRENT_TIMESTAMP),
  ('seed-profile-category-creator', 'creator', 'PERSONAL', 'Creator', 'صانع محتوى', 40, CURRENT_TIMESTAMP),
  ('seed-profile-category-restaurant', 'restaurant', 'BUSINESS', 'Restaurant', 'مطعم', 10, CURRENT_TIMESTAMP),
  ('seed-profile-category-clinic', 'clinic', 'BUSINESS', 'Clinic', 'عيادة', 20, CURRENT_TIMESTAMP),
  ('seed-profile-category-salon', 'salon', 'BUSINESS', 'Salon', 'صالون', 30, CURRENT_TIMESTAMP),
  ('seed-profile-category-supermarket', 'supermarket', 'BUSINESS', 'Supermarket', 'سوبرماركت', 40, CURRENT_TIMESTAMP),
  ('seed-profile-category-agency', 'agency', 'BUSINESS', 'Agency', 'وكالة', 50, CURRENT_TIMESTAMP),
  ('seed-profile-category-company', 'company', 'BUSINESS', 'Company', 'شركة', 60, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProfileModuleDefinition" ("id", "key", "nameEn", "nameAr", "schemaVersion", "supportsVisibility", "supportsMultiple", "updatedAt") VALUES
  ('seed-profile-module-identity', 'IDENTITY', 'Identity', 'الهوية', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-about', 'ABOUT', 'About', 'نبذة', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-contact', 'CONTACT', 'Contact', 'التواصل', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-social', 'SOCIAL', 'Social', 'اجتماعي', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-links', 'LINKS', 'Links', 'الروابط', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-gallery', 'GALLERY', 'Gallery', 'المعرض', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-services', 'SERVICES', 'Services', 'الخدمات', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-portfolio', 'PORTFOLIO', 'Portfolio', 'الأعمال', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-branches', 'BRANCHES', 'Branches', 'الفروع', 1, true, false, CURRENT_TIMESTAMP),
  ('seed-profile-module-catalog', 'CATALOG', 'Catalog', 'الكتالوج', 1, true, false, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
