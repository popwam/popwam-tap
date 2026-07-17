-- Additive POP by POPWAM expansion. This migration intentionally does not delete or rename existing data.
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'STOLEN';
ALTER TYPE "CardStatus" ADD VALUE IF NOT EXISTS 'TRANSFER_PENDING';

DO $$ BEGIN CREATE TYPE "ProductStatus" AS ENUM ('DRAFT','ACTIVE','HIDDEN','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProductInventoryStatus" AS ENUM ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK','PREORDER','UNAVAILABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ContentVisibility" AS ENUM ('PRIVATE','UNLISTED','PUBLIC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "UserReportStatus" AS ENUM ('OPEN','REVIEWING','RESOLVED','DISMISSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shareActivityIdentity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowNearbyDiscovery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultSharingCardId" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "displayLabel" TEXT;
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "displayLabel" TEXT;
ALTER TABLE "VirtualCard" ADD COLUMN IF NOT EXISTS "displayLabel" TEXT;

CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT PRIMARY KEY, "slug" TEXT NOT NULL UNIQUE, "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "descriptionAr" TEXT, "descriptionEn" TEXT, "imageUrl" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ProductCategory_isActive_sortOrder_idx" ON "ProductCategory"("isActive","sortOrder");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY, "categoryId" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE, "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "shortDescriptionAr" TEXT, "shortDescriptionEn" TEXT, "descriptionAr" TEXT, "descriptionEn" TEXT,
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT', "featured" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "serialPolicy" TEXT, "seoTitleAr" TEXT, "seoTitleEn" TEXT, "seoDescriptionAr" TEXT, "seoDescriptionEn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Product_status_featured_sortOrder_idx" ON "Product"("status","featured","sortOrder");
CREATE INDEX IF NOT EXISTS "Product_categoryId_status_idx" ON "Product"("categoryId","status");

CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "sku" TEXT NOT NULL UNIQUE, "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
  "attributes" JSONB NOT NULL DEFAULT '{}', "isDefault" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isActive_sortOrder_idx" ON "ProductVariant"("productId","isActive","sortOrder");

CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "variantId" TEXT, "url" TEXT NOT NULL, "altAr" TEXT, "altEn" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isPrimary" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId","sortOrder");
CREATE INDEX IF NOT EXISTS "ProductImage_variantId_idx" ON "ProductImage"("variantId");

CREATE TABLE IF NOT EXISTS "ProductInventory" (
  "id" TEXT PRIMARY KEY, "variantId" TEXT NOT NULL UNIQUE, "quantity" INTEGER NOT NULL DEFAULT 0, "reserved" INTEGER NOT NULL DEFAULT 0,
  "lowStockAt" INTEGER NOT NULL DEFAULT 5, "status" "ProductInventoryStatus" NOT NULL DEFAULT 'OUT_OF_STOCK', "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductInventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductInventory_nonnegative_check" CHECK ("quantity" >= 0 AND "reserved" >= 0 AND "reserved" <= "quantity")
);

CREATE TABLE IF NOT EXISTS "ProductPrice" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "variantId" TEXT, "currency" TEXT NOT NULL DEFAULT 'EGP',
  "amount" DECIMAL(14,2) NOT NULL, "saleAmount" DECIMAL(14,2), "activeFrom" TIMESTAMP(3), "activeTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductPrice_amount_check" CHECK ("amount" >= 0 AND ("saleAmount" IS NULL OR "saleAmount" >= 0))
);
CREATE INDEX IF NOT EXISTS "ProductPrice_productId_isActive_idx" ON "ProductPrice"("productId","isActive");
CREATE INDEX IF NOT EXISTS "ProductPrice_variantId_isActive_idx" ON "ProductPrice"("variantId","isActive");

CREATE TABLE IF NOT EXISTS "ProductFeature" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "titleAr" TEXT NOT NULL, "titleEn" TEXT NOT NULL,
  "valueAr" TEXT, "valueEn" TEXT, "iconKey" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductFeature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductFeature_productId_sortOrder_idx" ON "ProductFeature"("productId","sortOrder");

CREATE TABLE IF NOT EXISTS "ProductMedia" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "type" TEXT NOT NULL, "url" TEXT NOT NULL,
  "titleAr" TEXT, "titleEn" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductMedia_productId_sortOrder_idx" ON "ProductMedia"("productId","sortOrder");

CREATE TABLE IF NOT EXISTS "ProductSlug" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE, "isCanonical" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductSlug_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductSlug_productId_idx" ON "ProductSlug"("productId");

CREATE TABLE IF NOT EXISTS "ContentEntry" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "displayLabel" TEXT NOT NULL, "normalizedName" TEXT NOT NULL, "slug" TEXT UNIQUE,
  "titleAr" TEXT, "titleEn" TEXT, "summaryAr" TEXT, "summaryEn" TEXT, "bodyAr" TEXT, "bodyEn" TEXT, "externalUrl" TEXT,
  "coverImageUrl" TEXT, "category" TEXT, "visibility" "ContentVisibility" NOT NULL DEFAULT 'PRIVATE', "ctaAr" TEXT, "ctaEn" TEXT,
  "iconKey" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentEntry_userId_normalizedName_key" UNIQUE ("userId","normalizedName")
);
CREATE INDEX IF NOT EXISTS "ContentEntry_userId_visibility_sortOrder_idx" ON "ContentEntry"("userId","visibility","sortOrder");

CREATE TABLE IF NOT EXISTS "ContentAttachment" (
  "id" TEXT PRIMARY KEY, "contentEntryId" TEXT NOT NULL, "uploadedFileId" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ContentAttachment_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "ContentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentAttachment_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContentAttachment_contentEntryId_uploadedFileId_key" UNIQUE ("contentEntryId","uploadedFileId")
);

CREATE TABLE IF NOT EXISTS "ContentPublication" (
  "id" TEXT PRIMARY KEY, "contentEntryId" TEXT NOT NULL, "virtualCardId" TEXT NOT NULL, "isVisible" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ContentPublication_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "ContentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentPublication_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES "VirtualCard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContentPublication_contentEntryId_virtualCardId_key" UNIQUE ("contentEntryId","virtualCardId")
);
CREATE INDEX IF NOT EXISTS "ContentPublication_virtualCardId_isVisible_sortOrder_idx" ON "ContentPublication"("virtualCardId","isVisible","sortOrder");

CREATE TABLE IF NOT EXISTS "Follow" (
  "id" TEXT PRIMARY KEY, "followerId" TEXT NOT NULL, "followingId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId","followingId"),
  CONSTRAINT "Follow_not_self_check" CHECK ("followerId" <> "followingId")
);
CREATE INDEX IF NOT EXISTS "Follow_followingId_createdAt_idx" ON "Follow"("followingId","createdAt");

CREATE TABLE IF NOT EXISTS "UserBlock" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "blockedId" TEXT NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserBlock_ownerId_blockedId_key" UNIQUE ("ownerId","blockedId"),
  CONSTRAINT "UserBlock_not_self_check" CHECK ("ownerId" <> "blockedId")
);

CREATE TABLE IF NOT EXISTS "UserReport" (
  "id" TEXT PRIMARY KEY, "reporterId" TEXT NOT NULL, "subjectId" TEXT, "reason" TEXT NOT NULL, "details" TEXT,
  "status" "UserReportStatus" NOT NULL DEFAULT 'OPEN', "reviewedById" TEXT, "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UserReport_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "UserReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserReport_status_createdAt_idx" ON "UserReport"("status","createdAt");
CREATE INDEX IF NOT EXISTS "UserReport_subjectId_idx" ON "UserReport"("subjectId");

CREATE TABLE IF NOT EXISTS "NearbyPreference" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "enabled" BOOLEAN NOT NULL DEFAULT false, "visibleUntil" TIMESTAMP(3),
  "virtualCardId" TEXT, "audience" TEXT NOT NULL DEFAULT 'EVERYONE_OPTED_IN', "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NearbyPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "NearbyPreference_enabled_visibleUntil_idx" ON "NearbyPreference"("enabled","visibleUntil");

CREATE TABLE IF NOT EXISTS "DeviceSession" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tokenFamilyHash" TEXT NOT NULL UNIQUE, "deviceName" TEXT, "platform" TEXT NOT NULL,
  "appVersion" TEXT, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DeviceSession_userId_revokedAt_lastSeenAt_idx" ON "DeviceSession"("userId","revokedAt","lastSeenAt");

CREATE TABLE IF NOT EXISTS "ProductStatusHistory" (
  "id" TEXT PRIMARY KEY, "cardId" TEXT NOT NULL, "fromStatus" "CardStatus", "toStatus" "CardStatus" NOT NULL,
  "actorId" TEXT, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductStatusHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductStatusHistory_cardId_createdAt_idx" ON "ProductStatusHistory"("cardId","createdAt");

-- Safe labels backfill; preserves existing public names and permanent slugs.
UPDATE "VirtualCard" SET "displayLabel" = "name" WHERE "displayLabel" IS NULL;
UPDATE "Profile" SET "displayLabel" = "displayName" WHERE "displayLabel" IS NULL;
UPDATE "Card" SET "displayLabel" = CONCAT('POP •••', RIGHT("serialNumber", 4)) WHERE "displayLabel" IS NULL;
