-- Destructive cleanup approved by the repository owner.
-- This migration is intentionally prepared but must not be applied to production
-- until historical purchase/expense/social/catalog data has been reviewed.

DROP TABLE "PurchaseItem";
DROP TABLE "Purchase";
DROP TABLE "Expense";
DROP TABLE "ExpenseCategory";
DROP TABLE "PlatformSuggestion";
DROP TABLE "ProductMedia";
DROP TABLE "Follow";

DROP TYPE "PurchaseStatus";

ALTER TABLE "User" DROP COLUMN "allowNearbyDiscovery";

ALTER TABLE "Friendship"
  DROP COLUMN "favoriteA",
  DROP COLUMN "favoriteB";

ALTER TABLE "CardBatch"
  DROP COLUMN "unitProgrammingCost",
  DROP COLUMN "unitPackagingCost";

ALTER TABLE "InventoryItem" DROP COLUMN "imageStorageKey";

ALTER TABLE "VirtualCard"
  DROP COLUMN "avatarKind",
  DROP COLUMN "avatarValue";

ALTER TABLE "Product"
  DROP COLUMN "serialPolicy",
  DROP COLUMN "seoTitleAr",
  DROP COLUMN "seoTitleEn",
  DROP COLUMN "seoDescriptionAr",
  DROP COLUMN "seoDescriptionEn";

ALTER TABLE "ProductVariant" DROP COLUMN "attributes";
ALTER TABLE "ProductInventory" DROP COLUMN "lowStockAt";

ALTER TABLE "ProductPrice"
  DROP COLUMN "activeFrom",
  DROP COLUMN "activeTo";

-- Final owner-approved removal of the remaining dormant fields and read-only
-- supplier architecture. Constraints and indexes are named explicitly; this
-- migration deliberately does not use CASCADE.

ALTER TABLE "OtpChallenge"
  DROP CONSTRAINT "OtpChallenge_claimSessionId_fkey";

ALTER TABLE "CardBatch"
  DROP CONSTRAINT "CardBatch_supplierId_fkey";

ALTER TABLE "InventoryItem"
  DROP CONSTRAINT "InventoryItem_supplierId_fkey";

DROP INDEX "OtpChallenge_claimSessionId_idx";
DROP INDEX "CardBatch_supplierId_idx";
DROP INDEX "InventoryItem_supplierId_idx";

ALTER TABLE "Destination"
  DROP COLUMN "customIconStorageKey",
  DROP COLUMN "customIconType";

ALTER TABLE "ActivationClaimSession" DROP COLUMN "attemptCount";
ALTER TABLE "OtpChallenge" DROP COLUMN "claimSessionId";
ALTER TABLE "LinkPlatform" DROP COLUMN "supportsOAuth";
ALTER TABLE "OAuthConnectionState" DROP COLUMN "returnPath";
ALTER TABLE "StepUpGrant" DROP COLUMN "assuranceLevel";

ALTER TABLE "CardBatch" DROP COLUMN "supplierId";
ALTER TABLE "InventoryItem" DROP COLUMN "supplierId";
DROP TABLE "Supplier";
