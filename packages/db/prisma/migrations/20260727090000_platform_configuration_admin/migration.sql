-- NOT APPLIED. Run only after review: pnpm --filter @popwam/db prisma migrate deploy
CREATE TYPE "LegalDocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'TERMS_OF_USE';
ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'TERMS_OF_SERVICE';
ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'USER_AGREEMENT';
ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'COOKIE_POLICY';
ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TABLE "LegalDocument" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LegalDocument" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LegalDocument" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LegalDocument" ADD COLUMN "status" "LegalDocumentStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "LegalDocument" ADD COLUMN "requiresAcceptance" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LegalDocument" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "LegalDocument" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE TABLE "PhoneCountryConfig" (
  "id" TEXT NOT NULL, "iso2" TEXT NOT NULL, "iso3" TEXT, "name" TEXT NOT NULL,
  "localizedNames" JSONB NOT NULL DEFAULT '{}', "dialCode" TEXT NOT NULL, "flagEmoji" TEXT,
  "phonePlaceholder" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT false, "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneCountryConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PhoneCountryConfig_iso2_key" ON "PhoneCountryConfig"("iso2");
CREATE INDEX "PhoneCountryConfig_enabled_displayOrder_idx" ON "PhoneCountryConfig"("enabled", "displayOrder");
