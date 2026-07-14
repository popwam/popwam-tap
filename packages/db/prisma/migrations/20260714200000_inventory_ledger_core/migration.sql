-- Additive inventory-ledger upgrade. Existing business records are preserved.
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'PRODUCTION';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'RETURN';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'DAMAGE';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

CREATE TABLE "InventoryBatch" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "batchCode" TEXT NOT NULL,
  "producedQuantity" INTEGER NOT NULL,
  "availableQuantity" INTEGER NOT NULL,
  "assignedQuantity" INTEGER NOT NULL DEFAULT 0,
  "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryBatch_batchCode_key" ON "InventoryBatch"("batchCode");
CREATE INDEX "InventoryBatch_productId_createdAt_idx" ON "InventoryBatch"("productId", "createdAt");
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
