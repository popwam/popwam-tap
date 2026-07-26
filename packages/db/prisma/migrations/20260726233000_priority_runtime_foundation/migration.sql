-- Additive user quota-increase request workflow. Existing users inherit their
-- current plan/platform limits and require no backfill.
CREATE TYPE "QuotaResource" AS ENUM ('MAX_STORAGE_BYTES', 'MAX_LINKS');
CREATE TYPE "QuotaRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "QuotaIncreaseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" "QuotaResource" NOT NULL,
    "requestedValue" BIGINT NOT NULL,
    "status" "QuotaRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotaIncreaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuotaIncreaseRequest_userId_resource_status_createdAt_idx"
ON "QuotaIncreaseRequest"("userId", "resource", "status", "createdAt");

CREATE INDEX "QuotaIncreaseRequest_status_createdAt_idx"
ON "QuotaIncreaseRequest"("status", "createdAt");

CREATE INDEX "QuotaIncreaseRequest_reviewedById_idx"
ON "QuotaIncreaseRequest"("reviewedById");

ALTER TABLE "QuotaIncreaseRequest"
ADD CONSTRAINT "QuotaIncreaseRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuotaIncreaseRequest"
ADD CONSTRAINT "QuotaIncreaseRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
