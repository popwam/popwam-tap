-- PASS 5: narrow plan defaults for contact-only storefront profile templates.
-- NULL storefrontMaxItems means explicitly unlimited; no cart/order/payment models are introduced.
ALTER TABLE "Plan"
  ADD COLUMN "storefrontEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storefrontProductsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storefrontServicesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storefrontMaxItems" INTEGER,
  ADD COLUMN "storefrontWhatsappOrder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storefrontEmailOrder" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Plan"
  ADD CONSTRAINT "Plan_storefrontMaxItems_nonnegative"
  CHECK ("storefrontMaxItems" IS NULL OR "storefrontMaxItems" >= 0);

CREATE TYPE "ProfileShowcaseItemType" AS ENUM ('PRODUCT', 'SERVICE');

ALTER TABLE "ProfileService"
  ADD COLUMN "itemType" "ProfileShowcaseItemType" NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "price" DECIMAL(14,2),
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProfileRevisionService"
  ADD COLUMN "itemType" "ProfileShowcaseItemType" NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "price" DECIMAL(14,2),
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProfileService"
  ADD CONSTRAINT "ProfileService_price_nonnegative"
  CHECK ("price" IS NULL OR "price" >= 0);

ALTER TABLE "ProfileRevisionService"
  ADD CONSTRAINT "ProfileRevisionService_price_nonnegative"
  CHECK ("price" IS NULL OR "price" >= 0);
