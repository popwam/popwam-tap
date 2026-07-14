-- Additive feature foundation. Existing Profile/Card rows remain authoritative and
-- are linked to compatibility records without deleting or renaming legacy data.
CREATE TYPE "VirtualCardType" AS ENUM ('PERSONAL', 'PROFESSIONAL', 'CREATOR', 'BUSINESS');
CREATE TYPE "VirtualCardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WalletPlatform" AS ENUM ('GOOGLE', 'APPLE');
CREATE TYPE "WalletPassStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'ERROR');
CREATE TYPE "TagTransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "Plan"
  ADD COLUMN "maxVirtualCards" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "allowBusinessCards" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowWalletPasses" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowCustomLinks" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserLimitOverride"
  ADD COLUMN "maxVirtualCards" INTEGER,
  ADD COLUMN "allowBusinessCards" BOOLEAN,
  ADD COLUMN "allowWalletPasses" BOOLEAN,
  ADD COLUMN "allowCustomLinks" BOOLEAN;

UPDATE "Plan"
SET "maxVirtualCards" = CASE
      WHEN lower("slug") = 'personal' THEN 2
      WHEN lower("slug") = 'pro' THEN 3
      WHEN lower("slug") = 'business' THEN GREATEST(3, "maxProfiles")
      ELSE 1
    END,
    "allowBusinessCards" = lower("slug") = 'business',
    "allowWalletPasses" = lower("slug") IN ('personal', 'pro', 'business'),
    "allowCustomLinks" = lower("slug") IN ('pro', 'business');

CREATE TABLE "ProfileTemplate" (
  "id" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "minimumPlan" TEXT NOT NULL,
  "previewImageUrl" TEXT,
  "configuration" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileTemplate_slug_key" ON "ProfileTemplate"("slug");
CREATE INDEX "ProfileTemplate_isActive_sortOrder_idx" ON "ProfileTemplate"("isActive", "sortOrder");
CREATE INDEX "ProfileTemplate_minimumPlan_idx" ON "ProfileTemplate"("minimumPlan");
INSERT INTO "ProfileTemplate" ("id", "nameAr", "nameEn", "slug", "category", "minimumPlan", "configuration", "isActive", "sortOrder", "updatedAt") VALUES
  ('pt_minimal', 'بسيط', 'Minimal', 'minimal', 'Minimal', 'free', '{"background":"#111313","panel":"#191c1c","text":"#f5f5f5","muted":"#a3a3a3","accent":"#55d6a5","radius":"1.25rem","linkLayout":"list"}'::jsonb, true, 10, CURRENT_TIMESTAMP),
  ('pt_professional', 'احترافي', 'Professional', 'professional', 'Professional', 'personal', '{"background":"#101419","panel":"#18202a","text":"#f8fafc","muted":"#9ca3af","accent":"#68d5ad","radius":"1rem","linkLayout":"compact"}'::jsonb, true, 20, CURRENT_TIMESTAMP),
  ('pt_creator', 'صانع محتوى', 'Creator', 'creator', 'Creator', 'personal', '{"background":"#171119","panel":"#281c2b","text":"#fff7fb","muted":"#c9b5c6","accent":"#f29ac1","radius":"2rem","linkLayout":"grid"}'::jsonb, true, 30, CURRENT_TIMESTAMP),
  ('pt_elegant', 'أنيق', 'Elegant', 'elegant', 'Elegant', 'pro', '{"background":"#15120d","panel":"#241e16","text":"#fffaf0","muted":"#c5baa6","accent":"#e4b86a","radius":"2rem","linkLayout":"list"}'::jsonb, true, 40, CURRENT_TIMESTAMP),
  ('pt_portfolio', 'معرض أعمال', 'Portfolio', 'portfolio', 'Portfolio', 'pro', '{"background":"#0f1215","panel":"#171c21","text":"#f4f7fa","muted":"#9ba8b4","accent":"#8bd0de","radius":"0.75rem","linkLayout":"grid"}'::jsonb, true, 50, CURRENT_TIMESTAMP),
  ('pt_business', 'أعمال', 'Business', 'business', 'Business', 'business', '{"background":"#111313","panel":"#1a1d1d","text":"#ffffff","muted":"#a4aaaa","accent":"#64d8ae","radius":"0.75rem","linkLayout":"compact"}'::jsonb, true, 60, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE "VirtualCard" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "type" "VirtualCardType" NOT NULL DEFAULT 'PERSONAL',
  "profileId" TEXT NOT NULL,
  "themeId" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "status" "VirtualCardStatus" NOT NULL DEFAULT 'ACTIVE',
  "avatarKind" TEXT,
  "avatarValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VirtualCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VirtualCard_profileId_key" ON "VirtualCard"("profileId");
CREATE INDEX "VirtualCard_userId_status_idx" ON "VirtualCard"("userId", "status");
CREATE INDEX "VirtualCard_organizationId_idx" ON "VirtualCard"("organizationId");
CREATE INDEX "VirtualCard_themeId_idx" ON "VirtualCard"("themeId");

ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "ProfileTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "VirtualCard" (
  "id", "userId", "organizationId", "name", "type", "profileId", "isDefault", "status", "createdAt", "updatedAt"
)
SELECT
  'vc_' || md5(p."id"), p."userId", p."organizationId", p."displayName",
  CASE WHEN p."type"::text = 'ORGANIZATION' THEN 'BUSINESS'::"VirtualCardType" ELSE 'PERSONAL'::"VirtualCardType" END,
  p."id",
  row_number() OVER (PARTITION BY p."userId" ORDER BY p."createdAt", p."id") = 1,
  'ACTIVE'::"VirtualCardStatus", p."createdAt", p."updatedAt"
FROM "Profile" p
ON CONFLICT ("profileId") DO NOTHING;

CREATE TABLE "LinkPlatform" (
  "id" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "iconKey" TEXT NOT NULL,
  "customIconUrl" TEXT,
  "placeholder" TEXT NOT NULL,
  "validationPattern" TEXT,
  "category" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "allowCustomLabel" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LinkPlatform_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LinkPlatform_slug_key" ON "LinkPlatform"("slug");
CREATE INDEX "LinkPlatform_isActive_sortOrder_idx" ON "LinkPlatform"("isActive", "sortOrder");
INSERT INTO "LinkPlatform" ("id", "nameAr", "nameEn", "slug", "iconKey", "placeholder", "category", "isActive", "sortOrder", "allowCustomLabel", "updatedAt") VALUES
  ('lp_instagram', 'إنستغرام', 'Instagram', 'instagram', 'instagram', 'https://instagram.com/username', 'SOCIAL', true, 10, false, CURRENT_TIMESTAMP),
  ('lp_facebook', 'فيسبوك', 'Facebook', 'facebook', 'facebook', 'https://facebook.com/page', 'SOCIAL', true, 20, false, CURRENT_TIMESTAMP),
  ('lp_tiktok', 'تيك توك', 'TikTok', 'tiktok', 'tiktok', 'https://tiktok.com/@username', 'SOCIAL', true, 30, false, CURRENT_TIMESTAMP),
  ('lp_linkedin', 'لينكدإن', 'LinkedIn', 'linkedin', 'linkedin', 'https://linkedin.com/in/username', 'PROFESSIONAL', true, 40, false, CURRENT_TIMESTAMP),
  ('lp_github', 'جيت هب', 'GitHub', 'github', 'github', 'https://github.com/username', 'PROFESSIONAL', true, 50, false, CURRENT_TIMESTAMP),
  ('lp_whatsapp', 'واتساب', 'WhatsApp', 'whatsapp', 'whatsapp', 'https://wa.me/201000000000', 'MESSAGING', true, 60, false, CURRENT_TIMESTAMP),
  ('lp_website', 'الموقع الإلكتروني', 'Website', 'website', 'website', 'https://example.com', 'WEB', true, 70, true, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
ALTER TABLE "Destination" ADD COLUMN "linkPlatformId" TEXT;
CREATE INDEX "Destination_linkPlatformId_idx" ON "Destination"("linkPlatformId");
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_linkPlatformId_fkey" FOREIGN KEY ("linkPlatformId") REFERENCES "LinkPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WalletPass" (
  "id" TEXT NOT NULL,
  "virtualCardId" TEXT NOT NULL,
  "platform" "WalletPlatform" NOT NULL,
  "externalObjectId" TEXT,
  "serialNumber" TEXT NOT NULL,
  "status" "WalletPassStatus" NOT NULL DEFAULT 'PENDING',
  "lastGeneratedAt" TIMESTAMP(3),
  "lastUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletPass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletPass_serialNumber_key" ON "WalletPass"("serialNumber");
CREATE UNIQUE INDEX "WalletPass_virtualCardId_platform_key" ON "WalletPass"("virtualCardId", "platform");
CREATE INDEX "WalletPass_platform_status_idx" ON "WalletPass"("platform", "status");
ALTER TABLE "WalletPass" ADD CONSTRAINT "WalletPass_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES "VirtualCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Card" ADD COLUMN "virtualCardId" TEXT;
UPDATE "Card" c SET "virtualCardId" = v."id" FROM "VirtualCard" v WHERE c."profileId" = v."profileId";
CREATE INDEX "Card_virtualCardId_idx" ON "Card"("virtualCardId");
ALTER TABLE "Card" ADD CONSTRAINT "Card_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES "VirtualCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TagTransfer" (
  "id" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT,
  "invitedEmail" TEXT,
  "status" "TagTransferStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TagTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TagTransfer_fromUserId_status_idx" ON "TagTransfer"("fromUserId", "status");
CREATE INDEX "TagTransfer_toUserId_status_idx" ON "TagTransfer"("toUserId", "status");
CREATE INDEX "TagTransfer_invitedEmail_status_idx" ON "TagTransfer"("invitedEmail", "status");
CREATE INDEX "TagTransfer_tagId_status_idx" ON "TagTransfer"("tagId", "status");
ALTER TABLE "TagTransfer" ADD CONSTRAINT "TagTransfer_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TagTransfer" ADD CONSTRAINT "TagTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TagTransfer" ADD CONSTRAINT "TagTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OnboardingProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON "OnboardingProgress"("userId");
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing accounts keep their current experience. Accounts created after this
-- migration have no row and are routed through the guided first-login flow.
INSERT INTO "OnboardingProgress" ("id", "userId", "currentStep", "completedAt", "data", "createdAt", "updatedAt")
SELECT 'ob_' || md5(u."id"), u."id", 6, CURRENT_TIMESTAMP, '{"legacyAccount":true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
ON CONFLICT ("userId") DO NOTHING;
