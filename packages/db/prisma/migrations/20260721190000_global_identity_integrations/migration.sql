-- Additive only. This migration is intentionally not deployed automatically.
CREATE TYPE "PhoneOtpChannel" AS ENUM ('SMS', 'WHATSAPP');
CREATE TYPE "ConnectedAccountProvider" AS ENUM ('META', 'FACEBOOK', 'INSTAGRAM', 'THREADS', 'WHATSAPP_BUSINESS', 'TIKTOK', 'GOOGLE', 'LINKEDIN', 'GITHUB', 'GITLAB', 'YOUTUBE', 'SPOTIFY', 'TWITCH', 'PINTEREST', 'DISCORD', 'REDDIT', 'MICROSOFT');
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');
CREATE TYPE "ImportedFieldSyncMode" AS ENUM ('MANUAL', 'AUTO');
CREATE TYPE "PasskeyChallengeType" AS ENUM ('REGISTER', 'AUTHENTICATE');
CREATE TYPE "ProfessionType" AS ENUM ('PERSONAL', 'BUSINESS_OWNER', 'COMPANY', 'DEVELOPER', 'DESIGNER', 'CREATOR', 'MARKETER', 'REAL_ESTATE', 'DOCTOR', 'LAWYER', 'MUSICIAN', 'PHOTOGRAPHER', 'FREELANCER', 'RESTAURANT', 'SHOP');
CREATE TYPE "BackupProviderType" AS ENUM ('POP_CLOUD', 'GOOGLE_DRIVE');

ALTER TABLE "User" ADD COLUMN "phoneE164" TEXT,
  ADD COLUMN "phoneCountryIso2" TEXT,
  ADD COLUMN "phoneCallingCode" TEXT,
  ADD COLUMN "profession" "ProfessionType" NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN "customProfession" TEXT,
  ADD COLUMN "backupProvider" "BackupProviderType" NOT NULL DEFAULT 'POP_CLOUD';
ALTER TABLE "Profile" ADD COLUMN "profession" "ProfessionType" NOT NULL DEFAULT 'PERSONAL', ADD COLUMN "customProfession" TEXT;
ALTER TABLE "OtpChallenge" ADD COLUMN "channel" "PhoneOtpChannel" NOT NULL DEFAULT 'SMS';
ALTER TABLE "LinkPlatform" ADD COLUMN "supportsOAuth" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "oauthProvider" "ConnectedAccountProvider";
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

INSERT INTO "LinkPlatform" ("id","nameAr","nameEn","slug","iconKey","placeholder","category","inputType","urlTemplate","isActive","sortOrder","supportsOAuth","oauthProvider","updatedAt") VALUES
('lp_facebook','فيسبوك','Facebook','facebook','facebook','username','SOCIAL','USERNAME_OR_URL','https://facebook.com/{value}',true,20,true,'META',CURRENT_TIMESTAMP),
('lp_linkedin','لينكدإن','LinkedIn','linkedin','linkedin','username','BUSINESS','USERNAME_OR_URL','https://linkedin.com/in/{value}',true,30,true,'LINKEDIN',CURRENT_TIMESTAMP),
('lp_tiktok','تيك توك','TikTok','tiktok','tiktok','username','CREATOR','USERNAME_OR_URL','https://tiktok.com/@{value}',true,40,true,'TIKTOK',CURRENT_TIMESTAMP),
('lp_x','إكس','X','x','x','username','SOCIAL','USERNAME_OR_URL','https://x.com/{value}',true,50,false,NULL,CURRENT_TIMESTAMP),
('lp_youtube','يوتيوب','YouTube','youtube','youtube','channel','CREATOR','USERNAME_OR_URL','https://youtube.com/@{value}',true,70,true,'YOUTUBE',CURRENT_TIMESTAMP),
('lp_telegram','تيليجرام','Telegram','telegram','telegram','username','COMMUNICATION','USERNAME_OR_URL','https://t.me/{value}',true,80,false,NULL,CURRENT_TIMESTAMP),
('lp_snapchat','سناب شات','Snapchat','snapchat','snapchat','username','SOCIAL','USERNAME_OR_URL','https://snapchat.com/add/{value}',true,90,false,NULL,CURRENT_TIMESTAMP),
('lp_threads','ثريدز','Threads','threads','threads','username','SOCIAL','USERNAME_OR_URL','https://threads.net/@{value}',true,100,true,'THREADS',CURRENT_TIMESTAMP),
('lp_gitlab','جيت لاب','GitLab','gitlab','gitlab','username','DEVELOPER','USERNAME_OR_URL','https://gitlab.com/{value}',true,120,true,'GITLAB',CURRENT_TIMESTAMP),
('lp_stackoverflow','ستاك أوفرفلو','Stack Overflow','stack-overflow','code','profile URL','DEVELOPER','FULL_URL',NULL,true,130,false,NULL,CURRENT_TIMESTAMP),
('lp_behance','بيهانس','Behance','behance','behance','username','PORTFOLIO','USERNAME_OR_URL','https://behance.net/{value}',true,140,false,NULL,CURRENT_TIMESTAMP),
('lp_dribbble','دريبل','Dribbble','dribbble','dribbble','username','PORTFOLIO','USERNAME_OR_URL','https://dribbble.com/{value}',true,150,false,NULL,CURRENT_TIMESTAMP),
('lp_pinterest','بنترست','Pinterest','pinterest','pinterest','username','CREATOR','USERNAME_OR_URL','https://pinterest.com/{value}',true,160,true,'PINTEREST',CURRENT_TIMESTAMP),
('lp_discord','ديسكورد','Discord','discord','discord','invite URL','COMMUNICATION','FULL_URL',NULL,true,170,true,'DISCORD',CURRENT_TIMESTAMP),
('lp_twitch','تويتش','Twitch','twitch','twitch','username','CREATOR','USERNAME_OR_URL','https://twitch.tv/{value}',true,180,true,'TWITCH',CURRENT_TIMESTAMP),
('lp_spotify','سبوتيفاي','Spotify','spotify','spotify','profile URL','MUSIC','FULL_URL',NULL,true,190,true,'SPOTIFY',CURRENT_TIMESTAMP),
('lp_applemusic','آبل ميوزك','Apple Music','apple-music','music','profile URL','MUSIC','FULL_URL',NULL,true,200,false,NULL,CURRENT_TIMESTAMP),
('lp_anghami','أنغامي','Anghami','anghami','music','profile URL','MUSIC','FULL_URL',NULL,true,210,false,NULL,CURRENT_TIMESTAMP),
('lp_soundcloud','ساوند كلاود','SoundCloud','soundcloud','music','username','MUSIC','USERNAME_OR_URL','https://soundcloud.com/{value}',true,220,false,NULL,CURRENT_TIMESTAMP),
('lp_medium','ميديوم','Medium','medium','article','username','CREATOR','USERNAME_OR_URL','https://medium.com/@{value}',true,230,false,NULL,CURRENT_TIMESTAMP),
('lp_substack','سبستاك','Substack','substack','article','publication URL','CREATOR','FULL_URL',NULL,true,240,false,NULL,CURRENT_TIMESTAMP),
('lp_reddit','ريديت','Reddit','reddit','reddit','username','SOCIAL','USERNAME_OR_URL','https://reddit.com/u/{value}',true,250,true,'REDDIT',CURRENT_TIMESTAMP),
('lp_googlemaps','خرائط جوجل','Google Maps','google-maps','map','location URL','LOCATION','FULL_URL',NULL,true,260,false,NULL,CURRENT_TIMESTAMP),
('lp_googlebusiness','ملف جوجل التجاري','Google Business Profile','google-business-profile','building','business URL','BUSINESS','FULL_URL',NULL,true,270,false,NULL,CURRENT_TIMESTAMP),
('lp_calendly','كالندلي','Calendly','calendly','calendar','username','BOOKING','USERNAME_OR_URL','https://calendly.com/{value}',true,280,false,NULL,CURRENT_TIMESTAMP),
('lp_zoom','زووم','Zoom','zoom','video','meeting URL','COMMUNICATION','FULL_URL',NULL,true,290,false,NULL,CURRENT_TIMESTAMP),
('lp_teams','مايكروسوفت تيمز','Microsoft Teams','microsoft-teams','video','meeting URL','COMMUNICATION','FULL_URL',NULL,true,300,true,'MICROSOFT',CURRENT_TIMESTAMP),
('lp_website','الموقع','Website','website','website','https://example.com','BUSINESS','FULL_URL',NULL,true,310,false,NULL,CURRENT_TIMESTAMP),
('lp_email','البريد الإلكتروني','Email','email','email','name@example.com','COMMUNICATION','EMAIL',NULL,true,320,false,NULL,CURRENT_TIMESTAMP),
('lp_phone','الهاتف','Phone','phone','phone','+201001234567','COMMUNICATION','PHONE',NULL,true,330,false,NULL,CURRENT_TIMESTAMP),
('lp_github','جيت هب','GitHub','github','github','username','DEVELOPER','USERNAME_OR_URL','https://github.com/{value}',true,110,true,'GITHUB',CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "supportsOAuth"=EXCLUDED."supportsOAuth", "oauthProvider"=EXCLUDED."oauthProvider", "category"=EXCLUDED."category", "updatedAt"=CURRENT_TIMESTAMP;

CREATE TABLE "PasskeyCredential" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "credentialId" TEXT NOT NULL, "publicKey" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0, "transports" TEXT[] DEFAULT ARRAY[]::TEXT[], "deviceType" TEXT,
  "backedUp" BOOLEAN NOT NULL DEFAULT false, "name" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON "PasskeyCredential"("credentialId");
CREATE INDEX "PasskeyCredential_userId_revokedAt_idx" ON "PasskeyCredential"("userId", "revokedAt");

CREATE TABLE "PasskeyChallenge" (
  "id" TEXT NOT NULL, "userId" TEXT, "challengeHash" TEXT NOT NULL, "type" "PasskeyChallengeType" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasskeyChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasskeyChallenge_challengeHash_key" ON "PasskeyChallenge"("challengeHash");
CREATE INDEX "PasskeyChallenge_userId_type_expiresAt_idx" ON "PasskeyChallenge"("userId", "type", "expiresAt");
CREATE INDEX "PasskeyChallenge_expiresAt_idx" ON "PasskeyChallenge"("expiresAt");

CREATE TABLE "ConnectedAccount" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "provider" "ConnectedAccountProvider" NOT NULL, "providerAccountId" TEXT NOT NULL,
  "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'CONNECTED', "displayName" TEXT, "username" TEXT, "avatarUrl" TEXT,
  "profileUrl" TEXT, "accountType" TEXT, "metadata" JSONB, "followersCount" BIGINT, "followersUpdatedAt" TIMESTAMP(3),
  "accessTokenEncrypted" BYTEA, "refreshTokenEncrypted" BYTEA, "tokenExpiresAt" TIMESTAMP(3), "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lastSyncedAt" TIMESTAMP(3), "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "disconnectedAt" TIMESTAMP(3), CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConnectedAccount_provider_providerAccountId_key" ON "ConnectedAccount"("provider", "providerAccountId");
CREATE INDEX "ConnectedAccount_userId_provider_status_idx" ON "ConnectedAccount"("userId", "provider", "status");

CREATE TABLE "OAuthConnectionState" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "provider" "ConnectedAccountProvider" NOT NULL, "stateHash" TEXT NOT NULL,
  "codeVerifier" TEXT, "returnPath" TEXT NOT NULL DEFAULT '/dashboard/integrations', "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OAuthConnectionState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OAuthConnectionState_stateHash_key" ON "OAuthConnectionState"("stateHash");
CREATE INDEX "OAuthConnectionState_userId_provider_expiresAt_idx" ON "OAuthConnectionState"("userId", "provider", "expiresAt");
CREATE INDEX "OAuthConnectionState_expiresAt_idx" ON "OAuthConnectionState"("expiresAt");

CREATE TABLE "CardImportedField" (
  "id" TEXT NOT NULL, "virtualCardId" TEXT NOT NULL, "connectedAccountId" TEXT NOT NULL, "fieldType" TEXT NOT NULL,
  "importedValue" JSONB NOT NULL, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSyncedAt" TIMESTAMP(3),
  "syncMode" "ImportedFieldSyncMode" NOT NULL DEFAULT 'MANUAL', CONSTRAINT "CardImportedField_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CardImportedField_virtualCardId_connectedAccountId_fieldType_key" ON "CardImportedField"("virtualCardId", "connectedAccountId", "fieldType");
CREATE INDEX "CardImportedField_connectedAccountId_idx" ON "CardImportedField"("connectedAccountId");

CREATE TABLE "DevicePushToken" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "platform" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "tokenEncrypted" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3), CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DevicePushToken_tokenHash_key" ON "DevicePushToken"("tokenHash");
CREATE INDEX "DevicePushToken_userId_platform_revokedAt_idx" ON "DevicePushToken"("userId", "platform", "revokedAt");

CREATE TABLE "PlatformSuggestion" (
  "id" TEXT NOT NULL, "userId" TEXT, "profession" "ProfessionType" NOT NULL, "platformId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSuggestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformSuggestion_userId_profession_platformId_key" ON "PlatformSuggestion"("userId", "profession", "platformId");
CREATE INDEX "PlatformSuggestion_profession_sortOrder_idx" ON "PlatformSuggestion"("profession", "sortOrder");

ALTER TABLE "PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasskeyChallenge" ADD CONSTRAINT "PasskeyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthConnectionState" ADD CONSTRAINT "OAuthConnectionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardImportedField" ADD CONSTRAINT "CardImportedField_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES "VirtualCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardImportedField" ADD CONSTRAINT "CardImportedField_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DevicePushToken" ADD CONSTRAINT "DevicePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSuggestion" ADD CONSTRAINT "PlatformSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformSuggestion" ADD CONSTRAINT "PlatformSuggestion_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "LinkPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
