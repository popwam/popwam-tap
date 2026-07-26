-- Phase I is additive. This migration is CREATE/ALTER-only and is not applied
-- by the implementation task.

ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'COMMUNITY_GUIDELINES';
ALTER TYPE "FriendRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "FriendRequestStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "UserReportStatus" ADD VALUE IF NOT EXISTS 'ACTIONED';

CREATE TYPE "FriendRequestSource" AS ENUM ('SEARCH', 'PROFILE');
CREATE TYPE "UserBlockSource" AS ENUM ('FRIENDS', 'PROFILE', 'REPORT');
CREATE TYPE "UserReportCategory" AS ENUM ('SPAM', 'HARASSMENT', 'IMPERSONATION', 'INAPPROPRIATE_CONTENT', 'SCAM', 'PRIVACY', 'OTHER');
CREATE TYPE "FriendNotificationType" AS ENUM ('FRIEND_REQUEST_RECEIVED', 'FRIEND_REQUEST_ACCEPTED');
CREATE TYPE "FriendNotificationStatus" AS ENUM ('PENDING', 'SENT', 'SUPPRESSED', 'FAILED');

ALTER TABLE "ProfileRevisionMedia"
  ADD COLUMN "visibility" "ProfileModuleVisibility" NOT NULL DEFAULT 'PUBLIC';

ALTER TABLE "UserBlock"
  ADD COLUMN "reasonCategory" "UserReportCategory",
  ADD COLUMN "source" "UserBlockSource" NOT NULL DEFAULT 'FRIENDS';

ALTER TABLE "UserReport"
  ADD COLUMN "targetProfileId" TEXT,
  ADD COLUMN "category" "UserReportCategory",
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "resolutionCode" TEXT;

ALTER TABLE "NotificationPreference"
  ADD COLUMN "socialEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "FriendRequest" (
  "id" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
  "source" "FriendRequestSource" NOT NULL DEFAULT 'SEARCH',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FriendPreference" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "friendId" TEXT NOT NULL,
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FriendPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FriendsPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "socialKey" TEXT NOT NULL,
  "socialProfileId" TEXT,
  "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
  "discoverableByProfileSearch" BOOLEAN NOT NULL DEFAULT false,
  "profileConfiguredAt" TIMESTAMP(3),
  "privacyConfiguredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FriendsPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FriendNotificationEvent" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "requestId" TEXT,
  "type" "FriendNotificationType" NOT NULL,
  "status" "FriendNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "FriendNotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FriendRequest_requesterUserId_status_createdAt_idx" ON "FriendRequest"("requesterUserId", "status", "createdAt");
CREATE INDEX "FriendRequest_recipientUserId_status_createdAt_idx" ON "FriendRequest"("recipientUserId", "status", "createdAt");
CREATE INDEX "FriendRequest_pairKey_status_createdAt_idx" ON "FriendRequest"("pairKey", "status", "createdAt");
CREATE UNIQUE INDEX "FriendRequest_one_pending_pair_key" ON "FriendRequest"("pairKey") WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "FriendPreference_ownerId_friendId_key" ON "FriendPreference"("ownerId", "friendId");
CREATE INDEX "FriendPreference_ownerId_favorite_updatedAt_idx" ON "FriendPreference"("ownerId", "favorite", "updatedAt");
CREATE INDEX "FriendPreference_ownerId_muted_idx" ON "FriendPreference"("ownerId", "muted");

CREATE UNIQUE INDEX "FriendsPreference_userId_key" ON "FriendsPreference"("userId");
CREATE UNIQUE INDEX "FriendsPreference_socialKey_key" ON "FriendsPreference"("socialKey");
CREATE INDEX "FriendsPreference_discoverableByProfileSearch_updatedAt_idx" ON "FriendsPreference"("discoverableByProfileSearch", "updatedAt");
CREATE INDEX "FriendsPreference_socialProfileId_idx" ON "FriendsPreference"("socialProfileId");

CREATE INDEX "UserBlock_ownerId_createdAt_idx" ON "UserBlock"("ownerId", "createdAt");
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");
CREATE INDEX "UserReport_reporterId_subjectId_createdAt_idx" ON "UserReport"("reporterId", "subjectId", "createdAt");
CREATE INDEX "UserReport_targetProfileId_createdAt_idx" ON "UserReport"("targetProfileId", "createdAt");

CREATE INDEX "FriendNotificationEvent_recipientUserId_status_createdAt_idx" ON "FriendNotificationEvent"("recipientUserId", "status", "createdAt");
CREATE INDEX "FriendNotificationEvent_status_availableAt_idx" ON "FriendNotificationEvent"("status", "availableAt");
CREATE INDEX "FriendNotificationEvent_actorUserId_recipientUserId_createdAt_idx" ON "FriendNotificationEvent"("actorUserId", "recipientUserId", "createdAt");

ALTER TABLE "FriendRequest"
  ADD CONSTRAINT "FriendRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FriendRequest_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendPreference"
  ADD CONSTRAINT "FriendPreference_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FriendPreference_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FriendsPreference"
  ADD CONSTRAINT "FriendsPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FriendsPreference_socialProfileId_fkey" FOREIGN KEY ("socialProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserReport"
  ADD CONSTRAINT "UserReport_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FriendNotificationEvent"
  ADD CONSTRAINT "FriendNotificationEvent_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FriendNotificationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FriendNotificationEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FriendRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
