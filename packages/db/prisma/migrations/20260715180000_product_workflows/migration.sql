-- Additive product-workflow upgrade. Existing rows, enum values, and legacy
-- routes remain valid while new requests use the guided workflows.
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFICATION';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

ALTER TABLE "Profile"
  ADD COLUMN "allowInstallable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Plan"
  ADD COLUMN "allowInstallableProfiles" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserLimitOverride"
  ADD COLUMN "allowInstallableProfiles" BOOLEAN;

UPDATE "Plan"
SET "allowInstallableProfiles" = lower("slug") IN ('personal', 'pro', 'business');

ALTER TABLE "UserPlan" ADD COLUMN "adminNote" TEXT;

ALTER TABLE "InventoryItem"
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "imageStorageKey" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "LinkPlatform"
  ADD COLUMN "validationRules" JSONB,
  ADD COLUMN "inputType" TEXT NOT NULL DEFAULT 'FULL_URL',
  ADD COLUMN "urlTemplate" TEXT,
  ADD COLUMN "androidAppUrl" TEXT,
  ADD COLUMN "iosAppUrl" TEXT,
  ADD COLUMN "webFallback" TEXT,
  ADD COLUMN "helpAr" TEXT,
  ADD COLUMN "helpEn" TEXT,
  ADD COLUMN "allowCustomIcon" BOOLEAN NOT NULL DEFAULT false;

UPDATE "LinkPlatform" SET
  "inputType" = 'USERNAME_OR_URL',
  "urlTemplate" = CASE lower("slug")
    WHEN 'instagram' THEN 'https://instagram.com/{value}'
    WHEN 'facebook' THEN 'https://facebook.com/{value}'
    WHEN 'tiktok' THEN 'https://tiktok.com/@{value}'
    WHEN 'linkedin' THEN 'https://linkedin.com/in/{value}'
    WHEN 'github' THEN 'https://github.com/{value}'
    ELSE "urlTemplate"
  END
WHERE lower("slug") IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'github');

UPDATE "LinkPlatform" SET "inputType" = 'PHONE', "urlTemplate" = 'https://wa.me/{value}' WHERE lower("slug") = 'whatsapp';

UPDATE "ProfileTemplate" SET "configuration" = "configuration" || CASE lower("slug")
  WHEN 'minimal' THEN '{"avatarPosition":"start","headerAlign":"start","coverStyle":"minimal","contactLayout":"grid","desktopLayout":"narrow"}'::jsonb
  WHEN 'creator' THEN '{"avatarPosition":"center","headerAlign":"center","coverStyle":"full","contactLayout":"row","desktopLayout":"narrow"}'::jsonb
  WHEN 'professional' THEN '{"avatarPosition":"end","headerAlign":"end","coverStyle":"inset","contactLayout":"list","desktopLayout":"split"}'::jsonb
  WHEN 'portfolio' THEN '{"avatarPosition":"center","headerAlign":"center","coverStyle":"banner","contactLayout":"grid","desktopLayout":"wide"}'::jsonb
  WHEN 'business' THEN '{"avatarPosition":"start","headerAlign":"start","coverStyle":"banner","contactLayout":"list","desktopLayout":"split"}'::jsonb
  ELSE '{}'::jsonb END;

ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
CREATE TYPE "FriendPrivacyLevel" AS ENUM ('FULL_PROFILE', 'CONTACT_ONLY', 'SELECTED_LINKS', 'BUSINESS_ONLY', 'NOTHING');
CREATE TYPE "MessageReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "FeatureRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'PLANNED', 'IN_PROGRESS', 'RELEASED', 'REJECTED');

CREATE TABLE "Friendship" (
  "id" TEXT NOT NULL, "userAId" TEXT NOT NULL, "userBId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL, "blockedById" TEXT, "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "favoriteA" BOOLEAN NOT NULL DEFAULT false, "favoriteB" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");
CREATE INDEX "Friendship_userAId_status_idx" ON "Friendship"("userAId", "status");
CREATE INDEX "Friendship_userBId_status_idx" ON "Friendship"("userBId", "status");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FriendPrivacyRule" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "friendId" TEXT NOT NULL,
  "level" "FriendPrivacyLevel" NOT NULL DEFAULT 'FULL_PROFILE', "selectedDestinationIds" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FriendPrivacyRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FriendPrivacyRule_ownerId_friendId_key" ON "FriendPrivacyRule"("ownerId", "friendId");
CREATE INDEX "FriendPrivacyRule_friendId_idx" ON "FriendPrivacyRule"("friendId");
ALTER TABLE "FriendPrivacyRule" ADD CONSTRAINT "FriendPrivacyRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendPrivacyRule" ADD CONSTRAINT "FriendPrivacyRule_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Chat" (
  "id" TEXT NOT NULL, "directKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Chat_directKey_key" ON "Chat"("directKey");
CREATE TABLE "ChatMember" (
  "id" TEXT NOT NULL, "chatId" TEXT NOT NULL, "userId" TEXT NOT NULL, "lastReadAt" TIMESTAMP(3),
  "muted" BOOLEAN NOT NULL DEFAULT false, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON "ChatMember"("chatId", "userId");
CREATE INDEX "ChatMember_userId_chatId_idx" ON "ChatMember"("userId", "chatId");
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMember" ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Message" (
  "id" TEXT NOT NULL, "chatId" TEXT NOT NULL, "senderId" TEXT NOT NULL, "body" TEXT,
  "attachmentFileId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MessageReport" (
  "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "reporterId" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "status" "MessageReportStatus" NOT NULL DEFAULT 'OPEN', "reviewedById" TEXT, "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");
CREATE INDEX "MessageReport_status_createdAt_idx" ON "MessageReport"("status", "createdAt");
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FeatureRequest" (
  "id" TEXT NOT NULL, "authorId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "status" "FeatureRequestStatus" NOT NULL DEFAULT 'NEW', "adminResponse" TEXT, "mergedIntoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeatureRequest_status_createdAt_idx" ON "FeatureRequest"("status", "createdAt");
CREATE INDEX "FeatureRequest_mergedIntoId_idx" ON "FeatureRequest"("mergedIntoId");
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "FeatureRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FeatureVote" (
  "id" TEXT NOT NULL, "featureRequestId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FeatureVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeatureVote_featureRequestId_userId_key" ON "FeatureVote"("featureRequestId", "userId");
CREATE INDEX "FeatureVote_userId_idx" ON "FeatureVote"("userId");
ALTER TABLE "FeatureVote" ADD CONSTRAINT "FeatureVote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureVote" ADD CONSTRAINT "FeatureVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FeatureComment" (
  "id" TEXT NOT NULL, "featureRequestId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FeatureComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FeatureComment_featureRequestId_createdAt_idx" ON "FeatureComment"("featureRequestId", "createdAt");
ALTER TABLE "FeatureComment" ADD CONSTRAINT "FeatureComment_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureComment" ADD CONSTRAINT "FeatureComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
