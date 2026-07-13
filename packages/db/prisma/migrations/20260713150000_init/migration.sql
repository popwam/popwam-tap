-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ORG_ADMIN', 'MEMBER');
CREATE TYPE "DestinationType" AS ENUM ('PROFILE', 'WHATSAPP_BUSINESS', 'WHATSAPP_PRIVATE', 'PHONE', 'EMAIL', 'WEBSITE', 'VCF', 'FACEBOOK', 'LINKEDIN', 'GITHUB', 'TIKTOK', 'CUSTOM_URL');
CREATE TYPE "TagMode" AS ENUM ('PROFILE', 'REDIRECT');
CREATE TYPE "TagStatus" AS ENUM ('ACTIVE', 'PAUSED', 'LOST', 'DISABLED');
CREATE TYPE "TagEventType" AS ENUM ('SCAN', 'REDIRECT', 'PROFILE_VIEW', 'STATUS_CHANGE', 'CREATED', 'UPDATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL, "name" TEXT, "email" TEXT NOT NULL, "emailVerified" TIMESTAMP(3),
    "image" TEXT, "passwordHash" TEXT, "role" "SystemRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER,
    "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" "OrgRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profile" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "organizationId" TEXT, "slug" TEXT, "displayName" TEXT NOT NULL,
    "title" TEXT, "bio" TEXT, "avatarUrl" TEXT, "avatarStorageKey" TEXT, "coverUrl" TEXT, "coverStorageKey" TEXT,
    "phone" TEXT, "whatsappBusiness" TEXT, "whatsappPrivate" TEXT, "email" TEXT, "website" TEXT,
    "facebook" TEXT, "linkedin" TEXT, "github" TEXT, "tiktok" TEXT, "vcfUrl" TEXT, "locationText" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Destination" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "organizationId" TEXT, "profileId" TEXT, "title" TEXT NOT NULL,
    "type" "DestinationType" NOT NULL, "url" TEXT NOT NULL, "icon" TEXT,
    "isOfflineCapable" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL, "token" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "organizationId" TEXT,
    "profileId" TEXT, "activeDestinationId" TEXT, "name" TEXT NOT NULL, "mode" "TagMode" NOT NULL DEFAULT 'PROFILE',
    "status" "TagStatus" NOT NULL DEFAULT 'ACTIVE', "programmedAt" TIMESTAMP(3), "lockedAt" TIMESTAMP(3),
    "lastScannedAt" TIMESTAMP(3), "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TagEvent" (
    "id" TEXT NOT NULL, "tagId" TEXT NOT NULL, "type" "TagEventType" NOT NULL, "ipAddress" TEXT,
    "userAgent" TEXT, "referrer" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TagEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE UNIQUE INDEX "Profile_slug_key" ON "Profile"("slug");
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");
CREATE INDEX "Profile_organizationId_idx" ON "Profile"("organizationId");
CREATE INDEX "Profile_slug_idx" ON "Profile"("slug");
CREATE INDEX "Destination_userId_idx" ON "Destination"("userId");
CREATE INDEX "Destination_organizationId_idx" ON "Destination"("organizationId");
CREATE INDEX "Destination_profileId_idx" ON "Destination"("profileId");
CREATE UNIQUE INDEX "Tag_token_key" ON "Tag"("token");
CREATE INDEX "Tag_token_idx" ON "Tag"("token");
CREATE INDEX "Tag_ownerId_idx" ON "Tag"("ownerId");
CREATE INDEX "Tag_status_idx" ON "Tag"("status");
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");
CREATE INDEX "TagEvent_tagId_createdAt_idx" ON "TagEvent"("tagId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_activeDestinationId_fkey" FOREIGN KEY ("activeDestinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TagEvent" ADD CONSTRAINT "TagEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
