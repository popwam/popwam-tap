--
-- PostgreSQL database dump
--

\restrict WmDugH74QIIDHZhpcSclvLvuWVhwLEzT0w4gNVCKfm0L2T1jjfJhrJvl5AlfRhi

-- Dumped from database version 18.6 (2078fcb)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AccountDeletionRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountDeletionRequestStatus" AS ENUM (
    'REQUESTED',
    'REVIEWING',
    'CANCELLED',
    'COMPLETED'
);


--
-- Name: AccountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);


--
-- Name: ActivationClaimStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivationClaimStatus" AS ENUM (
    'PENDING_OTP',
    'VERIFIED',
    'CONSUMED',
    'EXPIRED'
);


--
-- Name: ActivationSecretState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivationSecretState" AS ENUM (
    'LEGACY',
    'SCRATCH_READY',
    'LOCKED',
    'CONSUMED',
    'REISSUE_REQUIRED'
);


--
-- Name: AdminNotificationAudience; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdminNotificationAudience" AS ENUM (
    'USER',
    'SELECTED',
    'SEGMENT',
    'TEST'
);


--
-- Name: AdminNotificationDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdminNotificationDeliveryStatus" AS ENUM (
    'SENT',
    'SUPPRESSED',
    'FAILED'
);


--
-- Name: AdminNotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AdminNotificationStatus" AS ENUM (
    'DRAFT',
    'PROCESSING',
    'SENT',
    'PARTIAL',
    'SUPPRESSED',
    'FAILED'
);


--
-- Name: AssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssignmentStatus" AS ENUM (
    'UNASSIGNED',
    'SELF_CLAIMED',
    'ADMIN_ASSIGNED',
    'TRANSFER_PENDING',
    'TRANSFERRED',
    'REVOKED'
);


--
-- Name: BackupProviderType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BackupProviderType" AS ENUM (
    'POP_CLOUD',
    'GOOGLE_DRIVE'
);


--
-- Name: CardInventoryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CardInventoryStatus" AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'PROGRAMMED',
    'ASSIGNED',
    'SOLD',
    'DAMAGED',
    'LOST'
);


--
-- Name: CardStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CardStatus" AS ENUM (
    'CREATED',
    'PROGRAMMED',
    'ACTIVE',
    'PAUSED',
    'LOST',
    'DISABLED',
    'ARCHIVED',
    'STOLEN',
    'TRANSFER_PENDING'
);


--
-- Name: CardType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CardType" AS ENUM (
    'NFC_CARD',
    'NFC_STICKER',
    'WRISTBAND',
    'QR_ONLY'
);


--
-- Name: ConnectedAccountProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConnectedAccountProvider" AS ENUM (
    'META',
    'FACEBOOK',
    'INSTAGRAM',
    'THREADS',
    'WHATSAPP_BUSINESS',
    'TIKTOK',
    'GOOGLE',
    'LINKEDIN',
    'GITHUB',
    'GITLAB',
    'YOUTUBE',
    'SPOTIFY',
    'TWITCH',
    'PINTEREST',
    'DISCORD',
    'REDDIT',
    'MICROSOFT'
);


--
-- Name: ConnectedAccountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConnectedAccountStatus" AS ENUM (
    'CONNECTED',
    'EXPIRED',
    'REVOKED',
    'ERROR'
);


--
-- Name: ContentVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContentVisibility" AS ENUM (
    'PRIVATE',
    'UNLISTED',
    'PUBLIC'
);


--
-- Name: DestinationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DestinationType" AS ENUM (
    'PROFILE',
    'WHATSAPP_BUSINESS',
    'WHATSAPP_PRIVATE',
    'PHONE',
    'EMAIL',
    'WEBSITE',
    'VCF',
    'FACEBOOK',
    'LINKEDIN',
    'GITHUB',
    'TIKTOK',
    'CUSTOM_URL',
    'INSTAGRAM',
    'X',
    'YOUTUBE',
    'TELEGRAM',
    'LOCATION',
    'FILE',
    'SOCIAL',
    'CUSTOM_FIELD'
);


--
-- Name: DeviceCredentialStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeviceCredentialStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'INVALIDATED'
);


--
-- Name: ExternalIdentityProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalIdentityProvider" AS ENUM (
    'FIREBASE'
);


--
-- Name: ExternalIdentityStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalIdentityStatus" AS ENUM (
    'ACTIVE',
    'REVOKED'
);


--
-- Name: ExternalIdentityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExternalIdentityType" AS ENUM (
    'ANONYMOUS',
    'VERIFIED'
);


--
-- Name: FeatureRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FeatureRequestStatus" AS ENUM (
    'NEW',
    'REVIEWING',
    'PLANNED',
    'IN_PROGRESS',
    'RELEASED',
    'REJECTED'
);


--
-- Name: FriendNotificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendNotificationStatus" AS ENUM (
    'PENDING',
    'SENT',
    'SUPPRESSED',
    'FAILED'
);


--
-- Name: FriendNotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendNotificationType" AS ENUM (
    'FRIEND_REQUEST_RECEIVED',
    'FRIEND_REQUEST_ACCEPTED'
);


--
-- Name: FriendPrivacyLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendPrivacyLevel" AS ENUM (
    'FULL_PROFILE',
    'CONTACT_ONLY',
    'SELECTED_LINKS',
    'BUSINESS_ONLY',
    'NOTHING'
);


--
-- Name: FriendRequestSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendRequestSource" AS ENUM (
    'SEARCH',
    'PROFILE',
    'NEARBY'
);


--
-- Name: FriendRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendRequestStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: FriendshipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FriendshipStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED'
);


--
-- Name: ImportedFieldSyncMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ImportedFieldSyncMode" AS ENUM (
    'MANUAL',
    'AUTO'
);


--
-- Name: InventoryItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryItemType" AS ENUM (
    'BLANK_CARD',
    'BLANK_STICKER',
    'BLANK_WRISTBAND',
    'QR_PRODUCT',
    'PACKAGING',
    'ACCESSORY',
    'OTHER'
);


--
-- Name: InventoryMovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryMovementType" AS ENUM (
    'PURCHASE',
    'CARD_BATCH_CREATED',
    'RESERVED',
    'SOLD',
    'RETURNED',
    'DAMAGED',
    'LOST',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'PRODUCTION',
    'ASSIGNMENT',
    'SALE',
    'RETURN',
    'DAMAGE',
    'ADJUSTMENT'
);


--
-- Name: LegalConsentSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LegalConsentSource" AS ENUM (
    'WEB',
    'ANDROID',
    'ONBOARDING'
);


--
-- Name: LegalDocumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LegalDocumentStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: LegalDocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LegalDocumentType" AS ENUM (
    'TERMS',
    'PRIVACY',
    'COMMUNITY_GUIDELINES',
    'NEARBY_PRIVACY',
    'TERMS_OF_USE',
    'TERMS_OF_SERVICE',
    'USER_AGREEMENT',
    'COOKIE_POLICY',
    'OTHER'
);


--
-- Name: LogicalDeviceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LogicalDeviceType" AS ENUM (
    'WEB_BROWSER',
    'MOBILE_APP'
);


--
-- Name: MessageReportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MessageReportStatus" AS ENUM (
    'OPEN',
    'REVIEWING',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: MobileAuthChallengeState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MobileAuthChallengeState" AS ENUM (
    'OPEN',
    'PHONE_VERIFIED',
    'CONSUMED',
    'REVOKED'
);


--
-- Name: MobileBiometricOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MobileBiometricOutcome" AS ENUM (
    'ENROLLED',
    'UNAVAILABLE'
);


--
-- Name: MobileBiometricPolicy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MobileBiometricPolicy" AS ENUM (
    'REQUIRED_WHEN_AVAILABLE'
);


--
-- Name: MobileEnrollmentState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MobileEnrollmentState" AS ENUM (
    'PASSKEY_REQUIRED',
    'BIOMETRIC_REQUIRED',
    'READY_FOR_UPGRADE',
    'COMPLETED',
    'ABORTED'
);


--
-- Name: NearbyPresenceSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NearbyPresenceSource" AS ENUM (
    'WEB',
    'ANDROID'
);


--
-- Name: NearbyRateLimitKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NearbyRateLimitKind" AS ENUM (
    'ENABLE',
    'PRESENCE_UPDATE',
    'DISCOVERY'
);


--
-- Name: OnboardingConditionOperator; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingConditionOperator" AS ENUM (
    'EQUALS',
    'NOT_EQUALS',
    'IN',
    'NOT_IN',
    'IS_TRUE',
    'IS_FALSE',
    'ANSWERED',
    'NOT_ANSWERED'
);


--
-- Name: OnboardingDefinitionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingDefinitionStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'RETIRED'
);


--
-- Name: OnboardingMappingKey; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingMappingKey" AS ENUM (
    'PROFILE_DISPLAY_NAME',
    'ABOUT_BIO',
    'CONTACT_PHONE',
    'CONTACT_EMAIL',
    'CONTACT_LOCATION',
    'JOB_TITLE',
    'ORGANIZATION_NAME',
    'SOCIAL_LINK',
    'SERVICE_CREATE',
    'BRANCH_CREATE',
    'GALLERY_ATTACH',
    'SETUP_LATER'
);


--
-- Name: OnboardingQuestionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingQuestionType" AS ENUM (
    'TEXT',
    'TEXTAREA',
    'PHONE',
    'EMAIL',
    'URL',
    'NUMBER',
    'CURRENCY',
    'BOOLEAN',
    'SINGLE_SELECT',
    'MULTI_SELECT',
    'IMAGE',
    'LOCATION',
    'TIME',
    'DAY_HOURS'
);


--
-- Name: OnboardingStepType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OnboardingStepType" AS ENUM (
    'FORM',
    'REVIEW'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
    'NEW',
    'PAYMENT_PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED'
);


--
-- Name: OrgRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrgRole" AS ENUM (
    'OWNER',
    'ORG_ADMIN',
    'MEMBER'
);


--
-- Name: OtpDeliveryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OtpDeliveryStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'VERIFIED',
    'EXPIRED'
);


--
-- Name: OtpPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OtpPurpose" AS ENUM (
    'LOGIN',
    'ACTIVATION',
    'STEP_UP',
    'CHANGE_PHONE'
);


--
-- Name: PasskeyChallengeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PasskeyChallengeType" AS ENUM (
    'REGISTER',
    'AUTHENTICATE',
    'AUTHENTICATE_MOBILE',
    'STEP_UP'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID',
    'REFUNDED'
);


--
-- Name: PhoneOtpChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PhoneOtpChannel" AS ENUM (
    'SMS',
    'WHATSAPP'
);


--
-- Name: ProducedTagStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProducedTagStatus" AS ENUM (
    'UNASSIGNED',
    'RESERVED',
    'ASSIGNED',
    'ACTIVATED',
    'DISABLED',
    'DAMAGED'
);


--
-- Name: ProductInventoryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductInventoryStatus" AS ENUM (
    'IN_STOCK',
    'LOW_STOCK',
    'OUT_OF_STOCK',
    'PREORDER',
    'UNAVAILABLE'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'HIDDEN',
    'ARCHIVED'
);


--
-- Name: ProductionBatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductionBatchStatus" AS ENUM (
    'DRAFT',
    'GENERATED',
    'PRINTED',
    'CLOSED',
    'CANCELLED'
);


--
-- Name: ProfessionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfessionType" AS ENUM (
    'PERSONAL',
    'BUSINESS_OWNER',
    'COMPANY',
    'DEVELOPER',
    'DESIGNER',
    'CREATOR',
    'MARKETER',
    'REAL_ESTATE',
    'DOCTOR',
    'LAWYER',
    'MUSICIAN',
    'PHOTOGRAPHER',
    'FREELANCER',
    'RESTAURANT',
    'SHOP'
);


--
-- Name: ProfileAccess; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileAccess" AS ENUM (
    'PUBLIC',
    'UNLISTED',
    'PRIVATE'
);


--
-- Name: ProfileEntitlementSourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileEntitlementSourceType" AS ENUM (
    'PLAN',
    'PRODUCT',
    'PURCHASE',
    'ADMIN',
    'PROMOTION',
    'LEGACY'
);


--
-- Name: ProfileEntitlementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileEntitlementStatus" AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);


--
-- Name: ProfileFieldType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileFieldType" AS ENUM (
    'TEXT',
    'PHONE',
    'EMAIL',
    'URL',
    'WHATSAPP',
    'LOCATION',
    'FILE',
    'SOCIAL',
    'CUSTOM'
);


--
-- Name: ProfileKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileKind" AS ENUM (
    'PERSONAL',
    'BUSINESS'
);


--
-- Name: ProfileLifecycle; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileLifecycle" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'PAUSED',
    'ARCHIVED'
);


--
-- Name: ProfileMediaPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileMediaPurpose" AS ENUM (
    'AVATAR',
    'COVER',
    'LOGO',
    'GALLERY',
    'ONBOARDING_IMAGE'
);


--
-- Name: ProfileMediaState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileMediaState" AS ENUM (
    'TEMPORARY',
    'DRAFT_ATTACHED',
    'PUBLISHED',
    'ORPHANED',
    'DELETED'
);


--
-- Name: ProfileModuleVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileModuleVisibility" AS ENUM (
    'PUBLIC',
    'FRIENDS',
    'ONLY_ME',
    'UNLISTED'
);


--
-- Name: ProfileRevisionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileRevisionStatus" AS ENUM (
    'PUBLISHED',
    'SUPERSEDED'
);


--
-- Name: ProfileShowcaseItemType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileShowcaseItemType" AS ENUM (
    'PRODUCT',
    'SERVICE'
);


--
-- Name: ProfileTheme; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileTheme" AS ENUM (
    'CLASSIC_DARK',
    'CLASSIC_LIGHT',
    'ELEGANT_DARK',
    'ELEGANT_LIGHT',
    'BUSINESS_DARK',
    'BUSINESS_LIGHT'
);


--
-- Name: ProfileType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileType" AS ENUM (
    'PERSONAL',
    'ORGANIZATION'
);


--
-- Name: ProfileVerificationAuthority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileVerificationAuthority" AS ENUM (
    'SYSTEM',
    'ADMIN',
    'PROVIDER'
);


--
-- Name: ProfileVerificationKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileVerificationKind" AS ENUM (
    'IDENTITY',
    'BUSINESS',
    'PROFESSIONAL',
    'MEDICAL',
    'CONTACT',
    'DOMAIN'
);


--
-- Name: ProfileVerificationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProfileVerificationStatus" AS ENUM (
    'NOT_STARTED',
    'REQUIRED',
    'IN_PROGRESS',
    'PENDING',
    'VERIFIED',
    'REJECTED',
    'NEEDS_UPDATE',
    'EXPIRED'
);


--
-- Name: PurchaseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PurchaseStatus" AS ENUM (
    'DRAFT',
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: QuotaRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuotaRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: QuotaResource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuotaResource" AS ENUM (
    'MAX_STORAGE_BYTES',
    'MAX_LINKS'
);


--
-- Name: SessionAuthMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SessionAuthMethod" AS ENUM (
    'OTP',
    'PASSKEY',
    'PASSWORD',
    'LEGACY',
    'DEVICE_CREDENTIAL'
);


--
-- Name: StepUpMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StepUpMethod" AS ENUM (
    'PASSKEY',
    'OTP'
);


--
-- Name: StepUpPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StepUpPurpose" AS ENUM (
    'CHANGE_PHONE',
    'DELETE_ACCOUNT',
    'ADD_PASSKEY',
    'REMOVE_PASSKEY',
    'REVOKE_SESSION',
    'REVOKE_OTHER_SESSIONS',
    'PRODUCT_LOST',
    'PRODUCT_TRANSFER',
    'SECURITY_SETTINGS',
    'LINK_DEVICE_APPROVAL'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'TRIALING',
    'EXPIRED',
    'CANCELED',
    'REQUESTED',
    'PAYMENT_PENDING',
    'PAYMENT_VERIFICATION',
    'APPROVED',
    'SUSPENDED',
    'REJECTED'
);


--
-- Name: SystemRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SystemRole" AS ENUM (
    'ADMIN',
    'USER',
    'STAFF',
    'SUPER_ADMIN'
);


--
-- Name: TagEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TagEventType" AS ENUM (
    'SCAN',
    'REDIRECT',
    'PROFILE_VIEW',
    'STATUS_CHANGE',
    'CREATED',
    'UPDATED'
);


--
-- Name: TagMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TagMode" AS ENUM (
    'PROFILE',
    'REDIRECT'
);


--
-- Name: TagStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TagStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'LOST',
    'DISABLED'
);


--
-- Name: TagTransferStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TagTransferStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: UserBlockSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserBlockSource" AS ENUM (
    'FRIENDS',
    'PROFILE',
    'REPORT',
    'NEARBY'
);


--
-- Name: UserFontPreference; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserFontPreference" AS ENUM (
    'DEFAULT',
    'CAIRO',
    'ABEEZEE'
);


--
-- Name: UserLanguagePreference; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserLanguagePreference" AS ENUM (
    'SYSTEM',
    'ENGLISH',
    'ARABIC'
);


--
-- Name: UserReportCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserReportCategory" AS ENUM (
    'SPAM',
    'HARASSMENT',
    'IMPERSONATION',
    'INAPPROPRIATE_CONTENT',
    'SCAM',
    'PRIVACY',
    'OTHER'
);


--
-- Name: UserReportSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserReportSource" AS ENUM (
    'FRIENDS',
    'PROFILE',
    'NEARBY'
);


--
-- Name: UserReportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserReportStatus" AS ENUM (
    'OPEN',
    'REVIEWING',
    'RESOLVED',
    'DISMISSED',
    'ACTIONED'
);


--
-- Name: UserThemePreference; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserThemePreference" AS ENUM (
    'SYSTEM',
    'LIGHT',
    'DARK'
);


--
-- Name: VirtualCardStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VirtualCardStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'ARCHIVED'
);


--
-- Name: VirtualCardType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VirtualCardType" AS ENUM (
    'PERSONAL',
    'PROFESSIONAL',
    'CREATOR',
    'BUSINESS'
);


--
-- Name: WalletPassStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WalletPassStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'DISABLED',
    'ERROR'
);


--
-- Name: WalletPlatform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WalletPlatform" AS ENUM (
    'GOOGLE',
    'APPLE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: AccountDeletionRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AccountDeletionRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    status public."AccountDeletionRequestStatus" DEFAULT 'REQUESTED'::public."AccountDeletionRequestStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone
);


--
-- Name: ActivationAttempt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivationAttempt" (
    id text NOT NULL,
    "cardId" text NOT NULL,
    success boolean NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorId" text,
    "contextFingerprintHash" text,
    "networkFingerprintHash" text,
    method text,
    "failureClass" text
);


--
-- Name: ActivationClaimSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivationClaimSession" (
    id text NOT NULL,
    "sessionTokenHash" text NOT NULL,
    "activationTokenHash" text NOT NULL,
    "cardId" text NOT NULL,
    "userId" text,
    phone text,
    status public."ActivationClaimStatus" DEFAULT 'PENDING_OTP'::public."ActivationClaimStatus" NOT NULL,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: AdminNotificationCampaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminNotificationCampaign" (
    id text NOT NULL,
    "createdById" text NOT NULL,
    status public."AdminNotificationStatus" DEFAULT 'DRAFT'::public."AdminNotificationStatus" NOT NULL,
    "audienceType" public."AdminNotificationAudience" NOT NULL,
    audience jsonb NOT NULL,
    title jsonb NOT NULL,
    body jsonb NOT NULL,
    "defaultLocale" text DEFAULT 'en'::text NOT NULL,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    "deepLink" text,
    "imageUrl" text,
    "recipientCount" integer DEFAULT 0 NOT NULL,
    "successCount" integer DEFAULT 0 NOT NULL,
    "suppressedCount" integer DEFAULT 0 NOT NULL,
    "failureCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sentAt" timestamp(3) without time zone
);


--
-- Name: AdminNotificationDelivery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminNotificationDelivery" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "recipientUserId" text NOT NULL,
    status public."AdminNotificationDeliveryStatus" NOT NULL,
    "attemptedTokens" integer DEFAULT 0 NOT NULL,
    "successfulTokens" integer DEFAULT 0 NOT NULL,
    "failureCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "actorId" text,
    operation text NOT NULL,
    route text,
    "targetId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuthTicket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuthTicket" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "authMethod" public."SessionAuthMethod" DEFAULT 'OTP'::public."SessionAuthMethod" NOT NULL
);


--
-- Name: BrandSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BrandSettings" (
    id text DEFAULT 'default'::text NOT NULL,
    "mainLogoUrl" text,
    "mainLogoStorageKey" text,
    "lightLogoUrl" text,
    "lightLogoStorageKey" text,
    "darkLogoUrl" text,
    "darkLogoStorageKey" text,
    "appIconUrl" text,
    "appIconStorageKey" text,
    "faviconUrl" text,
    "faviconStorageKey" text,
    "appleTouchIconUrl" text,
    "appleTouchIconStorageKey" text,
    "pwaIcon192Url" text,
    "pwaIcon512Url" text,
    "defaultOgImageUrl" text,
    "defaultOgImageStorageKey" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Card" (
    id text NOT NULL,
    "serialNumber" text NOT NULL,
    "publicSlug" text NOT NULL,
    "publicToken" text NOT NULL,
    "activationTokenHash" text NOT NULL,
    "cardType" public."CardType" NOT NULL,
    "batchId" text,
    "ownerId" text,
    "organizationId" text,
    "profileId" text,
    "activeDestinationId" text,
    "assignmentStatus" public."AssignmentStatus" DEFAULT 'UNASSIGNED'::public."AssignmentStatus" NOT NULL,
    "cardStatus" public."CardStatus" DEFAULT 'CREATED'::public."CardStatus" NOT NULL,
    "inventoryStatus" public."CardInventoryStatus" DEFAULT 'AVAILABLE'::public."CardInventoryStatus" NOT NULL,
    "programmedAt" timestamp(3) without time zone,
    "assignedAt" timestamp(3) without time zone,
    "activatedAt" timestamp(3) without time zone,
    "lastOpenedAt" timestamp(3) without time zone,
    "openCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "activationTokenConsumedAt" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone,
    "virtualCardId" text,
    "displayLabel" text,
    "activationSecretHash" text,
    "activationSecretState" public."ActivationSecretState" DEFAULT 'LEGACY'::public."ActivationSecretState" NOT NULL,
    "activationSecretVersion" integer,
    "activationSecretConsumedAt" timestamp(3) without time zone,
    "activationAttemptWindowAt" timestamp(3) without time zone,
    "activationFailedAttempts" integer DEFAULT 0 NOT NULL,
    "activationLockoutUntil" timestamp(3) without time zone
);


--
-- Name: CardBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CardBatch" (
    id text NOT NULL,
    name text NOT NULL,
    "supplierId" text,
    "inventoryItemId" text,
    "cardType" public."CardType" NOT NULL,
    quantity integer NOT NULL,
    "serialPrefix" text NOT NULL,
    "startingSerialNumber" integer NOT NULL,
    "publicSlugPrefix" text NOT NULL,
    "unitPurchaseCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "unitProgrammingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "unitPackagingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "expectedSellingPrice" numeric(14,2) DEFAULT 0 NOT NULL,
    notes text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "organizationId" text
);


--
-- Name: CardImportedField; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CardImportedField" (
    id text NOT NULL,
    "virtualCardId" text NOT NULL,
    "connectedAccountId" text NOT NULL,
    "fieldType" text NOT NULL,
    "importedValue" jsonb NOT NULL,
    "importedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "syncMode" public."ImportedFieldSyncMode" DEFAULT 'MANUAL'::public."ImportedFieldSyncMode" NOT NULL
);


--
-- Name: CardOpenDaily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CardOpenDaily" (
    id text NOT NULL,
    "cardId" text NOT NULL,
    date date NOT NULL,
    "openCount" integer DEFAULT 0 NOT NULL
);


--
-- Name: Chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Chat" (
    id text NOT NULL,
    "directKey" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ChatMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMember" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    "userId" text NOT NULL,
    "lastReadAt" timestamp(3) without time zone,
    muted boolean DEFAULT false NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ConnectedAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConnectedAccount" (
    id text NOT NULL,
    "userId" text NOT NULL,
    provider public."ConnectedAccountProvider" NOT NULL,
    "providerAccountId" text NOT NULL,
    status public."ConnectedAccountStatus" DEFAULT 'CONNECTED'::public."ConnectedAccountStatus" NOT NULL,
    "displayName" text,
    username text,
    "avatarUrl" text,
    "profileUrl" text,
    "accountType" text,
    metadata jsonb,
    "followersCount" bigint,
    "followersUpdatedAt" timestamp(3) without time zone,
    "accessTokenEncrypted" bytea,
    "refreshTokenEncrypted" bytea,
    "tokenExpiresAt" timestamp(3) without time zone,
    scopes text[] DEFAULT ARRAY[]::text[],
    "lastSyncedAt" timestamp(3) without time zone,
    "lastErrorCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "disconnectedAt" timestamp(3) without time zone
);


--
-- Name: ContentAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentAttachment" (
    id text NOT NULL,
    "contentEntryId" text NOT NULL,
    "uploadedFileId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: ContentEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentEntry" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "displayLabel" text NOT NULL,
    "normalizedName" text NOT NULL,
    slug text,
    "titleAr" text,
    "titleEn" text,
    "summaryAr" text,
    "summaryEn" text,
    "bodyAr" text,
    "bodyEn" text,
    "externalUrl" text,
    "coverImageUrl" text,
    category text,
    visibility public."ContentVisibility" DEFAULT 'PRIVATE'::public."ContentVisibility" NOT NULL,
    "ctaAr" text,
    "ctaEn" text,
    "iconKey" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContentPublication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContentPublication" (
    id text NOT NULL,
    "contentEntryId" text NOT NULL,
    "virtualCardId" text NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    "userId" text,
    name text NOT NULL,
    phone text,
    email text,
    "organizationName" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Destination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Destination" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text,
    "profileId" text,
    title text NOT NULL,
    type public."DestinationType" NOT NULL,
    url text NOT NULL,
    icon text,
    "isOfflineCapable" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "iconKey" text,
    "customIconUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "customIconStorageKey" text,
    "customIconType" text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "titleAr" text,
    "titleEn" text,
    "linkPlatformId" text,
    "publicShareKey" text
);


--
-- Name: DevicePushToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DevicePushToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    platform text NOT NULL,
    "tokenHash" text NOT NULL,
    "tokenEncrypted" bytea NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "deviceSessionId" text
);


--
-- Name: DeviceSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeviceSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenFamilyHash" text NOT NULL,
    "deviceName" text,
    platform text NOT NULL,
    "appVersion" text,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deviceType" public."LogicalDeviceType" DEFAULT 'MOBILE_APP'::public."LogicalDeviceType" NOT NULL,
    "userLabel" text,
    "browserName" text,
    "appName" text,
    "authMethod" public."SessionAuthMethod" DEFAULT 'LEGACY'::public."SessionAuthMethod" NOT NULL,
    "lastAuthenticatedAt" timestamp(3) without time zone
);


--
-- Name: Expense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric(14,2) NOT NULL,
    "expenseDate" timestamp(3) without time zone NOT NULL,
    "paymentMethod" text,
    "referenceNumber" text,
    "attachmentFileId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ExpenseCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExpenseCategory" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: ExternalIdentity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExternalIdentity" (
    id text NOT NULL,
    "userId" text,
    provider public."ExternalIdentityProvider" NOT NULL,
    "providerSubject" text NOT NULL,
    "identityType" public."ExternalIdentityType" DEFAULT 'ANONYMOUS'::public."ExternalIdentityType" NOT NULL,
    status public."ExternalIdentityStatus" DEFAULT 'ACTIVE'::public."ExternalIdentityStatus" NOT NULL,
    "linkedAt" timestamp(3) without time zone,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FeatureComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureComment" (
    id text NOT NULL,
    "featureRequestId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FeatureRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureRequest" (
    id text NOT NULL,
    "authorId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public."FeatureRequestStatus" DEFAULT 'NEW'::public."FeatureRequestStatus" NOT NULL,
    "adminResponse" text,
    "mergedIntoId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FeatureVote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FeatureVote" (
    id text NOT NULL,
    "featureRequestId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Follow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Follow" (
    id text NOT NULL,
    "followerId" text NOT NULL,
    "followingId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "Follow_not_self_check" CHECK (("followerId" <> "followingId"))
);


--
-- Name: FriendNotificationEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FriendNotificationEvent" (
    id text NOT NULL,
    "recipientUserId" text NOT NULL,
    "actorUserId" text,
    "requestId" text,
    type public."FriendNotificationType" NOT NULL,
    status public."FriendNotificationStatus" DEFAULT 'PENDING'::public."FriendNotificationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "availableAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sentAt" timestamp(3) without time zone
);


--
-- Name: FriendPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FriendPreference" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    "friendId" text NOT NULL,
    favorite boolean DEFAULT false NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FriendPrivacyRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FriendPrivacyRule" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    "friendId" text NOT NULL,
    level public."FriendPrivacyLevel" DEFAULT 'FULL_PROFILE'::public."FriendPrivacyLevel" NOT NULL,
    "selectedDestinationIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FriendRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FriendRequest" (
    id text NOT NULL,
    "pairKey" text NOT NULL,
    "requesterUserId" text NOT NULL,
    "recipientUserId" text NOT NULL,
    status public."FriendRequestStatus" DEFAULT 'PENDING'::public."FriendRequestStatus" NOT NULL,
    source public."FriendRequestSource" DEFAULT 'SEARCH'::public."FriendRequestSource" NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: FriendsPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FriendsPreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "socialKey" text NOT NULL,
    "socialProfileId" text,
    "allowFriendRequests" boolean DEFAULT true NOT NULL,
    "discoverableByProfileSearch" boolean DEFAULT false NOT NULL,
    "profileConfiguredAt" timestamp(3) without time zone,
    "privacyConfiguredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Friendship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Friendship" (
    id text NOT NULL,
    "userAId" text NOT NULL,
    "userBId" text NOT NULL,
    "requestedById" text NOT NULL,
    "blockedById" text,
    status public."FriendshipStatus" DEFAULT 'PENDING'::public."FriendshipStatus" NOT NULL,
    "favoriteA" boolean DEFAULT false NOT NULL,
    "favoriteB" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryBatch" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "batchCode" text NOT NULL,
    "producedQuantity" integer NOT NULL,
    "availableQuantity" integer NOT NULL,
    "assignedQuantity" integer DEFAULT 0 NOT NULL,
    "damagedQuantity" integer DEFAULT 0 NOT NULL,
    "unitCost" numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryItem" (
    id text NOT NULL,
    sku text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    type public."InventoryItemType" NOT NULL,
    "supplierId" text,
    "quantityOnHand" integer DEFAULT 0 NOT NULL,
    "quantityReserved" integer DEFAULT 0 NOT NULL,
    "reorderLevel" integer DEFAULT 0 NOT NULL,
    "unitCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "sellingPrice" numeric(14,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "imageUrl" text,
    "imageStorageKey" text,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: InventoryMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryMovement" (
    id text NOT NULL,
    "inventoryItemId" text NOT NULL,
    type public."InventoryMovementType" NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(14,2),
    "referenceType" text,
    "referenceId" text,
    notes text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LegalDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LegalDocument" (
    id text NOT NULL,
    "documentType" public."LegalDocumentType" NOT NULL,
    version text NOT NULL,
    locale text NOT NULL,
    "contentHash" text NOT NULL,
    "effectiveAt" timestamp(3) without time zone NOT NULL,
    required boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    slug text DEFAULT ''::text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    status public."LegalDocumentStatus" DEFAULT 'DRAFT'::public."LegalDocumentStatus" NOT NULL,
    "requiresAcceptance" boolean DEFAULT true NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LinkPlatform; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LinkPlatform" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    slug text NOT NULL,
    "iconKey" text NOT NULL,
    "customIconUrl" text,
    placeholder text NOT NULL,
    "validationPattern" text,
    category text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "allowCustomLabel" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "validationRules" jsonb,
    "inputType" text DEFAULT 'FULL_URL'::text NOT NULL,
    "urlTemplate" text,
    "androidAppUrl" text,
    "iosAppUrl" text,
    "webFallback" text,
    "helpAr" text,
    "helpEn" text,
    "allowCustomIcon" boolean DEFAULT false NOT NULL,
    "supportsOAuth" boolean DEFAULT false NOT NULL,
    "oauthProvider" public."ConnectedAccountProvider"
);


--
-- Name: Membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Membership" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL,
    role public."OrgRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    "senderId" text NOT NULL,
    body text,
    "attachmentFileId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MessageReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MessageReport" (
    id text NOT NULL,
    "messageId" text NOT NULL,
    "reporterId" text NOT NULL,
    reason text NOT NULL,
    status public."MessageReportStatus" DEFAULT 'OPEN'::public."MessageReportStatus" NOT NULL,
    "reviewedById" text,
    "reviewNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MobileAuthChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MobileAuthChallenge" (
    id text NOT NULL,
    "userId" text,
    "phoneHash" text NOT NULL,
    "accountState" text NOT NULL,
    "allowedMethods" text[] DEFAULT ARRAY[]::text[],
    "preferredMethod" text NOT NULL,
    "otpLength" integer DEFAULT 6 NOT NULL,
    "otpResendAfterSeconds" integer DEFAULT 60 NOT NULL,
    "otpExpiresAfterSeconds" integer DEFAULT 300 NOT NULL,
    "otpMaximumAttempts" integer DEFAULT 5 NOT NULL,
    "biometricPolicy" public."MobileBiometricPolicy" DEFAULT 'REQUIRED_WHEN_AVAILABLE'::public."MobileBiometricPolicy" NOT NULL,
    state public."MobileAuthChallengeState" DEFAULT 'OPEN'::public."MobileAuthChallengeState" NOT NULL,
    "deviceChallengeHash" text,
    "deviceChallengeExpiresAt" timestamp(3) without time zone,
    "deviceChallengeConsumedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MobileDeviceCredential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MobileDeviceCredential" (
    id text NOT NULL,
    "credentialId" text NOT NULL,
    "userId" text NOT NULL,
    "enrollmentSessionId" text NOT NULL,
    "deviceSessionId" text,
    "publicKey" bytea NOT NULL,
    algorithm text DEFAULT 'ES256'::text NOT NULL,
    platform text DEFAULT 'ANDROID'::text NOT NULL,
    "biometricType" text NOT NULL,
    status public."DeviceCredentialStatus" DEFAULT 'ACTIVE'::public."DeviceCredentialStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "invalidatedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone
);


--
-- Name: MobileEnrollmentSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MobileEnrollmentSession" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "challengeId" text NOT NULL,
    "userId" text NOT NULL,
    state public."MobileEnrollmentState" DEFAULT 'PASSKEY_REQUIRED'::public."MobileEnrollmentState" NOT NULL,
    "biometricPolicy" public."MobileBiometricPolicy" DEFAULT 'REQUIRED_WHEN_AVAILABLE'::public."MobileBiometricPolicy" NOT NULL,
    "biometricOutcome" public."MobileBiometricOutcome",
    "passkeyCredentialId" text,
    "deviceChallengeHash" text,
    "deviceChallengeExpiresAt" timestamp(3) without time zone,
    "deviceChallengeConsumedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "completionKeyHash" text,
    "completedDeviceSessionId" text,
    "completionRetriedAt" timestamp(3) without time zone,
    "abortedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MobileRefreshToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MobileRefreshToken" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "familyId" text NOT NULL,
    "userId" text NOT NULL,
    "deviceName" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deviceSessionId" text
);


--
-- Name: NearbyPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NearbyPreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "visibleUntil" timestamp(3) without time zone,
    "virtualCardId" text,
    audience text DEFAULT 'EVERYONE_OPTED_IN'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    discoverable boolean DEFAULT false NOT NULL,
    generation integer DEFAULT 0 NOT NULL,
    "activatedAt" timestamp(3) without time zone,
    "disabledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NearbyPresence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NearbyPresence" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "coarseCell" text NOT NULL,
    "cellVersion" integer DEFAULT 1 NOT NULL,
    generation integer NOT NULL,
    "sessionHash" text NOT NULL,
    source public."NearbyPresenceSource" NOT NULL,
    "cellWindowStartedAt" timestamp(3) without time zone NOT NULL,
    "cellChangesInWindow" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NearbyRateLimitBucket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NearbyRateLimitBucket" (
    id text NOT NULL,
    "userId" text NOT NULL,
    kind public."NearbyRateLimitKind" NOT NULL,
    "windowStart" timestamp(3) without time zone NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NotificationPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationPreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "generalEnabled" boolean DEFAULT true NOT NULL,
    "securityEnabled" boolean DEFAULT true NOT NULL,
    "productsEnabled" boolean DEFAULT true NOT NULL,
    "marketingEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "socialEnabled" boolean DEFAULT true NOT NULL
);


--
-- Name: OAuthConnectionState; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OAuthConnectionState" (
    id text NOT NULL,
    "userId" text NOT NULL,
    provider public."ConnectedAccountProvider" NOT NULL,
    "stateHash" text NOT NULL,
    "codeVerifier" text,
    "returnPath" text DEFAULT '/dashboard/integrations'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OnboardingDefinition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingDefinition" (
    id text NOT NULL,
    key text NOT NULL,
    version integer NOT NULL,
    "profileKind" public."ProfileKind" NOT NULL,
    "categoryId" text,
    "templateId" text,
    status public."OnboardingDefinitionStatus" DEFAULT 'DRAFT'::public."OnboardingDefinitionStatus" NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OnboardingProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "currentStep" integer DEFAULT 1 NOT NULL,
    "completedAt" timestamp(3) without time zone,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "profileId" text,
    "definitionId" text,
    "definitionVersion" integer,
    "currentStepKey" text,
    revision integer DEFAULT 0 NOT NULL,
    "draftAnswers" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "initialAnswers" jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: OnboardingQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingQuestion" (
    id text NOT NULL,
    "stepId" text NOT NULL,
    key text NOT NULL,
    "questionType" public."OnboardingQuestionType" NOT NULL,
    "labelEn" text NOT NULL,
    "labelAr" text NOT NULL,
    "helpEn" text,
    "helpAr" text,
    required boolean DEFAULT false NOT NULL,
    "sortOrder" integer NOT NULL,
    "mappingKey" public."OnboardingMappingKey" NOT NULL,
    "minLength" integer,
    "maxLength" integer,
    "minValue" numeric(14,2),
    "maxValue" numeric(14,2),
    "maxItems" integer,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OnboardingQuestionCondition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingQuestionCondition" (
    id text NOT NULL,
    "questionId" text NOT NULL,
    "sourceQuestionKey" text NOT NULL,
    operator public."OnboardingConditionOperator" NOT NULL,
    "expectedValues" text[]
);


--
-- Name: OnboardingQuestionOption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingQuestionOption" (
    id text NOT NULL,
    "questionId" text NOT NULL,
    key text NOT NULL,
    "labelEn" text NOT NULL,
    "labelAr" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: OnboardingStep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OnboardingStep" (
    id text NOT NULL,
    "definitionId" text NOT NULL,
    key text NOT NULL,
    "sortOrder" integer NOT NULL,
    "titleEn" text NOT NULL,
    "titleAr" text NOT NULL,
    "descriptionEn" text,
    "descriptionAr" text,
    "stepType" public."OnboardingStepType" DEFAULT 'FORM'::public."OnboardingStepType" NOT NULL,
    required boolean DEFAULT true NOT NULL,
    "moduleDefinitionId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "customerId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'DRAFT'::public."OrderStatus" NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    discount numeric(14,2) DEFAULT 0 NOT NULL,
    "shippingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    "paidAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    notes text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "cardId" text,
    "inventoryItemId" text,
    description text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(14,2) NOT NULL,
    total numeric(14,2) NOT NULL
);


--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "ownerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OtpChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OtpChallenge" (
    id text NOT NULL,
    phone text NOT NULL,
    purpose public."OtpPurpose" NOT NULL,
    "claimSessionId" text,
    "otpHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "deliveryStatus" public."OtpDeliveryStatus" DEFAULT 'PENDING'::public."OtpDeliveryStatus" NOT NULL,
    provider text NOT NULL,
    "providerMessageId" text,
    "lastSentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestIpHash" text,
    channel public."PhoneOtpChannel" DEFAULT 'SMS'::public."PhoneOtpChannel" NOT NULL,
    "securityUserId" text,
    "stepUpPurpose" public."StepUpPurpose",
    "sessionBindingHash" text
);


--
-- Name: OtpSendLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OtpSendLog" (
    id text NOT NULL,
    "phoneHash" text NOT NULL,
    purpose public."OtpPurpose" NOT NULL,
    status public."OtpDeliveryStatus" NOT NULL,
    provider text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "responseCode" text,
    "messageId" text,
    cost text
);


--
-- Name: PasskeyChallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasskeyChallenge" (
    id text NOT NULL,
    "userId" text,
    "challengeHash" text NOT NULL,
    type public."PasskeyChallengeType" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stepUpPurpose" public."StepUpPurpose",
    "sessionBindingHash" text,
    "enrollmentSessionId" text
);


--
-- Name: PasskeyCredential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasskeyCredential" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "credentialId" text NOT NULL,
    "publicKey" bytea NOT NULL,
    counter bigint DEFAULT 0 NOT NULL,
    transports text[] DEFAULT ARRAY[]::text[],
    "deviceType" text,
    "backedUp" boolean DEFAULT false NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "deviceSessionId" text
);


--
-- Name: PhoneCountryConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PhoneCountryConfig" (
    id text NOT NULL,
    iso2 text NOT NULL,
    iso3 text,
    name text NOT NULL,
    "localizedNames" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "dialCode" text NOT NULL,
    "flagEmoji" text,
    "phonePlaceholder" text,
    enabled boolean DEFAULT false NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Plan" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "maxProfiles" integer DEFAULT 1 NOT NULL,
    "maxLinks" integer DEFAULT 5 NOT NULL,
    "maxCustomFields" integer DEFAULT 3 NOT NULL,
    "maxTags" integer DEFAULT 1 NOT NULL,
    "maxUploads" integer DEFAULT 0 NOT NULL,
    "maxStorageBytes" bigint DEFAULT 0 NOT NULL,
    "allowCustomSlug" boolean DEFAULT false NOT NULL,
    "allowThemes" boolean DEFAULT false NOT NULL,
    "allowCustomTheme" boolean DEFAULT false NOT NULL,
    "allowAnalytics" boolean DEFAULT false NOT NULL,
    "allowFileUploads" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "nameAr" text,
    "nameEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "allowCustomIcons" boolean DEFAULT false NOT NULL,
    "analyticsAllowed" boolean DEFAULT false NOT NULL,
    "availableProfileTypes" jsonb,
    "availableThemes" jsonb,
    "customSlugAllowed" boolean DEFAULT false NOT NULL,
    "maxCards" integer DEFAULT 1 NOT NULL,
    "maxFiles" integer DEFAULT 0 NOT NULL,
    "maxVirtualCards" integer DEFAULT 1 NOT NULL,
    "allowBusinessCards" boolean DEFAULT false NOT NULL,
    "allowWalletPasses" boolean DEFAULT false NOT NULL,
    "allowCustomLinks" boolean DEFAULT false NOT NULL,
    "allowInstallableProfiles" boolean DEFAULT false NOT NULL,
    "storefrontEnabled" boolean DEFAULT false NOT NULL,
    "storefrontProductsEnabled" boolean DEFAULT false NOT NULL,
    "storefrontServicesEnabled" boolean DEFAULT false NOT NULL,
    "storefrontMaxItems" integer,
    "storefrontWhatsappOrder" boolean DEFAULT false NOT NULL,
    "storefrontEmailOrder" boolean DEFAULT false NOT NULL,
    CONSTRAINT "Plan_storefrontMaxItems_nonnegative" CHECK ((("storefrontMaxItems" IS NULL) OR ("storefrontMaxItems" >= 0)))
);


--
-- Name: PlatformSuggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PlatformSuggestion" (
    id text NOT NULL,
    "userId" text,
    profession public."ProfessionType" NOT NULL,
    "platformId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProducedTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProducedTag" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "cardId" text,
    "immutableToken" text NOT NULL,
    "shortCode" text,
    "permanentUrl" text NOT NULL,
    "activationCode" text NOT NULL,
    "activationTokenHash" text NOT NULL,
    status public."ProducedTagStatus" DEFAULT 'UNASSIGNED'::public."ProducedTagStatus" NOT NULL,
    "assignedUserId" text,
    "activatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "scratchSecretExportCiphertext" text,
    "scratchSecretExportedAt" timestamp(3) without time zone,
    "activationSecretVersion" integer
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    slug text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    "shortDescriptionAr" text,
    "shortDescriptionEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "serialPolicy" text,
    "seoTitleAr" text,
    "seoTitleEn" text,
    "seoDescriptionAr" text,
    "seoDescriptionEn" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategory" (
    id text NOT NULL,
    slug text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    "descriptionAr" text,
    "descriptionEn" text,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductFeature; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductFeature" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "titleAr" text NOT NULL,
    "titleEn" text NOT NULL,
    "valueAr" text,
    "valueEn" text,
    "iconKey" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    url text NOT NULL,
    "altAr" text,
    "altEn" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductInventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductInventory" (
    id text NOT NULL,
    "variantId" text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    "lowStockAt" integer DEFAULT 5 NOT NULL,
    status public."ProductInventoryStatus" DEFAULT 'OUT_OF_STOCK'::public."ProductInventoryStatus" NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "ProductInventory_nonnegative_check" CHECK (((quantity >= 0) AND (reserved >= 0) AND (reserved <= quantity)))
);


--
-- Name: ProductMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductMedia" (
    id text NOT NULL,
    "productId" text NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    "titleAr" text,
    "titleEn" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: ProductPrice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductPrice" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    currency text DEFAULT 'EGP'::text NOT NULL,
    amount numeric(14,2) NOT NULL,
    "saleAmount" numeric(14,2),
    "activeFrom" timestamp(3) without time zone,
    "activeTo" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "ProductPrice_amount_check" CHECK (((amount >= (0)::numeric) AND (("saleAmount" IS NULL) OR ("saleAmount" >= (0)::numeric))))
);


--
-- Name: ProductSlug; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductSlug" (
    id text NOT NULL,
    "productId" text NOT NULL,
    slug text NOT NULL,
    "isCanonical" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductStatusHistory" (
    id text NOT NULL,
    "cardId" text NOT NULL,
    "fromStatus" public."CardStatus",
    "toStatus" public."CardStatus" NOT NULL,
    "actorId" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    sku text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductionBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionBatch" (
    id text NOT NULL,
    "batchCode" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    status public."ProductionBatchStatus" DEFAULT 'GENERATED'::public."ProductionBatchStatus" NOT NULL,
    "createdById" text NOT NULL,
    "legacyCardBatchId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Profile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text,
    slug text,
    "displayName" text NOT NULL,
    title text,
    bio text,
    "avatarUrl" text,
    "avatarStorageKey" text,
    "coverUrl" text,
    "coverStorageKey" text,
    phone text,
    "whatsappBusiness" text,
    "whatsappPrivate" text,
    email text,
    website text,
    facebook text,
    linkedin text,
    github text,
    tiktok text,
    "vcfUrl" text,
    "locationText" text,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    theme public."ProfileTheme" DEFAULT 'CLASSIC_DARK'::public."ProfileTheme" NOT NULL,
    "avatarCrop" jsonb,
    "coverCrop" jsonb,
    "showAvatar" boolean DEFAULT true NOT NULL,
    "showCover" boolean DEFAULT true NOT NULL,
    "showDisplayName" boolean DEFAULT true NOT NULL,
    "showTitle" boolean DEFAULT true NOT NULL,
    "showBio" boolean DEFAULT true NOT NULL,
    "showPhone" boolean DEFAULT true NOT NULL,
    "showEmail" boolean DEFAULT true NOT NULL,
    "showWebsite" boolean DEFAULT true NOT NULL,
    "showLocation" boolean DEFAULT true NOT NULL,
    "showWhatsappBusiness" boolean DEFAULT true NOT NULL,
    "showWhatsappPrivate" boolean DEFAULT true NOT NULL,
    "showSocialLinks" boolean DEFAULT true NOT NULL,
    "showCustomFields" boolean DEFAULT true NOT NULL,
    "showUploadedFiles" boolean DEFAULT true NOT NULL,
    "showSaveContact" boolean DEFAULT true NOT NULL,
    "addressAr" text,
    "addressEn" text,
    "alternatePhone" text,
    "bioAr" text,
    "bioEn" text,
    company text,
    "contactNotesAr" text,
    "contactNotesEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    "displayNameAr" text,
    "displayNameEn" text,
    "firstName" text,
    "industryAr" text,
    "industryEn" text,
    "jobTitleAr" text,
    "jobTitleEn" text,
    "lastName" text,
    "logoStorageKey" text,
    "logoUrl" text,
    "organizationNameAr" text,
    "organizationNameEn" text,
    "primaryLanguage" text DEFAULT 'ar'::text NOT NULL,
    type public."ProfileType" DEFAULT 'PERSONAL'::public."ProfileType" NOT NULL,
    "allowInstallable" boolean DEFAULT false NOT NULL,
    "displayLabel" text,
    profession public."ProfessionType" DEFAULT 'PERSONAL'::public."ProfessionType" NOT NULL,
    "customProfession" text,
    "categoryId" text,
    "templateId" text,
    "profileKind" public."ProfileKind",
    lifecycle public."ProfileLifecycle" DEFAULT 'DRAFT'::public."ProfileLifecycle" NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "creationKey" text,
    "publishedAt" timestamp(3) without time zone,
    "archivedAt" timestamp(3) without time zone,
    access public."ProfileAccess" DEFAULT 'PRIVATE'::public."ProfileAccess" NOT NULL,
    "draftRevision" integer DEFAULT 0 NOT NULL,
    "draftSlug" text
);


--
-- Name: ProfileBranch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileBranch" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "nameAr" text,
    "nameEn" text,
    "addressAr" text,
    "addressEn" text,
    phone text,
    "mapUrl" text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileCategory" (
    id text NOT NULL,
    slug text NOT NULL,
    "profileKind" public."ProfileKind" NOT NULL,
    "nameEn" text NOT NULL,
    "nameAr" text NOT NULL,
    "descriptionEn" text,
    "descriptionAr" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "defaultTemplateId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileEntitlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileEntitlement" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "profileId" text,
    "sourceType" public."ProfileEntitlementSourceType" NOT NULL,
    "sourceId" text,
    "profileLimitIncrement" integer DEFAULT 0 NOT NULL,
    status public."ProfileEntitlementStatus" DEFAULT 'ACTIVE'::public."ProfileEntitlementStatus" NOT NULL,
    "startsAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endsAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProfileField; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileField" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "userId" text NOT NULL,
    label text NOT NULL,
    value text NOT NULL,
    type public."ProfileFieldType" DEFAULT 'TEXT'::public."ProfileFieldType" NOT NULL,
    "iconKey" text,
    "customIconUrl" text,
    "actionUrl" text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "labelAr" text,
    "labelEn" text
);


--
-- Name: ProfileMediaAsset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileMediaAsset" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "profileId" text,
    purpose public."ProfileMediaPurpose" NOT NULL,
    state public."ProfileMediaState" DEFAULT 'TEMPORARY'::public."ProfileMediaState" NOT NULL,
    visibility public."ProfileModuleVisibility" DEFAULT 'ONLY_ME'::public."ProfileModuleVisibility" NOT NULL,
    "storageKey" text NOT NULL,
    "publicStorageKey" text,
    "publicUrl" text,
    "originalFilename" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" bigint NOT NULL,
    width integer,
    height integer,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "temporaryExpiresAt" timestamp(3) without time zone,
    "orphanedAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileModule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileModule" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "moduleDefinitionId" text NOT NULL,
    "instanceKey" text DEFAULT 'default'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    visibility public."ProfileModuleVisibility" DEFAULT 'PUBLIC'::public."ProfileModuleVisibility" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "configurationVersion" integer DEFAULT 1 NOT NULL,
    configuration jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileModuleDefinition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileModuleDefinition" (
    id text NOT NULL,
    key text NOT NULL,
    "nameEn" text NOT NULL,
    "nameAr" text NOT NULL,
    "schemaVersion" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "supportsVisibility" boolean DEFAULT true NOT NULL,
    "supportsMultiple" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfilePublication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfilePublication" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "publishedRevisionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileRevision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevision" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "revisionNumber" integer NOT NULL,
    "sourceDraftRevision" integer NOT NULL,
    "draftFingerprint" text NOT NULL,
    status public."ProfileRevisionStatus" DEFAULT 'PUBLISHED'::public."ProfileRevisionStatus" NOT NULL,
    access public."ProfileAccess" NOT NULL,
    slug text,
    "displayName" text NOT NULL,
    "displayLabel" text,
    type public."ProfileType" NOT NULL,
    "profileKind" public."ProfileKind",
    "primaryLanguage" text NOT NULL,
    "displayNameAr" text,
    "displayNameEn" text,
    title text,
    "jobTitleAr" text,
    "jobTitleEn" text,
    company text,
    bio text,
    "bioAr" text,
    "bioEn" text,
    "organizationNameAr" text,
    "organizationNameEn" text,
    "industryAr" text,
    "industryEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    "avatarUrl" text,
    "coverUrl" text,
    "logoUrl" text,
    phone text,
    "alternatePhone" text,
    "whatsappBusiness" text,
    "whatsappPrivate" text,
    email text,
    website text,
    facebook text,
    linkedin text,
    github text,
    tiktok text,
    "vcfUrl" text,
    "locationText" text,
    "addressAr" text,
    "addressEn" text,
    "contactNotesAr" text,
    "contactNotesEn" text,
    theme public."ProfileTheme" NOT NULL,
    "showAvatar" boolean NOT NULL,
    "showCover" boolean NOT NULL,
    "showDisplayName" boolean NOT NULL,
    "showTitle" boolean NOT NULL,
    "showBio" boolean NOT NULL,
    "showPhone" boolean NOT NULL,
    "showEmail" boolean NOT NULL,
    "showWebsite" boolean NOT NULL,
    "showLocation" boolean NOT NULL,
    "showWhatsappBusiness" boolean NOT NULL,
    "showWhatsappPrivate" boolean NOT NULL,
    "showSocialLinks" boolean NOT NULL,
    "showCustomFields" boolean NOT NULL,
    "showUploadedFiles" boolean NOT NULL,
    "showSaveContact" boolean NOT NULL,
    "allowInstallable" boolean NOT NULL,
    "templateSlug" text,
    "templateConfiguration" jsonb,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    profession public."ProfessionType" DEFAULT 'PERSONAL'::public."ProfessionType" NOT NULL,
    "customProfession" text,
    "firstName" text,
    "lastName" text,
    "categorySlug" text
);


--
-- Name: ProfileRevisionBranch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionBranch" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    "nameAr" text,
    "nameEn" text,
    "addressAr" text,
    "addressEn" text,
    phone text,
    "mapUrl" text,
    "sortOrder" integer NOT NULL
);


--
-- Name: ProfileRevisionDestination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionDestination" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    title text NOT NULL,
    "titleAr" text,
    "titleEn" text,
    type public."DestinationType" NOT NULL,
    url text NOT NULL,
    icon text,
    "iconKey" text,
    "customIconUrl" text,
    "sortOrder" integer NOT NULL
);


--
-- Name: ProfileRevisionField; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionField" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    label text NOT NULL,
    "labelAr" text,
    "labelEn" text,
    value text NOT NULL,
    type public."ProfileFieldType" NOT NULL,
    "iconKey" text,
    "customIconUrl" text,
    "actionUrl" text,
    "sortOrder" integer NOT NULL
);


--
-- Name: ProfileRevisionFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionFile" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    "publicUrl" text NOT NULL,
    "originalFilename" text NOT NULL,
    "originalName" text,
    "mimeType" text NOT NULL,
    title text,
    "displayTitleAr" text,
    "displayTitleEn" text,
    "sortOrder" integer NOT NULL
);


--
-- Name: ProfileRevisionMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionMedia" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "mediaId" text NOT NULL,
    purpose public."ProfileMediaPurpose" NOT NULL,
    "publicUrl" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    visibility public."ProfileModuleVisibility" DEFAULT 'PUBLIC'::public."ProfileModuleVisibility" NOT NULL
);


--
-- Name: ProfileRevisionModule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionModule" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    key text NOT NULL,
    enabled boolean NOT NULL,
    visibility public."ProfileModuleVisibility" NOT NULL,
    "sortOrder" integer NOT NULL,
    configuration jsonb
);


--
-- Name: ProfileRevisionSectionEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionSectionEntry" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    "moduleKey" text NOT NULL,
    "fieldKey" text NOT NULL,
    "instanceKey" text NOT NULL,
    value jsonb NOT NULL,
    visibility public."ProfileModuleVisibility" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: ProfileRevisionService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileRevisionService" (
    id text NOT NULL,
    "revisionId" text NOT NULL,
    "sourceId" text NOT NULL,
    "nameAr" text,
    "nameEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    url text,
    "iconKey" text,
    "sortOrder" integer NOT NULL,
    "itemType" public."ProfileShowcaseItemType" DEFAULT 'SERVICE'::public."ProfileShowcaseItemType" NOT NULL,
    "imageUrl" text,
    price numeric(14,2),
    currency text,
    category text,
    featured boolean DEFAULT false NOT NULL,
    CONSTRAINT "ProfileRevisionService_price_nonnegative" CHECK (((price IS NULL) OR (price >= (0)::numeric)))
);


--
-- Name: ProfileSectionEntry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileSectionEntry" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "moduleDefinitionId" text NOT NULL,
    "fieldKey" text NOT NULL,
    "instanceKey" text DEFAULT 'default'::text NOT NULL,
    value jsonb NOT NULL,
    visibility public."ProfileModuleVisibility" DEFAULT 'ONLY_ME'::public."ProfileModuleVisibility" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "schemaVersion" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileService; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileService" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    "nameAr" text,
    "nameEn" text,
    "descriptionAr" text,
    "descriptionEn" text,
    url text,
    "iconKey" text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "itemType" public."ProfileShowcaseItemType" DEFAULT 'SERVICE'::public."ProfileShowcaseItemType" NOT NULL,
    "imageUrl" text,
    price numeric(14,2),
    currency text,
    category text,
    featured boolean DEFAULT false NOT NULL,
    CONSTRAINT "ProfileService_price_nonnegative" CHECK (((price IS NULL) OR (price >= (0)::numeric)))
);


--
-- Name: ProfileSlugHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileSlugHistory" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProfileTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileTemplate" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text NOT NULL,
    slug text NOT NULL,
    category text NOT NULL,
    "minimumPlan" text NOT NULL,
    "previewImageUrl" text,
    configuration jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text,
    "profileKind" public."ProfileKind"
);


--
-- Name: ProfileTemplateModule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileTemplateModule" (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "moduleDefinitionId" text NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    "enabledByDefault" boolean DEFAULT false NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "defaultSortOrder" integer DEFAULT 0 NOT NULL,
    "defaultConfiguration" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProfileVerificationCase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProfileVerificationCase" (
    id text NOT NULL,
    "profileId" text NOT NULL,
    kind public."ProfileVerificationKind" NOT NULL,
    status public."ProfileVerificationStatus" DEFAULT 'NOT_STARTED'::public."ProfileVerificationStatus" NOT NULL,
    authority public."ProfileVerificationAuthority" DEFAULT 'SYSTEM'::public."ProfileVerificationAuthority" NOT NULL,
    provider text,
    "reasonCode" text,
    revision integer DEFAULT 0 NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "reviewedAt" timestamp(3) without time zone,
    "verifiedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Purchase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Purchase" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "invoiceNumber" text,
    status public."PurchaseStatus" DEFAULT 'DRAFT'::public."PurchaseStatus" NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    "shippingCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "customsCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "otherCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "totalCost" numeric(14,2) DEFAULT 0 NOT NULL,
    "paidAmount" numeric(14,2) DEFAULT 0 NOT NULL,
    "purchaseDate" timestamp(3) without time zone NOT NULL,
    "receivedDate" timestamp(3) without time zone,
    notes text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PurchaseItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseItem" (
    id text NOT NULL,
    "purchaseId" text NOT NULL,
    "inventoryItemId" text NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(14,2) NOT NULL,
    "totalCost" numeric(14,2) NOT NULL
);


--
-- Name: QuotaIncreaseRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QuotaIncreaseRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    resource public."QuotaResource" NOT NULL,
    "requestedValue" bigint NOT NULL,
    status public."QuotaRequestStatus" DEFAULT 'PENDING'::public."QuotaRequestStatus" NOT NULL,
    reason text,
    "adminNote" text,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "deviceSessionId" text,
    "authMethod" public."SessionAuthMethod" DEFAULT 'LEGACY'::public."SessionAuthMethod" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastAuthenticatedAt" timestamp(3) without time zone
);


--
-- Name: StepUpGrant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StepUpGrant" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" text NOT NULL,
    "deviceSessionId" text,
    "webSessionId" text,
    purpose public."StepUpPurpose" NOT NULL,
    method public."StepUpMethod" NOT NULL,
    "assuranceLevel" integer DEFAULT 2 NOT NULL,
    "sessionBindingHash" text NOT NULL,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone
);


--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    "contactName" text,
    phone text,
    email text,
    address text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSetting" (
    key text NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tag" (
    id text NOT NULL,
    token text NOT NULL,
    "ownerId" text NOT NULL,
    "organizationId" text,
    "profileId" text,
    "activeDestinationId" text,
    name text NOT NULL,
    mode public."TagMode" DEFAULT 'PROFILE'::public."TagMode" NOT NULL,
    status public."TagStatus" DEFAULT 'ACTIVE'::public."TagStatus" NOT NULL,
    "programmedAt" timestamp(3) without time zone,
    "lockedAt" timestamp(3) without time zone,
    "lastScannedAt" timestamp(3) without time zone,
    "scanCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "shortCode" text NOT NULL
);


--
-- Name: TagAlias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TagAlias" (
    code text NOT NULL,
    "tagId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TagEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TagEvent" (
    id text NOT NULL,
    "tagId" text NOT NULL,
    type public."TagEventType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TagTransfer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TagTransfer" (
    id text NOT NULL,
    "tagId" text NOT NULL,
    "fromUserId" text NOT NULL,
    "toUserId" text,
    "invitedEmail" text,
    status public."TagTransferStatus" DEFAULT 'PENDING'::public."TagTransferStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UploadedFile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UploadedFile" (
    id text NOT NULL,
    "profileId" text,
    "uploaderUserId" text NOT NULL,
    "storageKey" text NOT NULL,
    "publicUrl" text NOT NULL,
    "originalFilename" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" bigint NOT NULL,
    title text,
    "isVisible" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "displayTitleAr" text,
    "displayTitleEn" text,
    "originalName" text
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "passwordHash" text,
    role public."SystemRole" DEFAULT 'USER'::public."SystemRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."AccountStatus" DEFAULT 'ACTIVE'::public."AccountStatus" NOT NULL,
    locale text,
    "lastLoginAt" timestamp(3) without time zone,
    phone text,
    "phoneVerifiedAt" timestamp(3) without time zone,
    username text,
    "shareActivityIdentity" boolean DEFAULT false NOT NULL,
    "allowNearbyDiscovery" boolean DEFAULT false NOT NULL,
    "defaultSharingCardId" text,
    "phoneE164" text,
    "phoneCountryIso2" text,
    "phoneCallingCode" text,
    profession public."ProfessionType" DEFAULT 'PERSONAL'::public."ProfessionType" NOT NULL,
    "customProfession" text,
    "backupProvider" public."BackupProviderType" DEFAULT 'POP_CLOUD'::public."BackupProviderType" NOT NULL,
    "sessionsRevokedBefore" timestamp(3) without time zone
);


--
-- Name: UserBlock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserBlock" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    "blockedId" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reasonCategory" public."UserReportCategory",
    source public."UserBlockSource" DEFAULT 'FRIENDS'::public."UserBlockSource" NOT NULL,
    CONSTRAINT "UserBlock_not_self_check" CHECK (("ownerId" <> "blockedId"))
);


--
-- Name: UserLegalConsent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserLegalConsent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "legalDocumentId" text NOT NULL,
    "acceptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source public."LegalConsentSource" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


--
-- Name: UserLimitOverride; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserLimitOverride" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "maxProfiles" integer,
    "maxLinks" integer,
    "maxCustomFields" integer,
    "maxTags" integer,
    "maxUploads" integer,
    "maxStorageBytes" bigint,
    "allowCustomSlug" boolean,
    "allowThemes" boolean,
    "allowCustomTheme" boolean,
    "allowAnalytics" boolean,
    "allowFileUploads" boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "allowCustomIcons" boolean,
    "analyticsAllowed" boolean,
    "availableProfileTypes" jsonb,
    "availableThemes" jsonb,
    "customSlugAllowed" boolean,
    "maxCards" integer,
    "maxFiles" integer,
    "maxVirtualCards" integer,
    "allowBusinessCards" boolean,
    "allowWalletPasses" boolean,
    "allowCustomLinks" boolean,
    "allowInstallableProfiles" boolean
);


--
-- Name: UserPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserPlan" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "planId" text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    "startsAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endsAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "adminNote" text
);


--
-- Name: UserPreference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserPreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    theme public."UserThemePreference" DEFAULT 'SYSTEM'::public."UserThemePreference" NOT NULL,
    language public."UserLanguagePreference" DEFAULT 'SYSTEM'::public."UserLanguagePreference" NOT NULL,
    font public."UserFontPreference" DEFAULT 'DEFAULT'::public."UserFontPreference" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UserReport; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserReport" (
    id text NOT NULL,
    "reporterId" text NOT NULL,
    "subjectId" text,
    reason text NOT NULL,
    details text,
    status public."UserReportStatus" DEFAULT 'OPEN'::public."UserReportStatus" NOT NULL,
    "reviewedById" text,
    "reviewNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "targetProfileId" text,
    category public."UserReportCategory",
    "reviewedAt" timestamp(3) without time zone,
    "resolutionCode" text,
    source public."UserReportSource" DEFAULT 'FRIENDS'::public."UserReportSource" NOT NULL
);


--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: VirtualCard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VirtualCard" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text,
    name text NOT NULL,
    type public."VirtualCardType" DEFAULT 'PERSONAL'::public."VirtualCardType" NOT NULL,
    "profileId" text NOT NULL,
    "themeId" text,
    "isDefault" boolean DEFAULT false NOT NULL,
    status public."VirtualCardStatus" DEFAULT 'ACTIVE'::public."VirtualCardStatus" NOT NULL,
    "avatarKind" text,
    "avatarValue" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "displayLabel" text
);


--
-- Name: WalletPass; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WalletPass" (
    id text NOT NULL,
    "virtualCardId" text NOT NULL,
    platform public."WalletPlatform" NOT NULL,
    "externalObjectId" text,
    "serialNumber" text NOT NULL,
    status public."WalletPassStatus" DEFAULT 'PENDING'::public."WalletPassStatus" NOT NULL,
    "lastGeneratedAt" timestamp(3) without time zone,
    "lastUpdatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AccountDeletionRequest AccountDeletionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountDeletionRequest"
    ADD CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY (id);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: ActivationAttempt ActivationAttempt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivationAttempt"
    ADD CONSTRAINT "ActivationAttempt_pkey" PRIMARY KEY (id);


--
-- Name: ActivationClaimSession ActivationClaimSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivationClaimSession"
    ADD CONSTRAINT "ActivationClaimSession_pkey" PRIMARY KEY (id);


--
-- Name: AdminNotificationCampaign AdminNotificationCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminNotificationCampaign"
    ADD CONSTRAINT "AdminNotificationCampaign_pkey" PRIMARY KEY (id);


--
-- Name: AdminNotificationDelivery AdminNotificationDelivery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminNotificationDelivery"
    ADD CONSTRAINT "AdminNotificationDelivery_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AuthTicket AuthTicket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuthTicket"
    ADD CONSTRAINT "AuthTicket_pkey" PRIMARY KEY (id);


--
-- Name: BrandSettings BrandSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BrandSettings"
    ADD CONSTRAINT "BrandSettings_pkey" PRIMARY KEY (id);


--
-- Name: CardBatch CardBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardBatch"
    ADD CONSTRAINT "CardBatch_pkey" PRIMARY KEY (id);


--
-- Name: CardImportedField CardImportedField_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardImportedField"
    ADD CONSTRAINT "CardImportedField_pkey" PRIMARY KEY (id);


--
-- Name: CardOpenDaily CardOpenDaily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardOpenDaily"
    ADD CONSTRAINT "CardOpenDaily_pkey" PRIMARY KEY (id);


--
-- Name: Card Card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_pkey" PRIMARY KEY (id);


--
-- Name: ChatMember ChatMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_pkey" PRIMARY KEY (id);


--
-- Name: Chat Chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_pkey" PRIMARY KEY (id);


--
-- Name: ConnectedAccount ConnectedAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConnectedAccount"
    ADD CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY (id);


--
-- Name: ContentAttachment ContentAttachment_contentEntryId_uploadedFileId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentAttachment"
    ADD CONSTRAINT "ContentAttachment_contentEntryId_uploadedFileId_key" UNIQUE ("contentEntryId", "uploadedFileId");


--
-- Name: ContentAttachment ContentAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentAttachment"
    ADD CONSTRAINT "ContentAttachment_pkey" PRIMARY KEY (id);


--
-- Name: ContentEntry ContentEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentEntry"
    ADD CONSTRAINT "ContentEntry_pkey" PRIMARY KEY (id);


--
-- Name: ContentEntry ContentEntry_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentEntry"
    ADD CONSTRAINT "ContentEntry_slug_key" UNIQUE (slug);


--
-- Name: ContentEntry ContentEntry_userId_normalizedName_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentEntry"
    ADD CONSTRAINT "ContentEntry_userId_normalizedName_key" UNIQUE ("userId", "normalizedName");


--
-- Name: ContentPublication ContentPublication_contentEntryId_virtualCardId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentPublication"
    ADD CONSTRAINT "ContentPublication_contentEntryId_virtualCardId_key" UNIQUE ("contentEntryId", "virtualCardId");


--
-- Name: ContentPublication ContentPublication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentPublication"
    ADD CONSTRAINT "ContentPublication_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: Destination Destination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_pkey" PRIMARY KEY (id);


--
-- Name: DevicePushToken DevicePushToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevicePushToken"
    ADD CONSTRAINT "DevicePushToken_pkey" PRIMARY KEY (id);


--
-- Name: DeviceSession DeviceSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceSession"
    ADD CONSTRAINT "DeviceSession_pkey" PRIMARY KEY (id);


--
-- Name: DeviceSession DeviceSession_tokenFamilyHash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceSession"
    ADD CONSTRAINT "DeviceSession_tokenFamilyHash_key" UNIQUE ("tokenFamilyHash");


--
-- Name: ExpenseCategory ExpenseCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: ExternalIdentity ExternalIdentity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalIdentity"
    ADD CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY (id);


--
-- Name: FeatureComment FeatureComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureComment"
    ADD CONSTRAINT "FeatureComment_pkey" PRIMARY KEY (id);


--
-- Name: FeatureRequest FeatureRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureRequest"
    ADD CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY (id);


--
-- Name: FeatureVote FeatureVote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureVote"
    ADD CONSTRAINT "FeatureVote_pkey" PRIMARY KEY (id);


--
-- Name: Follow Follow_followerId_followingId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId", "followingId");


--
-- Name: Follow Follow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_pkey" PRIMARY KEY (id);


--
-- Name: FriendNotificationEvent FriendNotificationEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendNotificationEvent"
    ADD CONSTRAINT "FriendNotificationEvent_pkey" PRIMARY KEY (id);


--
-- Name: FriendPreference FriendPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPreference"
    ADD CONSTRAINT "FriendPreference_pkey" PRIMARY KEY (id);


--
-- Name: FriendPrivacyRule FriendPrivacyRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPrivacyRule"
    ADD CONSTRAINT "FriendPrivacyRule_pkey" PRIMARY KEY (id);


--
-- Name: FriendRequest FriendRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendRequest"
    ADD CONSTRAINT "FriendRequest_pkey" PRIMARY KEY (id);


--
-- Name: FriendsPreference FriendsPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendsPreference"
    ADD CONSTRAINT "FriendsPreference_pkey" PRIMARY KEY (id);


--
-- Name: Friendship Friendship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_pkey" PRIMARY KEY (id);


--
-- Name: InventoryBatch InventoryBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBatch"
    ADD CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY (id);


--
-- Name: InventoryItem InventoryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_pkey" PRIMARY KEY (id);


--
-- Name: InventoryMovement InventoryMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY (id);


--
-- Name: LegalDocument LegalDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LegalDocument"
    ADD CONSTRAINT "LegalDocument_pkey" PRIMARY KEY (id);


--
-- Name: LinkPlatform LinkPlatform_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LinkPlatform"
    ADD CONSTRAINT "LinkPlatform_pkey" PRIMARY KEY (id);


--
-- Name: Membership Membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_pkey" PRIMARY KEY (id);


--
-- Name: MessageReport MessageReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageReport"
    ADD CONSTRAINT "MessageReport_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: MobileAuthChallenge MobileAuthChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileAuthChallenge"
    ADD CONSTRAINT "MobileAuthChallenge_pkey" PRIMARY KEY (id);


--
-- Name: MobileDeviceCredential MobileDeviceCredential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileDeviceCredential"
    ADD CONSTRAINT "MobileDeviceCredential_pkey" PRIMARY KEY (id);


--
-- Name: MobileEnrollmentSession MobileEnrollmentSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileEnrollmentSession"
    ADD CONSTRAINT "MobileEnrollmentSession_pkey" PRIMARY KEY (id);


--
-- Name: MobileRefreshToken MobileRefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileRefreshToken"
    ADD CONSTRAINT "MobileRefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: NearbyPreference NearbyPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyPreference"
    ADD CONSTRAINT "NearbyPreference_pkey" PRIMARY KEY (id);


--
-- Name: NearbyPreference NearbyPreference_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyPreference"
    ADD CONSTRAINT "NearbyPreference_userId_key" UNIQUE ("userId");


--
-- Name: NearbyPresence NearbyPresence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyPresence"
    ADD CONSTRAINT "NearbyPresence_pkey" PRIMARY KEY (id);


--
-- Name: NearbyRateLimitBucket NearbyRateLimitBucket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyRateLimitBucket"
    ADD CONSTRAINT "NearbyRateLimitBucket_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreference NotificationPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY (id);


--
-- Name: OAuthConnectionState OAuthConnectionState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OAuthConnectionState"
    ADD CONSTRAINT "OAuthConnectionState_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingDefinition OnboardingDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingDefinition"
    ADD CONSTRAINT "OnboardingDefinition_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingProgress OnboardingProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingQuestionCondition OnboardingQuestionCondition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestionCondition"
    ADD CONSTRAINT "OnboardingQuestionCondition_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingQuestionOption OnboardingQuestionOption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestionOption"
    ADD CONSTRAINT "OnboardingQuestionOption_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingQuestion OnboardingQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestion"
    ADD CONSTRAINT "OnboardingQuestion_pkey" PRIMARY KEY (id);


--
-- Name: OnboardingStep OnboardingStep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingStep"
    ADD CONSTRAINT "OnboardingStep_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: OtpChallenge OtpChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OtpChallenge"
    ADD CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY (id);


--
-- Name: OtpSendLog OtpSendLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OtpSendLog"
    ADD CONSTRAINT "OtpSendLog_pkey" PRIMARY KEY (id);


--
-- Name: PasskeyChallenge PasskeyChallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyChallenge"
    ADD CONSTRAINT "PasskeyChallenge_pkey" PRIMARY KEY (id);


--
-- Name: PasskeyCredential PasskeyCredential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyCredential"
    ADD CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY (id);


--
-- Name: PhoneCountryConfig PhoneCountryConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PhoneCountryConfig"
    ADD CONSTRAINT "PhoneCountryConfig_pkey" PRIMARY KEY (id);


--
-- Name: Plan Plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Plan"
    ADD CONSTRAINT "Plan_pkey" PRIMARY KEY (id);


--
-- Name: PlatformSuggestion PlatformSuggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlatformSuggestion"
    ADD CONSTRAINT "PlatformSuggestion_pkey" PRIMARY KEY (id);


--
-- Name: ProducedTag ProducedTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProducedTag"
    ADD CONSTRAINT "ProducedTag_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_slug_key" UNIQUE (slug);


--
-- Name: ProductFeature ProductFeature_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductFeature"
    ADD CONSTRAINT "ProductFeature_pkey" PRIMARY KEY (id);


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: ProductInventory ProductInventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductInventory"
    ADD CONSTRAINT "ProductInventory_pkey" PRIMARY KEY (id);


--
-- Name: ProductInventory ProductInventory_variantId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductInventory"
    ADD CONSTRAINT "ProductInventory_variantId_key" UNIQUE ("variantId");


--
-- Name: ProductMedia ProductMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMedia"
    ADD CONSTRAINT "ProductMedia_pkey" PRIMARY KEY (id);


--
-- Name: ProductPrice ProductPrice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPrice"
    ADD CONSTRAINT "ProductPrice_pkey" PRIMARY KEY (id);


--
-- Name: ProductSlug ProductSlug_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSlug"
    ADD CONSTRAINT "ProductSlug_pkey" PRIMARY KEY (id);


--
-- Name: ProductSlug ProductSlug_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSlug"
    ADD CONSTRAINT "ProductSlug_slug_key" UNIQUE (slug);


--
-- Name: ProductStatusHistory ProductStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStatusHistory"
    ADD CONSTRAINT "ProductStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- Name: ProductVariant ProductVariant_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_sku_key" UNIQUE (sku);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_slug_key" UNIQUE (slug);


--
-- Name: ProductionBatch ProductionBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY (id);


--
-- Name: ProfileBranch ProfileBranch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileBranch"
    ADD CONSTRAINT "ProfileBranch_pkey" PRIMARY KEY (id);


--
-- Name: ProfileCategory ProfileCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileCategory"
    ADD CONSTRAINT "ProfileCategory_pkey" PRIMARY KEY (id);


--
-- Name: ProfileEntitlement ProfileEntitlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileEntitlement"
    ADD CONSTRAINT "ProfileEntitlement_pkey" PRIMARY KEY (id);


--
-- Name: ProfileField ProfileField_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileField"
    ADD CONSTRAINT "ProfileField_pkey" PRIMARY KEY (id);


--
-- Name: ProfileMediaAsset ProfileMediaAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileMediaAsset"
    ADD CONSTRAINT "ProfileMediaAsset_pkey" PRIMARY KEY (id);


--
-- Name: ProfileModuleDefinition ProfileModuleDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileModuleDefinition"
    ADD CONSTRAINT "ProfileModuleDefinition_pkey" PRIMARY KEY (id);


--
-- Name: ProfileModule ProfileModule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileModule"
    ADD CONSTRAINT "ProfileModule_pkey" PRIMARY KEY (id);


--
-- Name: ProfilePublication ProfilePublication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfilePublication"
    ADD CONSTRAINT "ProfilePublication_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionBranch ProfileRevisionBranch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionBranch"
    ADD CONSTRAINT "ProfileRevisionBranch_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionDestination ProfileRevisionDestination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionDestination"
    ADD CONSTRAINT "ProfileRevisionDestination_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionField ProfileRevisionField_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionField"
    ADD CONSTRAINT "ProfileRevisionField_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionFile ProfileRevisionFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionFile"
    ADD CONSTRAINT "ProfileRevisionFile_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionMedia ProfileRevisionMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionMedia"
    ADD CONSTRAINT "ProfileRevisionMedia_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionModule ProfileRevisionModule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionModule"
    ADD CONSTRAINT "ProfileRevisionModule_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionSectionEntry ProfileRevisionSectionEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionSectionEntry"
    ADD CONSTRAINT "ProfileRevisionSectionEntry_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevisionService ProfileRevisionService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionService"
    ADD CONSTRAINT "ProfileRevisionService_pkey" PRIMARY KEY (id);


--
-- Name: ProfileRevision ProfileRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevision"
    ADD CONSTRAINT "ProfileRevision_pkey" PRIMARY KEY (id);


--
-- Name: ProfileSectionEntry ProfileSectionEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileSectionEntry"
    ADD CONSTRAINT "ProfileSectionEntry_pkey" PRIMARY KEY (id);


--
-- Name: ProfileService ProfileService_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileService"
    ADD CONSTRAINT "ProfileService_pkey" PRIMARY KEY (id);


--
-- Name: ProfileSlugHistory ProfileSlugHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileSlugHistory"
    ADD CONSTRAINT "ProfileSlugHistory_pkey" PRIMARY KEY (id);


--
-- Name: ProfileTemplateModule ProfileTemplateModule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileTemplateModule"
    ADD CONSTRAINT "ProfileTemplateModule_pkey" PRIMARY KEY (id);


--
-- Name: ProfileTemplate ProfileTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileTemplate"
    ADD CONSTRAINT "ProfileTemplate_pkey" PRIMARY KEY (id);


--
-- Name: ProfileVerificationCase ProfileVerificationCase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileVerificationCase"
    ADD CONSTRAINT "ProfileVerificationCase_pkey" PRIMARY KEY (id);


--
-- Name: Profile Profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseItem PurchaseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY (id);


--
-- Name: Purchase Purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_pkey" PRIMARY KEY (id);


--
-- Name: QuotaIncreaseRequest QuotaIncreaseRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuotaIncreaseRequest"
    ADD CONSTRAINT "QuotaIncreaseRequest_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StepUpGrant StepUpGrant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StepUpGrant"
    ADD CONSTRAINT "StepUpGrant_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (key);


--
-- Name: TagAlias TagAlias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagAlias"
    ADD CONSTRAINT "TagAlias_pkey" PRIMARY KEY (code);


--
-- Name: TagEvent TagEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagEvent"
    ADD CONSTRAINT "TagEvent_pkey" PRIMARY KEY (id);


--
-- Name: TagTransfer TagTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagTransfer"
    ADD CONSTRAINT "TagTransfer_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: UploadedFile UploadedFile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_pkey" PRIMARY KEY (id);


--
-- Name: UserBlock UserBlock_ownerId_blockedId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBlock"
    ADD CONSTRAINT "UserBlock_ownerId_blockedId_key" UNIQUE ("ownerId", "blockedId");


--
-- Name: UserBlock UserBlock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBlock"
    ADD CONSTRAINT "UserBlock_pkey" PRIMARY KEY (id);


--
-- Name: UserLegalConsent UserLegalConsent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLegalConsent"
    ADD CONSTRAINT "UserLegalConsent_pkey" PRIMARY KEY (id);


--
-- Name: UserLimitOverride UserLimitOverride_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLimitOverride"
    ADD CONSTRAINT "UserLimitOverride_pkey" PRIMARY KEY (id);


--
-- Name: UserPlan UserPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPlan"
    ADD CONSTRAINT "UserPlan_pkey" PRIMARY KEY (id);


--
-- Name: UserPreference UserPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPreference"
    ADD CONSTRAINT "UserPreference_pkey" PRIMARY KEY (id);


--
-- Name: UserReport UserReport_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReport"
    ADD CONSTRAINT "UserReport_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VirtualCard VirtualCard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCard"
    ADD CONSTRAINT "VirtualCard_pkey" PRIMARY KEY (id);


--
-- Name: WalletPass WalletPass_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WalletPass"
    ADD CONSTRAINT "WalletPass_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AccountDeletionRequest_userId_status_requestedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountDeletionRequest_userId_status_requestedAt_idx" ON public."AccountDeletionRequest" USING btree ("userId", status, "requestedAt");


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: ActivationAttempt_actorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationAttempt_actorId_createdAt_idx" ON public."ActivationAttempt" USING btree ("actorId", "createdAt");


--
-- Name: ActivationAttempt_cardId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationAttempt_cardId_createdAt_idx" ON public."ActivationAttempt" USING btree ("cardId", "createdAt");


--
-- Name: ActivationAttempt_contextFingerprintHash_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationAttempt_contextFingerprintHash_createdAt_idx" ON public."ActivationAttempt" USING btree ("contextFingerprintHash", "createdAt");


--
-- Name: ActivationAttempt_networkFingerprintHash_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationAttempt_networkFingerprintHash_createdAt_idx" ON public."ActivationAttempt" USING btree ("networkFingerprintHash", "createdAt");


--
-- Name: ActivationClaimSession_cardId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationClaimSession_cardId_status_idx" ON public."ActivationClaimSession" USING btree ("cardId", status);


--
-- Name: ActivationClaimSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivationClaimSession_expiresAt_idx" ON public."ActivationClaimSession" USING btree ("expiresAt");


--
-- Name: ActivationClaimSession_sessionTokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ActivationClaimSession_sessionTokenHash_key" ON public."ActivationClaimSession" USING btree ("sessionTokenHash");


--
-- Name: AdminNotificationCampaign_createdById_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminNotificationCampaign_createdById_createdAt_idx" ON public."AdminNotificationCampaign" USING btree ("createdById", "createdAt");


--
-- Name: AdminNotificationCampaign_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminNotificationCampaign_status_createdAt_idx" ON public."AdminNotificationCampaign" USING btree (status, "createdAt");


--
-- Name: AdminNotificationDelivery_campaignId_recipientUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AdminNotificationDelivery_campaignId_recipientUserId_key" ON public."AdminNotificationDelivery" USING btree ("campaignId", "recipientUserId");


--
-- Name: AdminNotificationDelivery_recipientUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminNotificationDelivery_recipientUserId_createdAt_idx" ON public."AdminNotificationDelivery" USING btree ("recipientUserId", "createdAt");


--
-- Name: AuditLog_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_actorId_idx" ON public."AuditLog" USING btree ("actorId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuthTicket_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AuthTicket_tokenHash_key" ON public."AuthTicket" USING btree ("tokenHash");


--
-- Name: AuthTicket_userId_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuthTicket_userId_expiresAt_idx" ON public."AuthTicket" USING btree ("userId", "expiresAt");


--
-- Name: CardBatch_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CardBatch_createdAt_idx" ON public."CardBatch" USING btree ("createdAt");


--
-- Name: CardBatch_supplierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CardBatch_supplierId_idx" ON public."CardBatch" USING btree ("supplierId");


--
-- Name: CardImportedField_connectedAccountId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CardImportedField_connectedAccountId_idx" ON public."CardImportedField" USING btree ("connectedAccountId");


--
-- Name: CardImportedField_virtualCardId_connectedAccountId_fieldType_ke; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CardImportedField_virtualCardId_connectedAccountId_fieldType_ke" ON public."CardImportedField" USING btree ("virtualCardId", "connectedAccountId", "fieldType");


--
-- Name: CardOpenDaily_cardId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CardOpenDaily_cardId_date_key" ON public."CardOpenDaily" USING btree ("cardId", date);


--
-- Name: CardOpenDaily_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CardOpenDaily_date_idx" ON public."CardOpenDaily" USING btree (date);


--
-- Name: Card_activationTokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Card_activationTokenHash_key" ON public."Card" USING btree ("activationTokenHash");


--
-- Name: Card_assignmentStatus_cardStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_assignmentStatus_cardStatus_idx" ON public."Card" USING btree ("assignmentStatus", "cardStatus");


--
-- Name: Card_batchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_batchId_idx" ON public."Card" USING btree ("batchId");


--
-- Name: Card_cardStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_cardStatus_idx" ON public."Card" USING btree ("cardStatus");


--
-- Name: Card_inventoryStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_inventoryStatus_idx" ON public."Card" USING btree ("inventoryStatus");


--
-- Name: Card_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_organizationId_idx" ON public."Card" USING btree ("organizationId");


--
-- Name: Card_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_ownerId_idx" ON public."Card" USING btree ("ownerId");


--
-- Name: Card_publicSlug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Card_publicSlug_key" ON public."Card" USING btree ("publicSlug");


--
-- Name: Card_publicToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Card_publicToken_key" ON public."Card" USING btree ("publicToken");


--
-- Name: Card_serialNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Card_serialNumber_key" ON public."Card" USING btree ("serialNumber");


--
-- Name: Card_virtualCardId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Card_virtualCardId_idx" ON public."Card" USING btree ("virtualCardId");


--
-- Name: ChatMember_chatId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ChatMember_chatId_userId_key" ON public."ChatMember" USING btree ("chatId", "userId");


--
-- Name: ChatMember_userId_chatId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMember_userId_chatId_idx" ON public."ChatMember" USING btree ("userId", "chatId");


--
-- Name: Chat_directKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Chat_directKey_key" ON public."Chat" USING btree ("directKey");


--
-- Name: ConnectedAccount_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ConnectedAccount_provider_providerAccountId_key" ON public."ConnectedAccount" USING btree (provider, "providerAccountId");


--
-- Name: ConnectedAccount_userId_provider_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConnectedAccount_userId_provider_status_idx" ON public."ConnectedAccount" USING btree ("userId", provider, status);


--
-- Name: ContentEntry_userId_visibility_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentEntry_userId_visibility_sortOrder_idx" ON public."ContentEntry" USING btree ("userId", visibility, "sortOrder");


--
-- Name: ContentPublication_virtualCardId_isVisible_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContentPublication_virtualCardId_isVisible_sortOrder_idx" ON public."ContentPublication" USING btree ("virtualCardId", "isVisible", "sortOrder");


--
-- Name: Customer_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_phone_idx" ON public."Customer" USING btree (phone);


--
-- Name: Customer_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_userId_key" ON public."Customer" USING btree ("userId");


--
-- Name: Destination_linkPlatformId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Destination_linkPlatformId_idx" ON public."Destination" USING btree ("linkPlatformId");


--
-- Name: Destination_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Destination_organizationId_idx" ON public."Destination" USING btree ("organizationId");


--
-- Name: Destination_profileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Destination_profileId_idx" ON public."Destination" USING btree ("profileId");


--
-- Name: Destination_publicShareKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Destination_publicShareKey_key" ON public."Destination" USING btree ("publicShareKey");


--
-- Name: Destination_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Destination_userId_idx" ON public."Destination" USING btree ("userId");


--
-- Name: DevicePushToken_deviceSessionId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DevicePushToken_deviceSessionId_revokedAt_idx" ON public."DevicePushToken" USING btree ("deviceSessionId", "revokedAt");


--
-- Name: DevicePushToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DevicePushToken_tokenHash_key" ON public."DevicePushToken" USING btree ("tokenHash");


--
-- Name: DevicePushToken_userId_platform_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DevicePushToken_userId_platform_revokedAt_idx" ON public."DevicePushToken" USING btree ("userId", platform, "revokedAt");


--
-- Name: DeviceSession_userId_deviceType_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviceSession_userId_deviceType_revokedAt_idx" ON public."DeviceSession" USING btree ("userId", "deviceType", "revokedAt");


--
-- Name: DeviceSession_userId_revokedAt_lastSeenAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviceSession_userId_revokedAt_lastSeenAt_idx" ON public."DeviceSession" USING btree ("userId", "revokedAt", "lastSeenAt");


--
-- Name: Expense_categoryId_expenseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Expense_categoryId_expenseDate_idx" ON public."Expense" USING btree ("categoryId", "expenseDate");


--
-- Name: ExternalIdentity_provider_providerSubject_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExternalIdentity_provider_providerSubject_key" ON public."ExternalIdentity" USING btree (provider, "providerSubject");


--
-- Name: ExternalIdentity_provider_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExternalIdentity_provider_status_idx" ON public."ExternalIdentity" USING btree (provider, status);


--
-- Name: ExternalIdentity_userId_provider_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExternalIdentity_userId_provider_status_idx" ON public."ExternalIdentity" USING btree ("userId", provider, status);


--
-- Name: FeatureComment_featureRequestId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FeatureComment_featureRequestId_createdAt_idx" ON public."FeatureComment" USING btree ("featureRequestId", "createdAt");


--
-- Name: FeatureRequest_mergedIntoId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FeatureRequest_mergedIntoId_idx" ON public."FeatureRequest" USING btree ("mergedIntoId");


--
-- Name: FeatureRequest_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FeatureRequest_status_createdAt_idx" ON public."FeatureRequest" USING btree (status, "createdAt");


--
-- Name: FeatureVote_featureRequestId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FeatureVote_featureRequestId_userId_key" ON public."FeatureVote" USING btree ("featureRequestId", "userId");


--
-- Name: FeatureVote_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FeatureVote_userId_idx" ON public."FeatureVote" USING btree ("userId");


--
-- Name: Follow_followingId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Follow_followingId_createdAt_idx" ON public."Follow" USING btree ("followingId", "createdAt");


--
-- Name: FriendNotificationEvent_actorUserId_recipientUserId_createdAt_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendNotificationEvent_actorUserId_recipientUserId_createdAt_i" ON public."FriendNotificationEvent" USING btree ("actorUserId", "recipientUserId", "createdAt");


--
-- Name: FriendNotificationEvent_recipientUserId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendNotificationEvent_recipientUserId_status_createdAt_idx" ON public."FriendNotificationEvent" USING btree ("recipientUserId", status, "createdAt");


--
-- Name: FriendNotificationEvent_status_availableAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendNotificationEvent_status_availableAt_idx" ON public."FriendNotificationEvent" USING btree (status, "availableAt");


--
-- Name: FriendPreference_ownerId_favorite_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendPreference_ownerId_favorite_updatedAt_idx" ON public."FriendPreference" USING btree ("ownerId", favorite, "updatedAt");


--
-- Name: FriendPreference_ownerId_friendId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FriendPreference_ownerId_friendId_key" ON public."FriendPreference" USING btree ("ownerId", "friendId");


--
-- Name: FriendPreference_ownerId_muted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendPreference_ownerId_muted_idx" ON public."FriendPreference" USING btree ("ownerId", muted);


--
-- Name: FriendPrivacyRule_friendId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendPrivacyRule_friendId_idx" ON public."FriendPrivacyRule" USING btree ("friendId");


--
-- Name: FriendPrivacyRule_ownerId_friendId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FriendPrivacyRule_ownerId_friendId_key" ON public."FriendPrivacyRule" USING btree ("ownerId", "friendId");


--
-- Name: FriendRequest_one_pending_pair_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FriendRequest_one_pending_pair_key" ON public."FriendRequest" USING btree ("pairKey") WHERE (status = 'PENDING'::public."FriendRequestStatus");


--
-- Name: FriendRequest_pairKey_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendRequest_pairKey_status_createdAt_idx" ON public."FriendRequest" USING btree ("pairKey", status, "createdAt");


--
-- Name: FriendRequest_recipientUserId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendRequest_recipientUserId_status_createdAt_idx" ON public."FriendRequest" USING btree ("recipientUserId", status, "createdAt");


--
-- Name: FriendRequest_requesterUserId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendRequest_requesterUserId_status_createdAt_idx" ON public."FriendRequest" USING btree ("requesterUserId", status, "createdAt");


--
-- Name: FriendsPreference_discoverableByProfileSearch_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendsPreference_discoverableByProfileSearch_updatedAt_idx" ON public."FriendsPreference" USING btree ("discoverableByProfileSearch", "updatedAt");


--
-- Name: FriendsPreference_socialKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FriendsPreference_socialKey_key" ON public."FriendsPreference" USING btree ("socialKey");


--
-- Name: FriendsPreference_socialProfileId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FriendsPreference_socialProfileId_idx" ON public."FriendsPreference" USING btree ("socialProfileId");


--
-- Name: FriendsPreference_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FriendsPreference_userId_key" ON public."FriendsPreference" USING btree ("userId");


--
-- Name: Friendship_userAId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Friendship_userAId_status_idx" ON public."Friendship" USING btree ("userAId", status);


--
-- Name: Friendship_userAId_userBId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON public."Friendship" USING btree ("userAId", "userBId");


--
-- Name: Friendship_userBId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Friendship_userBId_status_idx" ON public."Friendship" USING btree ("userBId", status);


--
-- Name: InventoryBatch_batchCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryBatch_batchCode_key" ON public."InventoryBatch" USING btree ("batchCode");


--
-- Name: InventoryBatch_productId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryBatch_productId_createdAt_idx" ON public."InventoryBatch" USING btree ("productId", "createdAt");


--
-- Name: InventoryItem_quantityOnHand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_quantityOnHand_idx" ON public."InventoryItem" USING btree ("quantityOnHand");


--
-- Name: InventoryItem_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryItem_sku_key" ON public."InventoryItem" USING btree (sku);


--
-- Name: InventoryItem_supplierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_supplierId_idx" ON public."InventoryItem" USING btree ("supplierId");


--
-- Name: InventoryMovement_inventoryItemId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON public."InventoryMovement" USING btree ("inventoryItemId", "createdAt");


--
-- Name: InventoryMovement_referenceType_referenceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON public."InventoryMovement" USING btree ("referenceType", "referenceId");


--
-- Name: LegalDocument_documentType_isActive_effectiveAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LegalDocument_documentType_isActive_effectiveAt_idx" ON public."LegalDocument" USING btree ("documentType", "isActive", "effectiveAt");


--
-- Name: LegalDocument_documentType_version_locale_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LegalDocument_documentType_version_locale_key" ON public."LegalDocument" USING btree ("documentType", version, locale);


--
-- Name: LinkPlatform_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LinkPlatform_isActive_sortOrder_idx" ON public."LinkPlatform" USING btree ("isActive", "sortOrder");


--
-- Name: LinkPlatform_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LinkPlatform_slug_key" ON public."LinkPlatform" USING btree (slug);


--
-- Name: Membership_organizationId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON public."Membership" USING btree ("organizationId", "userId");


--
-- Name: Membership_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Membership_userId_idx" ON public."Membership" USING btree ("userId");


--
-- Name: MessageReport_messageId_reporterId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON public."MessageReport" USING btree ("messageId", "reporterId");


--
-- Name: MessageReport_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MessageReport_status_createdAt_idx" ON public."MessageReport" USING btree (status, "createdAt");


--
-- Name: Message_chatId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_chatId_createdAt_idx" ON public."Message" USING btree ("chatId", "createdAt");


--
-- Name: Message_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");


--
-- Name: MobileAuthChallenge_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileAuthChallenge_expiresAt_idx" ON public."MobileAuthChallenge" USING btree ("expiresAt");


--
-- Name: MobileAuthChallenge_phoneHash_state_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileAuthChallenge_phoneHash_state_expiresAt_idx" ON public."MobileAuthChallenge" USING btree ("phoneHash", state, "expiresAt");


--
-- Name: MobileAuthChallenge_userId_state_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileAuthChallenge_userId_state_expiresAt_idx" ON public."MobileAuthChallenge" USING btree ("userId", state, "expiresAt");


--
-- Name: MobileDeviceCredential_credentialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileDeviceCredential_credentialId_key" ON public."MobileDeviceCredential" USING btree ("credentialId");


--
-- Name: MobileDeviceCredential_deviceSessionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileDeviceCredential_deviceSessionId_key" ON public."MobileDeviceCredential" USING btree ("deviceSessionId");


--
-- Name: MobileDeviceCredential_deviceSessionId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileDeviceCredential_deviceSessionId_status_idx" ON public."MobileDeviceCredential" USING btree ("deviceSessionId", status);


--
-- Name: MobileDeviceCredential_enrollmentSessionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileDeviceCredential_enrollmentSessionId_key" ON public."MobileDeviceCredential" USING btree ("enrollmentSessionId");


--
-- Name: MobileDeviceCredential_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileDeviceCredential_userId_status_idx" ON public."MobileDeviceCredential" USING btree ("userId", status);


--
-- Name: MobileEnrollmentSession_challengeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileEnrollmentSession_challengeId_key" ON public."MobileEnrollmentSession" USING btree ("challengeId");


--
-- Name: MobileEnrollmentSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileEnrollmentSession_expiresAt_idx" ON public."MobileEnrollmentSession" USING btree ("expiresAt");


--
-- Name: MobileEnrollmentSession_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileEnrollmentSession_tokenHash_key" ON public."MobileEnrollmentSession" USING btree ("tokenHash");


--
-- Name: MobileEnrollmentSession_userId_state_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileEnrollmentSession_userId_state_expiresAt_idx" ON public."MobileEnrollmentSession" USING btree ("userId", state, "expiresAt");


--
-- Name: MobileRefreshToken_deviceSessionId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileRefreshToken_deviceSessionId_revokedAt_idx" ON public."MobileRefreshToken" USING btree ("deviceSessionId", "revokedAt");


--
-- Name: MobileRefreshToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileRefreshToken_expiresAt_idx" ON public."MobileRefreshToken" USING btree ("expiresAt");


--
-- Name: MobileRefreshToken_familyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileRefreshToken_familyId_idx" ON public."MobileRefreshToken" USING btree ("familyId");


--
-- Name: MobileRefreshToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MobileRefreshToken_tokenHash_key" ON public."MobileRefreshToken" USING btree ("tokenHash");


--
-- Name: MobileRefreshToken_userId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MobileRefreshToken_userId_revokedAt_idx" ON public."MobileRefreshToken" USING btree ("userId", "revokedAt");


--
-- Name: NearbyPreference_enabled_discoverable_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NearbyPreference_enabled_discoverable_updatedAt_idx" ON public."NearbyPreference" USING btree (enabled, discoverable, "updatedAt");


--
-- Name: NearbyPreference_enabled_visibleUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NearbyPreference_enabled_visibleUntil_idx" ON public."NearbyPreference" USING btree (enabled, "visibleUntil");


--
-- Name: NearbyPresence_coarseCell_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NearbyPresence_coarseCell_expiresAt_idx" ON public."NearbyPresence" USING btree ("coarseCell", "expiresAt");


--
-- Name: NearbyPresence_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NearbyPresence_expiresAt_idx" ON public."NearbyPresence" USING btree ("expiresAt");


--
-- Name: NearbyPresence_sessionHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NearbyPresence_sessionHash_key" ON public."NearbyPresence" USING btree ("sessionHash");


--
-- Name: NearbyPresence_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NearbyPresence_userId_key" ON public."NearbyPresence" USING btree ("userId");


--
-- Name: NearbyRateLimitBucket_kind_windowStart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NearbyRateLimitBucket_kind_windowStart_idx" ON public."NearbyRateLimitBucket" USING btree (kind, "windowStart");


--
-- Name: NearbyRateLimitBucket_userId_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NearbyRateLimitBucket_userId_kind_key" ON public."NearbyRateLimitBucket" USING btree ("userId", kind);


--
-- Name: NotificationPreference_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON public."NotificationPreference" USING btree ("userId");


--
-- Name: OAuthConnectionState_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OAuthConnectionState_expiresAt_idx" ON public."OAuthConnectionState" USING btree ("expiresAt");


--
-- Name: OAuthConnectionState_stateHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OAuthConnectionState_stateHash_key" ON public."OAuthConnectionState" USING btree ("stateHash");


--
-- Name: OAuthConnectionState_userId_provider_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OAuthConnectionState_userId_provider_expiresAt_idx" ON public."OAuthConnectionState" USING btree ("userId", provider, "expiresAt");


--
-- Name: OnboardingDefinition_categoryId_status_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingDefinition_categoryId_status_version_idx" ON public."OnboardingDefinition" USING btree ("categoryId", status, version);


--
-- Name: OnboardingDefinition_key_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingDefinition_key_version_key" ON public."OnboardingDefinition" USING btree (key, version);


--
-- Name: OnboardingDefinition_profileKind_status_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingDefinition_profileKind_status_version_idx" ON public."OnboardingDefinition" USING btree ("profileKind", status, version);


--
-- Name: OnboardingDefinition_templateId_status_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingDefinition_templateId_status_version_idx" ON public."OnboardingDefinition" USING btree ("templateId", status, version);


--
-- Name: OnboardingProgress_definitionId_definitionVersion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingProgress_definitionId_definitionVersion_idx" ON public."OnboardingProgress" USING btree ("definitionId", "definitionVersion");


--
-- Name: OnboardingProgress_profileId_completedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingProgress_profileId_completedAt_idx" ON public."OnboardingProgress" USING btree ("profileId", "completedAt");


--
-- Name: OnboardingProgress_profileId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingProgress_profileId_key" ON public."OnboardingProgress" USING btree ("profileId");


--
-- Name: OnboardingProgress_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingProgress_userId_key" ON public."OnboardingProgress" USING btree ("userId");


--
-- Name: OnboardingQuestionCondition_questionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingQuestionCondition_questionId_idx" ON public."OnboardingQuestionCondition" USING btree ("questionId");


--
-- Name: OnboardingQuestionOption_questionId_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingQuestionOption_questionId_active_sortOrder_idx" ON public."OnboardingQuestionOption" USING btree ("questionId", active, "sortOrder");


--
-- Name: OnboardingQuestionOption_questionId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingQuestionOption_questionId_key_key" ON public."OnboardingQuestionOption" USING btree ("questionId", key);


--
-- Name: OnboardingQuestion_stepId_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingQuestion_stepId_active_sortOrder_idx" ON public."OnboardingQuestion" USING btree ("stepId", active, "sortOrder");


--
-- Name: OnboardingQuestion_stepId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingQuestion_stepId_key_key" ON public."OnboardingQuestion" USING btree ("stepId", key);


--
-- Name: OnboardingStep_definitionId_active_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingStep_definitionId_active_sortOrder_idx" ON public."OnboardingStep" USING btree ("definitionId", active, "sortOrder");


--
-- Name: OnboardingStep_definitionId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OnboardingStep_definitionId_key_key" ON public."OnboardingStep" USING btree ("definitionId", key);


--
-- Name: OnboardingStep_moduleDefinitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OnboardingStep_moduleDefinitionId_idx" ON public."OnboardingStep" USING btree ("moduleDefinitionId");


--
-- Name: OrderItem_cardId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_cardId_idx" ON public."OrderItem" USING btree ("cardId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: Order_customerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_customerId_createdAt_idx" ON public."Order" USING btree ("customerId", "createdAt");


--
-- Name: Order_status_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_paymentStatus_idx" ON public."Order" USING btree (status, "paymentStatus");


--
-- Name: Organization_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Organization_slug_key" ON public."Organization" USING btree (slug);


--
-- Name: OtpChallenge_claimSessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpChallenge_claimSessionId_idx" ON public."OtpChallenge" USING btree ("claimSessionId");


--
-- Name: OtpChallenge_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpChallenge_expiresAt_idx" ON public."OtpChallenge" USING btree ("expiresAt");


--
-- Name: OtpChallenge_phone_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON public."OtpChallenge" USING btree (phone, "createdAt");


--
-- Name: OtpChallenge_requestIpHash_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpChallenge_requestIpHash_createdAt_idx" ON public."OtpChallenge" USING btree ("requestIpHash", "createdAt");


--
-- Name: OtpChallenge_securityUserId_purpose_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpChallenge_securityUserId_purpose_expiresAt_idx" ON public."OtpChallenge" USING btree ("securityUserId", purpose, "expiresAt");


--
-- Name: OtpSendLog_phoneHash_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OtpSendLog_phoneHash_createdAt_idx" ON public."OtpSendLog" USING btree ("phoneHash", "createdAt");


--
-- Name: PasskeyChallenge_challengeHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasskeyChallenge_challengeHash_key" ON public."PasskeyChallenge" USING btree ("challengeHash");


--
-- Name: PasskeyChallenge_enrollmentSessionId_type_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyChallenge_enrollmentSessionId_type_expiresAt_idx" ON public."PasskeyChallenge" USING btree ("enrollmentSessionId", type, "expiresAt");


--
-- Name: PasskeyChallenge_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyChallenge_expiresAt_idx" ON public."PasskeyChallenge" USING btree ("expiresAt");


--
-- Name: PasskeyChallenge_userId_stepUpPurpose_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyChallenge_userId_stepUpPurpose_expiresAt_idx" ON public."PasskeyChallenge" USING btree ("userId", "stepUpPurpose", "expiresAt");


--
-- Name: PasskeyChallenge_userId_type_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyChallenge_userId_type_expiresAt_idx" ON public."PasskeyChallenge" USING btree ("userId", type, "expiresAt");


--
-- Name: PasskeyCredential_credentialId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON public."PasskeyCredential" USING btree ("credentialId");


--
-- Name: PasskeyCredential_deviceSessionId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyCredential_deviceSessionId_revokedAt_idx" ON public."PasskeyCredential" USING btree ("deviceSessionId", "revokedAt");


--
-- Name: PasskeyCredential_userId_revokedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasskeyCredential_userId_revokedAt_idx" ON public."PasskeyCredential" USING btree ("userId", "revokedAt");


--
-- Name: PhoneCountryConfig_enabled_displayOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PhoneCountryConfig_enabled_displayOrder_idx" ON public."PhoneCountryConfig" USING btree (enabled, "displayOrder");


--
-- Name: PhoneCountryConfig_iso2_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PhoneCountryConfig_iso2_key" ON public."PhoneCountryConfig" USING btree (iso2);


--
-- Name: Plan_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Plan_slug_key" ON public."Plan" USING btree (slug);


--
-- Name: PlatformSuggestion_profession_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PlatformSuggestion_profession_sortOrder_idx" ON public."PlatformSuggestion" USING btree (profession, "sortOrder");


--
-- Name: PlatformSuggestion_userId_profession_platformId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PlatformSuggestion_userId_profession_platformId_key" ON public."PlatformSuggestion" USING btree ("userId", profession, "platformId");


--
-- Name: ProducedTag_activationCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProducedTag_activationCode_key" ON public."ProducedTag" USING btree ("activationCode");


--
-- Name: ProducedTag_activationTokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProducedTag_activationTokenHash_key" ON public."ProducedTag" USING btree ("activationTokenHash");


--
-- Name: ProducedTag_assignedUserId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProducedTag_assignedUserId_status_idx" ON public."ProducedTag" USING btree ("assignedUserId", status);


--
-- Name: ProducedTag_batchId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProducedTag_batchId_status_idx" ON public."ProducedTag" USING btree ("batchId", status);


--
-- Name: ProducedTag_cardId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProducedTag_cardId_key" ON public."ProducedTag" USING btree ("cardId");


--
-- Name: ProducedTag_immutableToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProducedTag_immutableToken_key" ON public."ProducedTag" USING btree ("immutableToken");


--
-- Name: ProducedTag_permanentUrl_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProducedTag_permanentUrl_key" ON public."ProducedTag" USING btree ("permanentUrl");


--
-- Name: ProducedTag_shortCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProducedTag_shortCode_idx" ON public."ProducedTag" USING btree ("shortCode");


--
-- Name: ProductCategory_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCategory_isActive_sortOrder_idx" ON public."ProductCategory" USING btree ("isActive", "sortOrder");


--
-- Name: ProductFeature_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductFeature_productId_sortOrder_idx" ON public."ProductFeature" USING btree ("productId", "sortOrder");


--
-- Name: ProductImage_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductImage_productId_sortOrder_idx" ON public."ProductImage" USING btree ("productId", "sortOrder");


--
-- Name: ProductImage_variantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductImage_variantId_idx" ON public."ProductImage" USING btree ("variantId");


--
-- Name: ProductMedia_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductMedia_productId_sortOrder_idx" ON public."ProductMedia" USING btree ("productId", "sortOrder");


--
-- Name: ProductPrice_productId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductPrice_productId_isActive_idx" ON public."ProductPrice" USING btree ("productId", "isActive");


--
-- Name: ProductPrice_variantId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductPrice_variantId_isActive_idx" ON public."ProductPrice" USING btree ("variantId", "isActive");


--
-- Name: ProductSlug_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductSlug_productId_idx" ON public."ProductSlug" USING btree ("productId");


--
-- Name: ProductStatusHistory_cardId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductStatusHistory_cardId_createdAt_idx" ON public."ProductStatusHistory" USING btree ("cardId", "createdAt");


--
-- Name: ProductVariant_productId_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductVariant_productId_isActive_sortOrder_idx" ON public."ProductVariant" USING btree ("productId", "isActive", "sortOrder");


--
-- Name: Product_categoryId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_categoryId_status_idx" ON public."Product" USING btree ("categoryId", status);


--
-- Name: Product_status_featured_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_featured_sortOrder_idx" ON public."Product" USING btree (status, featured, "sortOrder");


--
-- Name: ProductionBatch_batchCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionBatch_batchCode_key" ON public."ProductionBatch" USING btree ("batchCode");


--
-- Name: ProductionBatch_legacyCardBatchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionBatch_legacyCardBatchId_key" ON public."ProductionBatch" USING btree ("legacyCardBatchId");


--
-- Name: ProductionBatch_productId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionBatch_productId_createdAt_idx" ON public."ProductionBatch" USING btree ("productId", "createdAt");


--
-- Name: ProductionBatch_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionBatch_status_createdAt_idx" ON public."ProductionBatch" USING btree (status, "createdAt");


--
-- Name: ProfileBranch_profileId_isVisible_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileBranch_profileId_isVisible_sortOrder_idx" ON public."ProfileBranch" USING btree ("profileId", "isVisible", "sortOrder");


--
-- Name: ProfileCategory_defaultTemplateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileCategory_defaultTemplateId_idx" ON public."ProfileCategory" USING btree ("defaultTemplateId");


--
-- Name: ProfileCategory_profileKind_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileCategory_profileKind_isActive_sortOrder_idx" ON public."ProfileCategory" USING btree ("profileKind", "isActive", "sortOrder");


--
-- Name: ProfileCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileCategory_slug_key" ON public."ProfileCategory" USING btree (slug);


--
-- Name: ProfileEntitlement_profileId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileEntitlement_profileId_key" ON public."ProfileEntitlement" USING btree ("profileId");


--
-- Name: ProfileEntitlement_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileEntitlement_sourceType_sourceId_idx" ON public."ProfileEntitlement" USING btree ("sourceType", "sourceId");


--
-- Name: ProfileEntitlement_userId_status_startsAt_endsAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileEntitlement_userId_status_startsAt_endsAt_idx" ON public."ProfileEntitlement" USING btree ("userId", status, "startsAt", "endsAt");


--
-- Name: ProfileField_profileId_isVisible_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileField_profileId_isVisible_sortOrder_idx" ON public."ProfileField" USING btree ("profileId", "isVisible", "sortOrder");


--
-- Name: ProfileField_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileField_userId_idx" ON public."ProfileField" USING btree ("userId");


--
-- Name: ProfileMediaAsset_profileId_state_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileMediaAsset_profileId_state_sortOrder_idx" ON public."ProfileMediaAsset" USING btree ("profileId", state, "sortOrder");


--
-- Name: ProfileMediaAsset_publicStorageKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileMediaAsset_publicStorageKey_key" ON public."ProfileMediaAsset" USING btree ("publicStorageKey");


--
-- Name: ProfileMediaAsset_state_orphanedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileMediaAsset_state_orphanedAt_idx" ON public."ProfileMediaAsset" USING btree (state, "orphanedAt");


--
-- Name: ProfileMediaAsset_state_temporaryExpiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileMediaAsset_state_temporaryExpiresAt_idx" ON public."ProfileMediaAsset" USING btree (state, "temporaryExpiresAt");


--
-- Name: ProfileMediaAsset_storageKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileMediaAsset_storageKey_key" ON public."ProfileMediaAsset" USING btree ("storageKey");


--
-- Name: ProfileMediaAsset_userId_state_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileMediaAsset_userId_state_createdAt_idx" ON public."ProfileMediaAsset" USING btree ("userId", state, "createdAt");


--
-- Name: ProfileModuleDefinition_isActive_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileModuleDefinition_isActive_key_idx" ON public."ProfileModuleDefinition" USING btree ("isActive", key);


--
-- Name: ProfileModuleDefinition_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileModuleDefinition_key_key" ON public."ProfileModuleDefinition" USING btree (key);


--
-- Name: ProfileModule_moduleDefinitionId_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileModule_moduleDefinitionId_enabled_idx" ON public."ProfileModule" USING btree ("moduleDefinitionId", enabled);


--
-- Name: ProfileModule_profileId_enabled_visibility_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileModule_profileId_enabled_visibility_sortOrder_idx" ON public."ProfileModule" USING btree ("profileId", enabled, visibility, "sortOrder");


--
-- Name: ProfileModule_profileId_moduleDefinitionId_instanceKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileModule_profileId_moduleDefinitionId_instanceKey_key" ON public."ProfileModule" USING btree ("profileId", "moduleDefinitionId", "instanceKey");


--
-- Name: ProfilePublication_profileId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfilePublication_profileId_key" ON public."ProfilePublication" USING btree ("profileId");


--
-- Name: ProfilePublication_publishedRevisionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfilePublication_publishedRevisionId_key" ON public."ProfilePublication" USING btree ("publishedRevisionId");


--
-- Name: ProfileRevisionBranch_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionBranch_revisionId_sortOrder_idx" ON public."ProfileRevisionBranch" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevisionDestination_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionDestination_revisionId_sortOrder_idx" ON public."ProfileRevisionDestination" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevisionField_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionField_revisionId_sortOrder_idx" ON public."ProfileRevisionField" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevisionFile_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionFile_revisionId_sortOrder_idx" ON public."ProfileRevisionFile" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevisionMedia_revisionId_mediaId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileRevisionMedia_revisionId_mediaId_key" ON public."ProfileRevisionMedia" USING btree ("revisionId", "mediaId");


--
-- Name: ProfileRevisionMedia_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionMedia_revisionId_sortOrder_idx" ON public."ProfileRevisionMedia" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevisionModule_revisionId_enabled_visibility_sortOrder_i; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionModule_revisionId_enabled_visibility_sortOrder_i" ON public."ProfileRevisionModule" USING btree ("revisionId", enabled, visibility, "sortOrder");


--
-- Name: ProfileRevisionModule_revisionId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileRevisionModule_revisionId_key_key" ON public."ProfileRevisionModule" USING btree ("revisionId", key);


--
-- Name: ProfileRevisionSectionEntry_revisionId_moduleKey_visibility_sor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionSectionEntry_revisionId_moduleKey_visibility_sor" ON public."ProfileRevisionSectionEntry" USING btree ("revisionId", "moduleKey", visibility, "sortOrder");


--
-- Name: ProfileRevisionSectionEntry_revisionId_sourceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileRevisionSectionEntry_revisionId_sourceId_key" ON public."ProfileRevisionSectionEntry" USING btree ("revisionId", "sourceId");


--
-- Name: ProfileRevisionService_revisionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevisionService_revisionId_sortOrder_idx" ON public."ProfileRevisionService" USING btree ("revisionId", "sortOrder");


--
-- Name: ProfileRevision_profileId_revisionNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileRevision_profileId_revisionNumber_key" ON public."ProfileRevision" USING btree ("profileId", "revisionNumber");


--
-- Name: ProfileRevision_profileId_status_revisionNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileRevision_profileId_status_revisionNumber_idx" ON public."ProfileRevision" USING btree ("profileId", status, "revisionNumber");


--
-- Name: ProfileSectionEntry_profileId_fieldKey_instanceKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileSectionEntry_profileId_fieldKey_instanceKey_key" ON public."ProfileSectionEntry" USING btree ("profileId", "fieldKey", "instanceKey");


--
-- Name: ProfileSectionEntry_profileId_moduleDefinitionId_visibility_sor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileSectionEntry_profileId_moduleDefinitionId_visibility_sor" ON public."ProfileSectionEntry" USING btree ("profileId", "moduleDefinitionId", visibility, "sortOrder");


--
-- Name: ProfileService_profileId_isVisible_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileService_profileId_isVisible_sortOrder_idx" ON public."ProfileService" USING btree ("profileId", "isVisible", "sortOrder");


--
-- Name: ProfileSlugHistory_profileId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileSlugHistory_profileId_createdAt_idx" ON public."ProfileSlugHistory" USING btree ("profileId", "createdAt");


--
-- Name: ProfileSlugHistory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileSlugHistory_slug_key" ON public."ProfileSlugHistory" USING btree (slug);


--
-- Name: ProfileTemplateModule_moduleDefinitionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileTemplateModule_moduleDefinitionId_idx" ON public."ProfileTemplateModule" USING btree ("moduleDefinitionId");


--
-- Name: ProfileTemplateModule_templateId_allowed_enabledByDefault_defau; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileTemplateModule_templateId_allowed_enabledByDefault_defau" ON public."ProfileTemplateModule" USING btree ("templateId", allowed, "enabledByDefault", "defaultSortOrder");


--
-- Name: ProfileTemplateModule_templateId_moduleDefinitionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileTemplateModule_templateId_moduleDefinitionId_key" ON public."ProfileTemplateModule" USING btree ("templateId", "moduleDefinitionId");


--
-- Name: ProfileTemplate_categoryId_profileKind_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileTemplate_categoryId_profileKind_isActive_idx" ON public."ProfileTemplate" USING btree ("categoryId", "profileKind", "isActive");


--
-- Name: ProfileTemplate_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileTemplate_isActive_sortOrder_idx" ON public."ProfileTemplate" USING btree ("isActive", "sortOrder");


--
-- Name: ProfileTemplate_minimumPlan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileTemplate_minimumPlan_idx" ON public."ProfileTemplate" USING btree ("minimumPlan");


--
-- Name: ProfileTemplate_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileTemplate_slug_key" ON public."ProfileTemplate" USING btree (slug);


--
-- Name: ProfileVerificationCase_profileId_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProfileVerificationCase_profileId_kind_key" ON public."ProfileVerificationCase" USING btree ("profileId", kind);


--
-- Name: ProfileVerificationCase_profileId_status_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileVerificationCase_profileId_status_kind_idx" ON public."ProfileVerificationCase" USING btree ("profileId", status, kind);


--
-- Name: ProfileVerificationCase_status_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProfileVerificationCase_status_expiresAt_idx" ON public."ProfileVerificationCase" USING btree (status, "expiresAt");


--
-- Name: Profile_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_categoryId_idx" ON public."Profile" USING btree ("categoryId");


--
-- Name: Profile_creationKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Profile_creationKey_key" ON public."Profile" USING btree ("creationKey");


--
-- Name: Profile_one_active_primary_per_user_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Profile_one_active_primary_per_user_key" ON public."Profile" USING btree ("userId") WHERE (("isPrimary" = true) AND ("archivedAt" IS NULL));


--
-- Name: Profile_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_organizationId_idx" ON public."Profile" USING btree ("organizationId");


--
-- Name: Profile_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_slug_idx" ON public."Profile" USING btree (slug);


--
-- Name: Profile_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Profile_slug_key" ON public."Profile" USING btree (slug);


--
-- Name: Profile_templateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_templateId_idx" ON public."Profile" USING btree ("templateId");


--
-- Name: Profile_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_userId_idx" ON public."Profile" USING btree ("userId");


--
-- Name: Profile_userId_lifecycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Profile_userId_lifecycle_idx" ON public."Profile" USING btree ("userId", lifecycle);


--
-- Name: PurchaseItem_inventoryItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseItem_inventoryItemId_idx" ON public."PurchaseItem" USING btree ("inventoryItemId");


--
-- Name: PurchaseItem_purchaseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseItem_purchaseId_idx" ON public."PurchaseItem" USING btree ("purchaseId");


--
-- Name: Purchase_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Purchase_status_idx" ON public."Purchase" USING btree (status);


--
-- Name: Purchase_supplierId_purchaseDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Purchase_supplierId_purchaseDate_idx" ON public."Purchase" USING btree ("supplierId", "purchaseDate");


--
-- Name: QuotaIncreaseRequest_reviewedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuotaIncreaseRequest_reviewedById_idx" ON public."QuotaIncreaseRequest" USING btree ("reviewedById");


--
-- Name: QuotaIncreaseRequest_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuotaIncreaseRequest_status_createdAt_idx" ON public."QuotaIncreaseRequest" USING btree (status, "createdAt");


--
-- Name: QuotaIncreaseRequest_userId_resource_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QuotaIncreaseRequest_userId_resource_status_createdAt_idx" ON public."QuotaIncreaseRequest" USING btree ("userId", resource, status, "createdAt");


--
-- Name: Session_deviceSessionId_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_deviceSessionId_expires_idx" ON public."Session" USING btree ("deviceSessionId", expires);


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: Session_userId_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_expires_idx" ON public."Session" USING btree ("userId", expires);


--
-- Name: StepUpGrant_deviceSessionId_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StepUpGrant_deviceSessionId_expiresAt_idx" ON public."StepUpGrant" USING btree ("deviceSessionId", "expiresAt");


--
-- Name: StepUpGrant_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StepUpGrant_tokenHash_key" ON public."StepUpGrant" USING btree ("tokenHash");


--
-- Name: StepUpGrant_userId_purpose_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StepUpGrant_userId_purpose_expiresAt_idx" ON public."StepUpGrant" USING btree ("userId", purpose, "expiresAt");


--
-- Name: StepUpGrant_webSessionId_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StepUpGrant_webSessionId_expiresAt_idx" ON public."StepUpGrant" USING btree ("webSessionId", "expiresAt");


--
-- Name: TagAlias_tagId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagAlias_tagId_idx" ON public."TagAlias" USING btree ("tagId");


--
-- Name: TagEvent_tagId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagEvent_tagId_createdAt_idx" ON public."TagEvent" USING btree ("tagId", "createdAt");


--
-- Name: TagTransfer_fromUserId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagTransfer_fromUserId_status_idx" ON public."TagTransfer" USING btree ("fromUserId", status);


--
-- Name: TagTransfer_invitedEmail_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagTransfer_invitedEmail_status_idx" ON public."TagTransfer" USING btree ("invitedEmail", status);


--
-- Name: TagTransfer_tagId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagTransfer_tagId_status_idx" ON public."TagTransfer" USING btree ("tagId", status);


--
-- Name: TagTransfer_toUserId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TagTransfer_toUserId_status_idx" ON public."TagTransfer" USING btree ("toUserId", status);


--
-- Name: Tag_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_organizationId_idx" ON public."Tag" USING btree ("organizationId");


--
-- Name: Tag_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_ownerId_idx" ON public."Tag" USING btree ("ownerId");


--
-- Name: Tag_shortCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_shortCode_idx" ON public."Tag" USING btree ("shortCode");


--
-- Name: Tag_shortCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_shortCode_key" ON public."Tag" USING btree ("shortCode");


--
-- Name: Tag_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_status_idx" ON public."Tag" USING btree (status);


--
-- Name: Tag_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_token_idx" ON public."Tag" USING btree (token);


--
-- Name: Tag_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_token_key" ON public."Tag" USING btree (token);


--
-- Name: UploadedFile_profileId_isVisible_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UploadedFile_profileId_isVisible_idx" ON public."UploadedFile" USING btree ("profileId", "isVisible");


--
-- Name: UploadedFile_storageKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UploadedFile_storageKey_key" ON public."UploadedFile" USING btree ("storageKey");


--
-- Name: UploadedFile_uploaderUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UploadedFile_uploaderUserId_createdAt_idx" ON public."UploadedFile" USING btree ("uploaderUserId", "createdAt");


--
-- Name: UserBlock_blockedId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBlock_blockedId_idx" ON public."UserBlock" USING btree ("blockedId");


--
-- Name: UserBlock_ownerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserBlock_ownerId_createdAt_idx" ON public."UserBlock" USING btree ("ownerId", "createdAt");


--
-- Name: UserLegalConsent_legalDocumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserLegalConsent_legalDocumentId_idx" ON public."UserLegalConsent" USING btree ("legalDocumentId");


--
-- Name: UserLegalConsent_userId_acceptedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserLegalConsent_userId_acceptedAt_idx" ON public."UserLegalConsent" USING btree ("userId", "acceptedAt");


--
-- Name: UserLegalConsent_userId_legalDocumentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserLegalConsent_userId_legalDocumentId_key" ON public."UserLegalConsent" USING btree ("userId", "legalDocumentId");


--
-- Name: UserLimitOverride_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserLimitOverride_userId_key" ON public."UserLimitOverride" USING btree ("userId");


--
-- Name: UserPlan_planId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserPlan_planId_idx" ON public."UserPlan" USING btree ("planId");


--
-- Name: UserPlan_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserPlan_userId_status_idx" ON public."UserPlan" USING btree ("userId", status);


--
-- Name: UserPreference_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserPreference_userId_key" ON public."UserPreference" USING btree ("userId");


--
-- Name: UserReport_reporterId_subjectId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReport_reporterId_subjectId_createdAt_idx" ON public."UserReport" USING btree ("reporterId", "subjectId", "createdAt");


--
-- Name: UserReport_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReport_status_createdAt_idx" ON public."UserReport" USING btree (status, "createdAt");


--
-- Name: UserReport_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReport_subjectId_idx" ON public."UserReport" USING btree ("subjectId");


--
-- Name: UserReport_targetProfileId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserReport_targetProfileId_createdAt_idx" ON public."UserReport" USING btree ("targetProfileId", "createdAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_phoneE164_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phoneE164_key" ON public."User" USING btree ("phoneE164");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: VirtualCard_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCard_organizationId_idx" ON public."VirtualCard" USING btree ("organizationId");


--
-- Name: VirtualCard_profileId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VirtualCard_profileId_key" ON public."VirtualCard" USING btree ("profileId");


--
-- Name: VirtualCard_themeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCard_themeId_idx" ON public."VirtualCard" USING btree ("themeId");


--
-- Name: VirtualCard_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VirtualCard_userId_status_idx" ON public."VirtualCard" USING btree ("userId", status);


--
-- Name: WalletPass_platform_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WalletPass_platform_status_idx" ON public."WalletPass" USING btree (platform, status);


--
-- Name: WalletPass_serialNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WalletPass_serialNumber_key" ON public."WalletPass" USING btree ("serialNumber");


--
-- Name: WalletPass_virtualCardId_platform_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WalletPass_virtualCardId_platform_key" ON public."WalletPass" USING btree ("virtualCardId", platform);


--
-- Name: AccountDeletionRequest AccountDeletionRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountDeletionRequest"
    ADD CONSTRAINT "AccountDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivationAttempt ActivationAttempt_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivationAttempt"
    ADD CONSTRAINT "ActivationAttempt_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivationClaimSession ActivationClaimSession_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivationClaimSession"
    ADD CONSTRAINT "ActivationClaimSession_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivationClaimSession ActivationClaimSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivationClaimSession"
    ADD CONSTRAINT "ActivationClaimSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AdminNotificationCampaign AdminNotificationCampaign_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminNotificationCampaign"
    ADD CONSTRAINT "AdminNotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdminNotificationDelivery AdminNotificationDelivery_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminNotificationDelivery"
    ADD CONSTRAINT "AdminNotificationDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."AdminNotificationCampaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminNotificationDelivery AdminNotificationDelivery_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminNotificationDelivery"
    ADD CONSTRAINT "AdminNotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuthTicket AuthTicket_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuthTicket"
    ADD CONSTRAINT "AuthTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CardBatch CardBatch_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardBatch"
    ADD CONSTRAINT "CardBatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CardBatch CardBatch_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardBatch"
    ADD CONSTRAINT "CardBatch_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CardBatch CardBatch_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardBatch"
    ADD CONSTRAINT "CardBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CardBatch CardBatch_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardBatch"
    ADD CONSTRAINT "CardBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CardImportedField CardImportedField_connectedAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardImportedField"
    ADD CONSTRAINT "CardImportedField_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES public."ConnectedAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CardImportedField CardImportedField_virtualCardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardImportedField"
    ADD CONSTRAINT "CardImportedField_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES public."VirtualCard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CardOpenDaily CardOpenDaily_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CardOpenDaily"
    ADD CONSTRAINT "CardOpenDaily_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Card Card_activeDestinationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_activeDestinationId_fkey" FOREIGN KEY ("activeDestinationId") REFERENCES public."Destination"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Card Card_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."CardBatch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Card Card_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Card Card_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Card Card_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Card Card_virtualCardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES public."VirtualCard"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMember ChatMember_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMember ChatMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMember"
    ADD CONSTRAINT "ChatMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConnectedAccount ConnectedAccount_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConnectedAccount"
    ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentAttachment ContentAttachment_contentEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentAttachment"
    ADD CONSTRAINT "ContentAttachment_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES public."ContentEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentAttachment ContentAttachment_uploadedFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentAttachment"
    ADD CONSTRAINT "ContentAttachment_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES public."UploadedFile"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ContentEntry ContentEntry_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentEntry"
    ADD CONSTRAINT "ContentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentPublication ContentPublication_contentEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentPublication"
    ADD CONSTRAINT "ContentPublication_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES public."ContentEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentPublication ContentPublication_virtualCardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContentPublication"
    ADD CONSTRAINT "ContentPublication_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES public."VirtualCard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Customer Customer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Destination Destination_linkPlatformId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_linkPlatformId_fkey" FOREIGN KEY ("linkPlatformId") REFERENCES public."LinkPlatform"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Destination Destination_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Destination Destination_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Destination Destination_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DevicePushToken DevicePushToken_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevicePushToken"
    ADD CONSTRAINT "DevicePushToken_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DevicePushToken DevicePushToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DevicePushToken"
    ADD CONSTRAINT "DevicePushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeviceSession DeviceSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceSession"
    ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Expense Expense_attachmentFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES public."UploadedFile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ExpenseCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExternalIdentity ExternalIdentity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExternalIdentity"
    ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FeatureComment FeatureComment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureComment"
    ADD CONSTRAINT "FeatureComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeatureComment FeatureComment_featureRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureComment"
    ADD CONSTRAINT "FeatureComment_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES public."FeatureRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeatureRequest FeatureRequest_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureRequest"
    ADD CONSTRAINT "FeatureRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FeatureRequest FeatureRequest_mergedIntoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureRequest"
    ADD CONSTRAINT "FeatureRequest_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES public."FeatureRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FeatureVote FeatureVote_featureRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureVote"
    ADD CONSTRAINT "FeatureVote_featureRequestId_fkey" FOREIGN KEY ("featureRequestId") REFERENCES public."FeatureRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeatureVote FeatureVote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FeatureVote"
    ADD CONSTRAINT "FeatureVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_followerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_followingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendNotificationEvent FriendNotificationEvent_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendNotificationEvent"
    ADD CONSTRAINT "FriendNotificationEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FriendNotificationEvent FriendNotificationEvent_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendNotificationEvent"
    ADD CONSTRAINT "FriendNotificationEvent_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendNotificationEvent FriendNotificationEvent_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendNotificationEvent"
    ADD CONSTRAINT "FriendNotificationEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."FriendRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FriendPreference FriendPreference_friendId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPreference"
    ADD CONSTRAINT "FriendPreference_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendPreference FriendPreference_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPreference"
    ADD CONSTRAINT "FriendPreference_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendPrivacyRule FriendPrivacyRule_friendId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPrivacyRule"
    ADD CONSTRAINT "FriendPrivacyRule_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendPrivacyRule FriendPrivacyRule_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendPrivacyRule"
    ADD CONSTRAINT "FriendPrivacyRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendRequest FriendRequest_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendRequest"
    ADD CONSTRAINT "FriendRequest_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendRequest FriendRequest_requesterUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendRequest"
    ADD CONSTRAINT "FriendRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FriendsPreference FriendsPreference_socialProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendsPreference"
    ADD CONSTRAINT "FriendsPreference_socialProfileId_fkey" FOREIGN KEY ("socialProfileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FriendsPreference FriendsPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FriendsPreference"
    ADD CONSTRAINT "FriendsPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friendship Friendship_blockedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Friendship Friendship_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friendship Friendship_userAId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Friendship Friendship_userBId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Friendship"
    ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryBatch InventoryBatch_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBatch"
    ADD CONSTRAINT "InventoryBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryItem InventoryItem_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryMovement InventoryMovement_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryMovement InventoryMovement_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Membership Membership_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Membership Membership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Membership"
    ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageReport MessageReport_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageReport"
    ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageReport MessageReport_reporterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageReport"
    ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageReport MessageReport_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MessageReport"
    ADD CONSTRAINT "MessageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_attachmentFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES public."UploadedFile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MobileAuthChallenge MobileAuthChallenge_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileAuthChallenge"
    ADD CONSTRAINT "MobileAuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MobileDeviceCredential MobileDeviceCredential_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileDeviceCredential"
    ADD CONSTRAINT "MobileDeviceCredential_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MobileDeviceCredential MobileDeviceCredential_enrollmentSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileDeviceCredential"
    ADD CONSTRAINT "MobileDeviceCredential_enrollmentSessionId_fkey" FOREIGN KEY ("enrollmentSessionId") REFERENCES public."MobileEnrollmentSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MobileDeviceCredential MobileDeviceCredential_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileDeviceCredential"
    ADD CONSTRAINT "MobileDeviceCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MobileEnrollmentSession MobileEnrollmentSession_challengeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileEnrollmentSession"
    ADD CONSTRAINT "MobileEnrollmentSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES public."MobileAuthChallenge"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MobileEnrollmentSession MobileEnrollmentSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileEnrollmentSession"
    ADD CONSTRAINT "MobileEnrollmentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MobileRefreshToken MobileRefreshToken_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileRefreshToken"
    ADD CONSTRAINT "MobileRefreshToken_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MobileRefreshToken MobileRefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MobileRefreshToken"
    ADD CONSTRAINT "MobileRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NearbyPreference NearbyPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyPreference"
    ADD CONSTRAINT "NearbyPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NearbyPresence NearbyPresence_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyPresence"
    ADD CONSTRAINT "NearbyPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NearbyRateLimitBucket NearbyRateLimitBucket_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NearbyRateLimitBucket"
    ADD CONSTRAINT "NearbyRateLimitBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NotificationPreference NotificationPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OAuthConnectionState OAuthConnectionState_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OAuthConnectionState"
    ADD CONSTRAINT "OAuthConnectionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingDefinition OnboardingDefinition_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingDefinition"
    ADD CONSTRAINT "OnboardingDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProfileCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OnboardingDefinition OnboardingDefinition_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingDefinition"
    ADD CONSTRAINT "OnboardingDefinition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ProfileTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OnboardingProgress OnboardingProgress_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public."OnboardingDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OnboardingProgress OnboardingProgress_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingProgress OnboardingProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingProgress"
    ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingQuestionCondition OnboardingQuestionCondition_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestionCondition"
    ADD CONSTRAINT "OnboardingQuestionCondition_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."OnboardingQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingQuestionOption OnboardingQuestionOption_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestionOption"
    ADD CONSTRAINT "OnboardingQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."OnboardingQuestion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingQuestion OnboardingQuestion_stepId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingQuestion"
    ADD CONSTRAINT "OnboardingQuestion_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES public."OnboardingStep"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingStep OnboardingStep_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingStep"
    ADD CONSTRAINT "OnboardingStep_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public."OnboardingDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OnboardingStep OnboardingStep_moduleDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OnboardingStep"
    ADD CONSTRAINT "OnboardingStep_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES public."ProfileModuleDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Organization Organization_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OtpChallenge OtpChallenge_claimSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OtpChallenge"
    ADD CONSTRAINT "OtpChallenge_claimSessionId_fkey" FOREIGN KEY ("claimSessionId") REFERENCES public."ActivationClaimSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasskeyChallenge PasskeyChallenge_enrollmentSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyChallenge"
    ADD CONSTRAINT "PasskeyChallenge_enrollmentSessionId_fkey" FOREIGN KEY ("enrollmentSessionId") REFERENCES public."MobileEnrollmentSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasskeyChallenge PasskeyChallenge_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyChallenge"
    ADD CONSTRAINT "PasskeyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasskeyCredential PasskeyCredential_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyCredential"
    ADD CONSTRAINT "PasskeyCredential_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PasskeyCredential PasskeyCredential_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasskeyCredential"
    ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlatformSuggestion PlatformSuggestion_platformId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlatformSuggestion"
    ADD CONSTRAINT "PlatformSuggestion_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES public."LinkPlatform"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PlatformSuggestion PlatformSuggestion_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PlatformSuggestion"
    ADD CONSTRAINT "PlatformSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProducedTag ProducedTag_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProducedTag"
    ADD CONSTRAINT "ProducedTag_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProducedTag ProducedTag_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProducedTag"
    ADD CONSTRAINT "ProducedTag_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."ProductionBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProducedTag ProducedTag_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProducedTag"
    ADD CONSTRAINT "ProducedTag_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductFeature ProductFeature_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductFeature"
    ADD CONSTRAINT "ProductFeature_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImage ProductImage_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductInventory ProductInventory_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductInventory"
    ADD CONSTRAINT "ProductInventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductMedia ProductMedia_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductMedia"
    ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductPrice ProductPrice_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPrice"
    ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductPrice ProductPrice_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductPrice"
    ADD CONSTRAINT "ProductPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductSlug ProductSlug_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductSlug"
    ADD CONSTRAINT "ProductSlug_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductStatusHistory ProductStatusHistory_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStatusHistory"
    ADD CONSTRAINT "ProductStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductStatusHistory ProductStatusHistory_cardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductStatusHistory"
    ADD CONSTRAINT "ProductStatusHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductionBatch ProductionBatch_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductionBatch ProductionBatch_legacyCardBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_legacyCardBatchId_fkey" FOREIGN KEY ("legacyCardBatchId") REFERENCES public."CardBatch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionBatch ProductionBatch_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionBatch"
    ADD CONSTRAINT "ProductionBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileBranch ProfileBranch_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileBranch"
    ADD CONSTRAINT "ProfileBranch_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileCategory ProfileCategory_defaultTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileCategory"
    ADD CONSTRAINT "ProfileCategory_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES public."ProfileTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProfileEntitlement ProfileEntitlement_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileEntitlement"
    ADD CONSTRAINT "ProfileEntitlement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProfileEntitlement ProfileEntitlement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileEntitlement"
    ADD CONSTRAINT "ProfileEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileField ProfileField_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileField"
    ADD CONSTRAINT "ProfileField_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileField ProfileField_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileField"
    ADD CONSTRAINT "ProfileField_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileMediaAsset ProfileMediaAsset_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileMediaAsset"
    ADD CONSTRAINT "ProfileMediaAsset_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProfileMediaAsset ProfileMediaAsset_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileMediaAsset"
    ADD CONSTRAINT "ProfileMediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileModule ProfileModule_moduleDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileModule"
    ADD CONSTRAINT "ProfileModule_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES public."ProfileModuleDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileModule ProfileModule_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileModule"
    ADD CONSTRAINT "ProfileModule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfilePublication ProfilePublication_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfilePublication"
    ADD CONSTRAINT "ProfilePublication_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfilePublication ProfilePublication_publishedRevisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfilePublication"
    ADD CONSTRAINT "ProfilePublication_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileRevisionBranch ProfileRevisionBranch_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionBranch"
    ADD CONSTRAINT "ProfileRevisionBranch_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionDestination ProfileRevisionDestination_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionDestination"
    ADD CONSTRAINT "ProfileRevisionDestination_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionField ProfileRevisionField_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionField"
    ADD CONSTRAINT "ProfileRevisionField_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionFile ProfileRevisionFile_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionFile"
    ADD CONSTRAINT "ProfileRevisionFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionMedia ProfileRevisionMedia_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionMedia"
    ADD CONSTRAINT "ProfileRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionModule ProfileRevisionModule_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionModule"
    ADD CONSTRAINT "ProfileRevisionModule_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionSectionEntry ProfileRevisionSectionEntry_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionSectionEntry"
    ADD CONSTRAINT "ProfileRevisionSectionEntry_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevisionService ProfileRevisionService_revisionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevisionService"
    ADD CONSTRAINT "ProfileRevisionService_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES public."ProfileRevision"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileRevision ProfileRevision_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileRevision"
    ADD CONSTRAINT "ProfileRevision_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileSectionEntry ProfileSectionEntry_moduleDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileSectionEntry"
    ADD CONSTRAINT "ProfileSectionEntry_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES public."ProfileModuleDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileSectionEntry ProfileSectionEntry_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileSectionEntry"
    ADD CONSTRAINT "ProfileSectionEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileService ProfileService_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileService"
    ADD CONSTRAINT "ProfileService_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileSlugHistory ProfileSlugHistory_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileSlugHistory"
    ADD CONSTRAINT "ProfileSlugHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileTemplateModule ProfileTemplateModule_moduleDefinitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileTemplateModule"
    ADD CONSTRAINT "ProfileTemplateModule_moduleDefinitionId_fkey" FOREIGN KEY ("moduleDefinitionId") REFERENCES public."ProfileModuleDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileTemplateModule ProfileTemplateModule_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileTemplateModule"
    ADD CONSTRAINT "ProfileTemplateModule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ProfileTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileTemplate ProfileTemplate_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileTemplate"
    ADD CONSTRAINT "ProfileTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProfileCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProfileVerificationCase ProfileVerificationCase_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProfileVerificationCase"
    ADD CONSTRAINT "ProfileVerificationCase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Profile Profile_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProfileCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Profile Profile_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Profile Profile_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."ProfileTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Profile Profile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Profile"
    ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseItem PurchaseItem_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseItem PurchaseItem_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseItem"
    ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Purchase Purchase_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Purchase Purchase_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QuotaIncreaseRequest QuotaIncreaseRequest_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuotaIncreaseRequest"
    ADD CONSTRAINT "QuotaIncreaseRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuotaIncreaseRequest QuotaIncreaseRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QuotaIncreaseRequest"
    ADD CONSTRAINT "QuotaIncreaseRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StepUpGrant StepUpGrant_deviceSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StepUpGrant"
    ADD CONSTRAINT "StepUpGrant_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES public."DeviceSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StepUpGrant StepUpGrant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StepUpGrant"
    ADD CONSTRAINT "StepUpGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StepUpGrant StepUpGrant_webSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StepUpGrant"
    ADD CONSTRAINT "StepUpGrant_webSessionId_fkey" FOREIGN KEY ("webSessionId") REFERENCES public."Session"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TagAlias TagAlias_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagAlias"
    ADD CONSTRAINT "TagAlias_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TagEvent TagEvent_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagEvent"
    ADD CONSTRAINT "TagEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TagTransfer TagTransfer_fromUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagTransfer"
    ADD CONSTRAINT "TagTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TagTransfer TagTransfer_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagTransfer"
    ADD CONSTRAINT "TagTransfer_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Card"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TagTransfer TagTransfer_toUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TagTransfer"
    ADD CONSTRAINT "TagTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tag Tag_activeDestinationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_activeDestinationId_fkey" FOREIGN KEY ("activeDestinationId") REFERENCES public."Destination"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tag Tag_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tag Tag_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tag Tag_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UploadedFile UploadedFile_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UploadedFile UploadedFile_uploaderUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UploadedFile"
    ADD CONSTRAINT "UploadedFile_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserBlock UserBlock_blockedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBlock"
    ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserBlock UserBlock_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserBlock"
    ADD CONSTRAINT "UserBlock_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserLegalConsent UserLegalConsent_legalDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLegalConsent"
    ADD CONSTRAINT "UserLegalConsent_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES public."LegalDocument"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserLegalConsent UserLegalConsent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLegalConsent"
    ADD CONSTRAINT "UserLegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserLimitOverride UserLimitOverride_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserLimitOverride"
    ADD CONSTRAINT "UserLimitOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPlan UserPlan_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPlan"
    ADD CONSTRAINT "UserPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES public."Plan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserPlan UserPlan_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPlan"
    ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPreference UserPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserPreference"
    ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserReport UserReport_reporterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReport"
    ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserReport UserReport_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReport"
    ADD CONSTRAINT "UserReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserReport UserReport_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReport"
    ADD CONSTRAINT "UserReport_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserReport UserReport_targetProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserReport"
    ADD CONSTRAINT "UserReport_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VirtualCard VirtualCard_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCard"
    ADD CONSTRAINT "VirtualCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VirtualCard VirtualCard_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCard"
    ADD CONSTRAINT "VirtualCard_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public."Profile"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VirtualCard VirtualCard_themeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCard"
    ADD CONSTRAINT "VirtualCard_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES public."ProfileTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VirtualCard VirtualCard_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VirtualCard"
    ADD CONSTRAINT "VirtualCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WalletPass WalletPass_virtualCardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WalletPass"
    ADD CONSTRAINT "WalletPass_virtualCardId_fkey" FOREIGN KEY ("virtualCardId") REFERENCES public."VirtualCard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict WmDugH74QIIDHZhpcSclvLvuWVhwLEzT0w4gNVCKfm0L2T1jjfJhrJvl5AlfRhi

