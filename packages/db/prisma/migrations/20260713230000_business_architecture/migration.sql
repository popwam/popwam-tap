-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('NFC_CARD', 'NFC_STICKER', 'WRISTBAND', 'QR_ONLY');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('UNASSIGNED', 'SELF_CLAIMED', 'ADMIN_ASSIGNED', 'TRANSFER_PENDING', 'TRANSFERRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('CREATED', 'PROGRAMMED', 'ACTIVE', 'PAUSED', 'LOST', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CardInventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'PROGRAMMED', 'ASSIGNED', 'SOLD', 'DAMAGED', 'LOST');

-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('BLANK_CARD', 'BLANK_STICKER', 'BLANK_WRISTBAND', 'QR_PRODUCT', 'PACKAGING', 'ACCESSORY', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE', 'CARD_BATCH_CREATED', 'RESERVED', 'SOLD', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- DropIndex
DROP INDEX "Destination_profileId_isVisible_sortOrder_idx";

-- DropIndex
DROP INDEX "UploadedFile_profileId_isVisible_sortOrder_idx";

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "analyticsAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availableProfileTypes" JSONB,
ADD COLUMN     "availableThemes" JSONB,
ADD COLUMN     "customSlugAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxCards" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxFiles" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TagEvent" DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "referrer",
DROP COLUMN "userAgent";

-- AlterTable
ALTER TABLE "UserLimitOverride" ADD COLUMN     "analyticsAllowed" BOOLEAN,
ADD COLUMN     "availableProfileTypes" JSONB,
ADD COLUMN     "availableThemes" JSONB,
ADD COLUMN     "customSlugAllowed" BOOLEAN,
ADD COLUMN     "maxCards" INTEGER,
ADD COLUMN     "maxFiles" INTEGER;

-- CreateTable
CREATE TABLE "CardBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "inventoryItemId" TEXT,
    "cardType" "CardType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "serialPrefix" TEXT NOT NULL,
    "startingSerialNumber" INTEGER NOT NULL,
    "publicSlugPrefix" TEXT NOT NULL,
    "unitPurchaseCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unitProgrammingCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unitPackagingCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expectedSellingPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "CardBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "activationTokenHash" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "batchId" TEXT,
    "ownerId" TEXT,
    "organizationId" TEXT,
    "profileId" TEXT,
    "activeDestinationId" TEXT,
    "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "cardStatus" "CardStatus" NOT NULL DEFAULT 'CREATED',
    "inventoryStatus" "CardInventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "programmedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardOpenDaily" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardOpenDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "type" "InventoryItemType" NOT NULL,
    "supplierId" TEXT,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "customsCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "attachmentFileId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "organizationName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cardId" TEXT,
    "inventoryItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardBatch_supplierId_idx" ON "CardBatch"("supplierId");

-- CreateIndex
CREATE INDEX "CardBatch_createdAt_idx" ON "CardBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Card_serialNumber_key" ON "Card"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Card_publicSlug_key" ON "Card"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Card_publicToken_key" ON "Card"("publicToken");

-- CreateIndex
CREATE INDEX "Card_batchId_idx" ON "Card"("batchId");

-- CreateIndex
CREATE INDEX "Card_ownerId_idx" ON "Card"("ownerId");

-- CreateIndex
CREATE INDEX "Card_organizationId_idx" ON "Card"("organizationId");

-- CreateIndex
CREATE INDEX "Card_assignmentStatus_cardStatus_idx" ON "Card"("assignmentStatus", "cardStatus");

-- CreateIndex
CREATE INDEX "Card_inventoryStatus_idx" ON "Card"("inventoryStatus");

-- CreateIndex
CREATE INDEX "CardOpenDaily_date_idx" ON "CardOpenDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CardOpenDaily_cardId_date_key" ON "CardOpenDaily"("cardId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_supplierId_idx" ON "InventoryItem"("supplierId");

-- CreateIndex
CREATE INDEX "InventoryItem_quantityOnHand_idx" ON "InventoryItem"("quantityOnHand");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_purchaseDate_idx" ON "Purchase"("supplierId", "purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_inventoryItemId_idx" ON "PurchaseItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_expenseDate_idx" ON "Expense"("categoryId", "expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_paymentStatus_idx" ON "Order"("status", "paymentStatus");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_cardId_idx" ON "OrderItem"("cardId");

-- AddForeignKey
ALTER TABLE "CardBatch" ADD CONSTRAINT "CardBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardBatch" ADD CONSTRAINT "CardBatch_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardBatch" ADD CONSTRAINT "CardBatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardBatch" ADD CONSTRAINT "CardBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CardBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_activeDestinationId_fkey" FOREIGN KEY ("activeDestinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardOpenDaily" ADD CONSTRAINT "CardOpenDaily_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Keep commercial limit names aligned with the legacy fields used by the existing UI.
UPDATE "Plan" SET
  "maxCards" = "maxTags",
  "maxFiles" = "maxUploads",
  "customSlugAllowed" = "allowCustomSlug",
  "analyticsAllowed" = "allowAnalytics",
  "availableProfileTypes" = '["PERSONAL"]'::jsonb,
  "availableThemes" = CASE WHEN "allowThemes" THEN '["CLASSIC_DARK","CLASSIC_LIGHT","ELEGANT_DARK","ELEGANT_LIGHT"]'::jsonb ELSE '["CLASSIC_DARK"]'::jsonb END;

UPDATE "UserLimitOverride" SET
  "maxCards" = "maxTags",
  "maxFiles" = "maxUploads",
  "customSlugAllowed" = "allowCustomSlug",
  "analyticsAllowed" = "allowAnalytics";

-- Old tags become assigned cards. Their original short URL and token remain valid.
-- Migrated cards are already activated, therefore no recoverable activation secret exists.
INSERT INTO "Card" (
  "id", "serialNumber", "publicSlug", "publicToken", "activationTokenHash", "cardType",
  "ownerId", "organizationId", "profileId", "activeDestinationId", "assignmentStatus",
  "cardStatus", "inventoryStatus", "programmedAt", "assignedAt", "activatedAt",
  "lastOpenedAt", "openCount", "createdAt", "updatedAt"
)
SELECT
  'legacy_card_' || t."id",
  'LEGACY-' || upper(t."id"),
  t."shortCode",
  t."token",
  'legacy-disabled:' || md5(t."id" || ':' || t."token" || ':popwam-card-migration'),
  'NFC_CARD'::"CardType",
  t."ownerId", t."organizationId", t."profileId", t."activeDestinationId",
  'ADMIN_ASSIGNED'::"AssignmentStatus",
  CASE t."status"::text
    WHEN 'ACTIVE' THEN 'ACTIVE'::"CardStatus"
    WHEN 'PAUSED' THEN 'PAUSED'::"CardStatus"
    WHEN 'LOST' THEN 'LOST'::"CardStatus"
    ELSE 'DISABLED'::"CardStatus"
  END,
  CASE WHEN t."status"::text = 'LOST' THEN 'LOST'::"CardInventoryStatus" ELSE 'ASSIGNED'::"CardInventoryStatus" END,
  t."programmedAt", t."createdAt", t."createdAt", t."lastScannedAt", t."scanCount", t."createdAt", t."updatedAt"
FROM "Tag" t
ON CONFLICT DO NOTHING;

-- Historical request metadata and per-open rows are deliberately removed for privacy.
DELETE FROM "TagEvent" WHERE "type" IN ('SCAN', 'REDIRECT', 'PROFILE_VIEW');

-- Practical default expense catalog (stable IDs make this migration idempotent in repairs).
INSERT INTO "ExpenseCategory" ("id", "nameAr", "nameEn", "isActive") VALUES
  ('expense_card_purchases', 'مشتريات البطاقات', 'Card purchases', true),
  ('expense_printing', 'الطباعة', 'Printing', true),
  ('expense_packaging', 'التغليف', 'Packaging', true),
  ('expense_shipping', 'الشحن', 'Shipping', true),
  ('expense_advertising', 'الإعلان', 'Advertising', true),
  ('expense_hosting', 'الاستضافة', 'Hosting', true),
  ('expense_sms_otp', 'رسائل التحقق', 'SMS OTP', true),
  ('expense_domain', 'النطاقات', 'Domain', true),
  ('expense_cloud_storage', 'التخزين السحابي', 'Cloud storage', true),
  ('expense_software', 'البرمجيات', 'Software', true),
  ('expense_salaries', 'الرواتب', 'Salaries', true),
  ('expense_transportation', 'النقل', 'Transportation', true),
  ('expense_refunds', 'المبالغ المستردة', 'Refunds', true),
  ('expense_other', 'أخرى', 'Other', true)
ON CONFLICT ("id") DO NOTHING;
