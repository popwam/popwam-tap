-- Production labels are additive and keep existing Card/CardBatch identifiers intact.
CREATE TYPE "ProductionBatchStatus" AS ENUM ('DRAFT', 'GENERATED', 'PRINTED', 'CLOSED', 'CANCELLED');
CREATE TYPE "ProducedTagStatus" AS ENUM ('UNASSIGNED', 'RESERVED', 'ASSIGNED', 'ACTIVATED', 'DISABLED', 'DAMAGED');

CREATE TABLE "ProductionBatch" (
  "id" TEXT NOT NULL,
  "batchCode" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "ProductionBatchStatus" NOT NULL DEFAULT 'GENERATED',
  "createdById" TEXT NOT NULL,
  "legacyCardBatchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProducedTag" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "cardId" TEXT,
  "immutableToken" TEXT NOT NULL,
  "shortCode" TEXT,
  "permanentUrl" TEXT NOT NULL,
  "activationCode" TEXT NOT NULL,
  "activationTokenHash" TEXT NOT NULL,
  "status" "ProducedTagStatus" NOT NULL DEFAULT 'UNASSIGNED',
  "assignedUserId" TEXT,
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProducedTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionBatch_batchCode_key" ON "ProductionBatch"("batchCode");
CREATE UNIQUE INDEX "ProductionBatch_legacyCardBatchId_key" ON "ProductionBatch"("legacyCardBatchId");
CREATE INDEX "ProductionBatch_productId_createdAt_idx" ON "ProductionBatch"("productId", "createdAt");
CREATE INDEX "ProductionBatch_status_createdAt_idx" ON "ProductionBatch"("status", "createdAt");
CREATE UNIQUE INDEX "ProducedTag_cardId_key" ON "ProducedTag"("cardId");
CREATE UNIQUE INDEX "ProducedTag_immutableToken_key" ON "ProducedTag"("immutableToken");
CREATE UNIQUE INDEX "ProducedTag_permanentUrl_key" ON "ProducedTag"("permanentUrl");
CREATE UNIQUE INDEX "ProducedTag_activationCode_key" ON "ProducedTag"("activationCode");
CREATE UNIQUE INDEX "ProducedTag_activationTokenHash_key" ON "ProducedTag"("activationTokenHash");
CREATE INDEX "ProducedTag_batchId_status_idx" ON "ProducedTag"("batchId", "status");
CREATE INDEX "ProducedTag_assignedUserId_status_idx" ON "ProducedTag"("assignedUserId", "status");
CREATE INDEX "ProducedTag_shortCode_idx" ON "ProducedTag"("shortCode");

ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionBatch" ADD CONSTRAINT "ProductionBatch_legacyCardBatchId_fkey" FOREIGN KEY ("legacyCardBatchId") REFERENCES "CardBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProducedTag" ADD CONSTRAINT "ProducedTag_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProducedTag" ADD CONSTRAINT "ProducedTag_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProducedTag" ADD CONSTRAINT "ProducedTag_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
