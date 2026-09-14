# POP environment contract — PRE-PASS 7A

Audit: 2026-09-13 UTC; finalized 2026-09-14 local. **ENV CONTRACT CLEANUP — CLOSED for CURRENT PRODUCTION / CURRENT TEST. PASS 7A NOT started.** Future release and UI review items are explicitly deferred below.

This is the authoritative current inventory, superseding environment instructions in older reports. Historical reports remain dated evidence. Starting checkout was clean at `66b7b4b2629552fc6418fe429787406e680f7b52`; the intervening commit/deployment already existed. No commit or deployment was made by this pass.

## Inventory method

Searched active Web/shared/auth/storage/database source, Prisma schema/configuration, seed/maintenance/deploy scripts, Android Gradle wiring, root Turbo/Next/Railway configuration and the committed `.env.example`. Reviewed literal reads, bracket reads, environment helper calls, provider descriptor mappings and dynamic lookup arrays. Included requested-but-unused names, build/tool names and the opt-in integration-test switch; excluded enum/error strings from candidate extraction. Railway-generated unrelated service URLs are platform metadata, listed separately. Secret-bearing environment files and raw Railway responses were neither printed nor saved.

USED_REQUIRED means required for this release's deployed core contract; individual libraries retain some development fallbacks. FEATURE_DISABLED_OPTIONAL describes conditionally configured functionality, not a claim that every environment disables it. Table presence means **post-cleanup stored Railway configuration**. Running containers retain their earlier environment until a future authorized restart. TEST API/public have identical application-variable presence.

## Current versus future deployment contract

| Scope | Contract / result |
|---|---|
| CURRENT PRODUCTION | Existing secrets, canonical domains, active Meta connected accounts, FCM and media config retained. Current validator passes. No Production secret added/changed during finalization. |
| CURRENT TEST | Evolution mobile sign-in enabled, isolated DB/app/public origins, approved debug passkey origin. Current TEST validators pass; no bypass variables. |
| FUTURE PRODUCTION AUTH REQUIREMENT | EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE plus reviewed release PASSKEY_ANDROID_ORIGINS. Intentionally not configured/approved yet. Explicit local preflight: `node scripts/validate-production-env.mjs --future-auth`. |

**PRODUCTION EVOLUTION AUTH: NOT DEPLOYED / ENV INTENTIONALLY ABSENT.** This is the owner's deployment-stage contract. The observed pre-existing commit metadata does not establish operational auth activation. The earlier audit inference that missing Evolution variables blocked current Production cleanup is superseded. No variables were added and no deployment occurred. Default Production validation accepts their complete absence; partial configuration requires the full group. Future preflight requires the group and rejects the known TEST debug signer.

Meta/SMS consumers below are live account-security/Admin tooling, not mobile login. Their contracts are KEEP; any architectural migration/removal is REVIEW_LATER, outside this pass. R2_ACCOUNT_ID remains until the deployed old validator is replaced. Production's Android signer remains REVIEW_LATER — RELEASE SIGNING ORIGIN NOT YET CONFIGURED; it does not block TEST acceptance.

The clear backend URL configuration bugs were fixed: isolated TEST production builds may resolve their approved application origin, and public activation/programming/NFC/CSV paths now prefer PUBLIC_URL over the compatibility alias. Android/UI Share, preview, cached-link and native URL-policy changes remain deferred. Hence canonical env values/backend configuration are verified, but universal runtime URL compliance remains NO.

## OTP and activation authority

### Final active Meta/SMS reference classification

Route B1: `POST /api/security/step-up/options` → `sendOtpStepUp()` in `apps/web/src/lib/security-step-up.ts` → `WhatsAppOtpProvider` / `SmsOtpProviderAdapter`.

Route B2: `POST /api/security/account/phone/change/start` → `startPhoneChange()` in `apps/web/src/lib/security-account.ts` → the same provider adapters.

Route C1: `POST /api/admin/sms/test` → `getSmsProvider()` / `deliverOtpCode()`; authenticated Admin delivery diagnostics. It writes a LOGIN-purpose log but does not create a login ticket or session.

Route C2: `GET /admin/integrations` → server-rendered provider readiness display only; no delivery.

No A (retired login) consumer remains for the following variables. Mobile `/api/mobile/auth/otp/request` uses Evolution exclusively. Do not delete B/C configuration or refactor those features in this pass.

| Variable | Exact reading service | Active routes / classification | Decision |
|---|---|---|---|
| WHATSAPP_OTP_ENABLED | phone-otp.ts: WhatsAppOtpProvider.configured; AdminIntegrationsPage | B1/B2: B; C2: C | KEEP contract; transport modernization REVIEW_LATER |
| WHATSAPP_PHONE_NUMBER_ID | phone-otp.ts: configured/sendOtp; AdminIntegrationsPage | B1/B2: B; C2: C | KEEP |
| WHATSAPP_ACCESS_TOKEN | phone-otp.ts: configured/sendOtp; AdminIntegrationsPage | B1/B2: B; C2: C | KEEP |
| WHATSAPP_AUTH_TEMPLATE_NAME | phone-otp.ts: configured/sendOtp; AdminIntegrationsPage | B1/B2: B; C2: C | KEEP |
| WHATSAPP_AUTH_TEMPLATE_LANGUAGE | phone-otp.ts: sendOtp | B1/B2: B | KEEP optional default |
| WHATSAPP_BUSINESS_ACCOUNT_ID | No reader | No active A/B/C route | REMOVED from active example; already absent on Railway |
| SMS_API_URL | sms/index.ts: WebhookSmsProvider.sendOtp | B1/B2: B; C1: C | KEEP |
| SMS_API_TOKEN | sms/index.ts: WebhookSmsProvider.sendOtp | B1/B2: B; C1: C | KEEP |
| SMS_SENDER_ID | sms/index.ts: WebhookSmsProvider.sendOtp, fallback after runtime.senderName | B1/B2: B; C1: C | KEEP optional fallback |

WHATSAPP_OTP_ENABLED is the only active `WHATSAPP_OTP_*` environment name. No additional matching names were found. Optional legacy provider contracts remain REVIEW_LATER in the inventory solely for dedicated transport retirement assessment; that status does not authorize deletion while B/C depend on them. Both Railway environments already omit these credentials.

### Final old OTP / activation resolution

| Variable | Exact active consumer | Purpose | Duplicate of Evolution OTP | Decision |
|---|---|---|---|---|
| OTP_EXPIRY_MINUTES | otp-policy.ts → security-step-up.sendOtpStepUp; security-account.startPhoneChange; /api/admin/sms/test | Non-login challenge/delivery validity | NO | KEEP |
| OTP_SEND_COOLDOWN_SECONDS | otp-policy.ts → security-step-up.sendOtpStepUp (otpRetryAfter) | Non-login security resend cooldown; other policy callers read but do not apply this field | NO | KEEP |
| OTP_HOURLY_SEND_LIMIT | otp-policy.ts → security-step-up.sendOtpStepUp; /api/admin/sms/test | Non-login security/Admin delivery hourly limit | NO | KEEP |
| ACTIVATION_SESSION_MINUTES | POST /api/activation/start | Card-claim session expiry | NO | KEEP |
| ACTIVATION_MAX_ATTEMPTS | POST /api/activation/start; POST /api/mobile/activation/inspect | Card-claim abuse attempts | NO | KEEP |
| ACTIVATION_SCRATCH_PEPPER | card-tokens.ts:scratchPepper → hash/verify scratch codes | Scratch-secret protection | NO | KEEP |
| ACTIVATION_RATE_LIMIT_PEPPER | share-center.ts:requestFingerprints → claimScratchActivation | Request/context fingerprint HMAC for activation abuse controls | NO | KEEP |

OTP_MAX_ATTEMPTS remains the single shared attempts variable; Evolution TTL/resend settings govern mobile login, while the separate old TTL/resend settings govern B/C. ACTIVATION limits do not deliver or verify login OTP.

| Setting | Authority | Scope / decision |
|---|---|---|
| Mobile delivery | EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE | All read by EvolutionOtpSender. Presence, HTTPS and instance syntax validated; no invented key-length requirement. |
| Mobile TTL | OTP_TTL_SECONDS | Default 300 seconds; range 60–900. |
| Mobile resend | OTP_RESEND_COOLDOWN_SECONDS | Default 60 seconds; range 30–300. |
| Attempts | OTP_MAX_ATTEMPTS | Both policies read this name. Evolution default 5/range 1–10; legacy default/cap 10. TEST pins 5. |
| Mobile hourly throttle | Constants in mobile-otp.ts | 5/phone/hour, 30/source/hour. OTP_HOURLY_SEND_LIMIT does not control mobile login. |
| Security/recovery/Admin-test TTL | OTP_EXPIRY_MINUTES | Separate legacy policy: default/cap 5 minutes, floor 3. Retained. |
| Security/Admin-test resend | OTP_SEND_COOLDOWN_SECONDS | Legacy default/floor 60 seconds. Retained. |
| Security/Admin-test hourly throttle | OTP_HOURLY_SEND_LIMIT | Legacy default/cap 5, floor 1. Retained. |
| Challenge hashing | OTP_PEPPER | Active HMAC key; deployment/mobile minimum 32 characters. |
| Card-claim expiry | ACTIVATION_SESSION_MINUTES | Web activation/start: default 15 minutes, floor 5; not OTP expiry. |
| Card-claim abuse limit | ACTIVATION_MAX_ATTEMPTS | Web start/mobile inspect: default 8, floor 3. |
| Scratch-code hashing | ACTIVATION_SCRATCH_PEPPER | Active independent card protection secret. |
| Request fingerprinting | ACTIVATION_RATE_LIMIT_PEPPER | Active Share/activation rate-limit fingerprint key. |
| Optional token override | ACTIVATION_TOKEN_PEPPER | Active token hashing override with existing OTP_PEPPER/NEXTAUTH_SECRET fallback. |

Every active old OTP/ACTIVATION variable is accounted for below. None duplicates the Evolution sign-in consumer: old OTP controls apply to separate B/C flows, and ACTIVATION controls protect card claims. OTP ENV DUPLICATION RESOLVED: YES means configuration ownership is resolved; it does not claim that the non-login provider stack was deleted or migrated.

## Core, seed and optional configuration

- DATABASE_URL serves Prisma runtime; DIRECT_DATABASE_URL serves the Prisma CLI loader. Both are present and distinct between environments. No database connection, migration or data operation ran in this pass.
- NEXTAUTH_SECRET, MOBILE_TOKEN_SECRET, MOBILE_ENROLLMENT_SECRET, OTP_PEPPER, ACTIVATION_SCRATCH_PEPPER and ACTIVATION_RATE_LIMIT_PEPPER are PRESENT, minimum-length valid and distinct between TEST and Production. Deployment validation checks intra-environment uniqueness. No rotation or replacement.
- ADMIN_EMAIL/ADMIN_PASSWORD and DEMO_USER_EMAIL/DEMO_USER_PASSWORD are seed/bootstrap-only. Web login uses the database password hash. Railway build/predeploy/start and package scripts do not invoke seed/admin:ensure. Removed these four stored Production variables. Manual recovery tooling remains unchanged and must receive credentials for its explicit invocation only. ADMIN_FORCE_PASSWORD_RESET, ADMIN_ENSURE_PRODUCTION, ALLOW_PRODUCTION_SEED and onboarding maintenance guards remain documented, not startup requirements.
- FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY are used by active notifications. Both environments have the complete group. FCM_ENABLED was validation-only, never a notification runtime switch; removed locally and already absent on Railway. Web Firebase public config is absent on both environments, so Web Analytics configuration is not ready. Android Firebase resources remain separate and unchanged. The client now uses literal NEXT_PUBLIC reads for Next.js substitution, requires API/project/app IDs, and preserves optional bucket/sender/measurement metadata. NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN and Turbo-only NEXT_PUBLIC_FIREBASE_GUEST_AUTH_ENABLED are removed; no Firebase Auth consumer exists.
- Connected accounts remain supported. Production Meta is enabled with its ID/secret/redirect/encryption group present. TEST Meta is disabled; its nonblank encryption key was retained. TikTok, Google Connected, LinkedIn and GitHub are absent/disabled on both. Disabled credentials are not mandatory. GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET were retired Google-login settings, not GOOGLE_CONNECTED_*, and were removed from stored Production configuration and obsolete local validation/Turbo references. Meta callback code still enforces its Production URL for production-mode builds; TEST keeps Meta disabled.
- Wallet remains supported and unconfigured on both environments. Keep optional signing groups; validate partial groups when supplied and require Apple auth secret only with its updates-service URL. No Wallet implementation deleted. All six NEXT_PUBLIC_ANDROID_* fields remain optional for the supported but currently unconfigured `/download` page.
- Production R2 has public/private buckets, credentials, endpoint and asset base PRESENT: configuration readiness, not a new upload probe. R2_PUBLIC_BASE_URL is `https://media.popwam.com`, used as the asset prefix by getPublicUrl(), not go.popwam.com. TEST intentionally has no R2 configuration; uploads remain unavailable. R2_PRIVATE_BUCKET_NAME is additionally required for draft storage. R2_PRIVATE_FOLDER is unused: draft keys use the fixed `draft/` prefix. No storage resource or routing change.
- DEFAULT_LOCALE/SUPPORTED_LOCALES/FALLBACK_LOCALE have no env reader and were removed from the example. Changing en,ar to en,ar,fr would falsely imply a switch. AR/EN/FR resources/metadata exist; server runtime uses SystemSetting `localization.runtime` with English-only fallback when absent. DEFAULT_PHONE_COUNTRY_ISO2 is active and unrelated to UI language.
- Android POPWAM_API_BASE_URL/POPWAM_PUBLIC_BASE_URL are build overrides with Production defaults; the TEST build script supplies both isolated origins. GOOGLE_WEB_CLIENT_ID is only a local.properties assignment to a generated field with no other consumer found: REVIEW_LATER. No Android file or wiring changed.

## Public URL and passkey identities

### Configuration-sensitive hard-coded domain review

| Exact location / consumer | Classification | Resolution |
|---|---|---|
| packages/shared/src/index.ts: PRODUCTION_APP_URL / PRODUCTION_PUBLIC_URL | legitimate canonical constant | KEEP production defaults. |
| packages/shared/src/index.ts: getApplicationOrigin | should use env contract | FIXED: explicitly identified TEST environment may use only its approved API origin, even with NODE_ENV=production. Unknown production origins still fail back to Production. |
| packages/shared/src/index.ts: added TEST origin allowlist | test-only | Restricted by exact Railway TEST environment ID; Turbo passes that existing variable. |
| apps/web/src/lib/domains.ts | legitimate canonical constant | Defaults only; APP_HOST/PUBLIC_HOST override for TEST. |
| scripts/validate-production-env.mjs | legitimate canonical constant | Production validator checks expected canonical domains; future auth is an explicit preflight option. |
| scripts/validate-test-env.mjs; auth-test-environment.mjs; build-auth-test-apk.ps1 | test-only | Fixed isolation/provisioning/build targets, KEEP. |
| apps/android/app/build.gradle.kts:16–17 | legitimate canonical constant | Production defaults; existing TEST environment overrides, KEEP. |
| /api/mobile/cards and /api/mobile/cards/[id] | legitimate canonical constant | Fallback after PUBLIC_URL and NEXT_PUBLIC_APP_URL; unchanged. |
| /api/mobile/programming/cards and /api/mobile/programming/cards/[id] | should use env contract | FIXED PUBLIC_URL precedence; canonical public fallback retained. |
| /api/mobile/nfc/verify | should use env contract | FIXED expected host precedence to PUBLIC_URL. |
| /api/mobile/activation/inspect | should use env contract | FIXED permanent URL precedence to PUBLIC_URL. |
| /api/admin/production-batches/[id]/csv | should use env contract | FIXED PUBLIC_URL precedence and public-domain fallback. |
| apps/web/src/lib/connected-accounts.ts: META_CALLBACK_URL | legitimate canonical constant | Deliberate registered Production OAuth callback; TEST Meta stays disabled. No OAuth feature refactor. |
| apps/web/src/lib/share-center.ts: activationHosts | legitimate canonical constant | Accepted existing product hosts plus configured public host; trust policy, not URL generation. |
| apps/web/src/lib/share-center-policy.ts: approvedPublicShareUrl default | legitimate canonical constant | Callers can supply public host; KEEP default policy. |
| apps/web/src/app/download/page.tsx: validDownloadUrl | legitimate canonical constant | Deliberate official-distribution host allowlist; TEST APK not published here. |
| apps/web/src/app/mobile-preview/[profileId]/page.tsx: synthetic Request | legitimate canonical constant | In-memory Request passed to getMobileUser for header/session inspection, not a network request or generated public link. |
| apps/web/src/app/page.tsx: store link; admin/cards/batches/[id]/page.tsx: legacy activation link fallback | should use env contract | REVIEW_LATER: UI/legacy-link surfaces; no UI edits in this pass. |
| Android LocalFirstRepository.kt:137 | should use env contract | REVIEW_LATER: cached profile projection generates Production app link; changing cache/projection behavior deferred. |
| Android ProfileScreens.kt:112,406; FigmaNavigation.kt:224,245,247,288 | should use env contract | REVIEW_LATER: Share/preview/visible prefix/WebView policy; explicitly excluded UI work. |
| Android PendingDeepLinkParser.kt:42–43; PermanentUrlPolicy.kt:8; AndroidManifest.xml:24–26 | legitimate canonical constant, TEST compatibility review | Existing deep-link/NFC/security allowlists. Do not blindly add TEST hosts to release policy; dedicated native TEST compatibility REVIEW_LATER. |
| Existing domain examples in docs/README/.env.example comments | documentation-only | Current contract distinguishes production defaults from isolated TEST overrides. Historical reports remain dated. |

No remaining hard-coded TEST domain was found in an unguarded non-test runtime path within this focused review. Android/UI exceptions above mean universal URL compliance is not claimed.

| Environment | Application / RP origin | Public origin | RP ID | Android origin |
|---|---|---|---|---|
| TEST | https://popwam-auth-test-test.up.railway.app | https://popwam-public-test-test.up.railway.app | popwam-auth-test-test.up.railway.app | Approved TEST debug PRESENT |
| Production | https://pop.popwam.com | https://go.popwam.com | pop.popwam.com | SAME TEST debug origin — REVIEW_LATER |

Approved TEST public signing origin: `android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA`. TEST assetlinks HTTP 200 includes its public certificate fingerprint and get_login_creds relation. No certificate private key accessed. PASSKEY_RP_NAME is optional branding, default POP by POPWAM.

## Authoritative variable table

**Total: 152 variables.** DELETE_CANDIDATE: 1; FEATURE_DISABLED_OPTIONAL: 62; LEGACY_UNUSED: 12; SEED_ONLY: 9; TEST_ONLY: 6; USED_OPTIONAL: 42; USED_REQUIRED: 20.

| Variable | Classification | Used by / evidence | TEST requirement | Production requirement | TEST stored | Production stored | Status |
|---|---|---|---|---|---|---|---|
| `ACTIVATION_MAX_ATTEMPTS` | USED_OPTIONAL | `apps/web/src/app/api/activation/start/route.ts:22`<br>`apps/web/src/app/api/mobile/activation/inspect/route.ts:19` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `ACTIVATION_RATE_LIMIT_PEPPER` | USED_REQUIRED | `apps/web/src/lib/share-center.ts:184` | Required | Required | PRESENT | PRESENT | KEEP |
| `ACTIVATION_SCRATCH_PEPPER` | USED_REQUIRED | `apps/web/src/lib/card-tokens.ts:47` | Required | Required | PRESENT | PRESENT | KEEP |
| `ACTIVATION_SESSION_MINUTES` | USED_OPTIONAL | `apps/web/src/app/api/activation/start/route.ts:24` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `ACTIVATION_TOKEN_PEPPER` | USED_OPTIONAL | `apps/web/src/lib/card-tokens.ts:41`<br>`apps/web/src/lib/card-tokens.ts:47`<br>`apps/web/src/lib/share-center.ts:184` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `ADMIN_EMAIL` | SEED_ONLY | `packages/db/prisma/seed.ts:51`<br>`packages/db/prisma/ensure-admin.ts:8` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | REMOVED (stored) | SEED_ONLY |
| `ADMIN_ENSURE_PRODUCTION` | SEED_ONLY | `packages/db/prisma/ensure-admin.ts:13`<br>`packages/db/prisma/ensure-admin.ts (dynamic candidate)` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | MISSING | SEED_ONLY |
| `ADMIN_FORCE_PASSWORD_RESET` | SEED_ONLY | `packages/db/prisma/ensure-admin.ts:27`<br>`packages/db/prisma/ensure-admin.ts (dynamic candidate)` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | MISSING | SEED_ONLY |
| `ADMIN_PASSWORD` | SEED_ONLY | `packages/db/prisma/seed.ts (dynamic candidate)`<br>`packages/db/prisma/ensure-admin.ts:9` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | REMOVED (stored) | SEED_ONLY |
| `ALLOWED_FILE_TYPES` | USED_OPTIONAL | `packages/storage/src/index.ts:72`<br>`packages/storage/src/index.ts (dynamic candidate)`<br>`apps/web/src/app/admin/settings/page.tsx:6` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `ALLOWED_IMAGE_TYPES` | USED_OPTIONAL | `packages/storage/src/index.ts:56`<br>`packages/storage/src/index.ts (dynamic candidate)`<br>`apps/web/src/app/admin/settings/page.tsx:6` | Optional; existing runtime default | Optional; existing runtime default | PRESENT | PRESENT | OPTIONAL |
| `ALLOW_PRODUCTION_ONBOARDING_PROGRESS_REPAIR` | SEED_ONLY | `packages/db/prisma/repair-onboarding-progress.ts:16` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | MISSING | SEED_ONLY |
| `ALLOW_PRODUCTION_ONBOARDING_SEED` | SEED_ONLY | `packages/db/prisma/onboarding-definitions.seed.ts:278` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | MISSING | SEED_ONLY |
| `ALLOW_PRODUCTION_SEED` | SEED_ONLY | `packages/db/prisma/seed.ts:16` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | MISSING | SEED_ONLY |
| `APPDATA` | USED_OPTIONAL | `scripts/auth-test-environment.mjs:12` | Tool/platform supplied | Tool/platform supplied | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_AUTH_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:118`<br>`apps/web/src/lib/wallet.ts:129` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_ICON_BASE64` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:131`<br>`apps/web/src/lib/wallet.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_PASS_TYPE_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:114`<br>`apps/web/src/lib/wallet.ts:126` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_SIGNER_CERT_BASE64` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:115`<br>`apps/web/src/lib/wallet.ts:135` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_SIGNER_KEY_BASE64` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:115`<br>`apps/web/src/lib/wallet.ts:136` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_SIGNER_KEY_PASSPHRASE` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:138` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_TEAM_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:113`<br>`apps/web/src/lib/wallet.ts:127` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_WEB_SERVICE_URL` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:117`<br>`apps/web/src/lib/wallet.ts:128` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APPLE_WALLET_WWDR_CERT_BASE64` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:116`<br>`apps/web/src/lib/wallet.ts:137` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `APP_HOST` | USED_REQUIRED | `apps/web/src/lib/domains.ts:1` | Required | Required | PRESENT | PRESENT | KEEP |
| `APP_NAME` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | REMOVED (stored) | REMOVED (stored) | REMOVED |
| `APP_URL` | USED_REQUIRED | `packages/shared/src/index.ts:59`<br>`apps/web/src/app/layout.tsx:15` | Required | Required | PRESENT | PRESENT | KEEP |
| `BCRYPT_SALT_ROUNDS` | USED_OPTIONAL | `packages/db/prisma/seed.ts:26`<br>`apps/web/src/app/actions.ts:257`<br>`apps/web/src/app/actions.ts:360` | Optional; existing runtime default | Optional; existing runtime default | PRESENT | PRESENT | OPTIONAL |
| `CONTACT_MATCH_PEPPER` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/contact-discovery.ts:3` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `DATABASE_URL` | USED_REQUIRED | `packages/db/prisma/schema.prisma:7` | Required | Required | PRESENT | PRESENT | KEEP |
| `DEFAULT_LOCALE` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `DEFAULT_PHONE_COUNTRY_ISO2` | USED_OPTIONAL | `apps/web/src/lib/phone.ts:25` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `DEMO_USER_EMAIL` | SEED_ONLY | `packages/db/prisma/seed.ts:52` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | REMOVED (stored) | SEED_ONLY |
| `DEMO_USER_PASSWORD` | SEED_ONLY | `packages/db/prisma/seed.ts (dynamic candidate)` | Manual seed/recovery/maintenance only | Manual seed/recovery/maintenance only | MISSING | REMOVED (stored) | SEED_ONLY |
| `DIRECT_DATABASE_URL` | USED_REQUIRED | `packages/db/prisma.config.ts:13`<br>`packages/db/prisma/schema.prisma:8` | Required | Required | PRESENT | PRESENT | KEEP |
| `EVOLUTION_API_KEY` | USED_REQUIRED | `scripts/check-test-evolution.mjs:9`<br>`apps/web/src/lib/evolution-otp-sender.ts:34` | Required | FUTURE auth required; CURRENT intentionally absent | PRESENT | MISSING | KEEP |
| `EVOLUTION_API_URL` | USED_REQUIRED | `scripts/check-test-evolution.mjs:6`<br>`apps/web/src/lib/evolution-otp-sender.ts:33` | Required | FUTURE auth required; CURRENT intentionally absent | PRESENT | MISSING | KEEP |
| `EVOLUTION_INSTANCE` | USED_REQUIRED | `scripts/check-test-evolution.mjs:16`<br>`scripts/check-test-evolution.mjs:21`<br>`apps/web/src/lib/evolution-otp-sender.ts:35` | Required | FUTURE auth required; CURRENT intentionally absent | PRESENT | MISSING | KEEP |
| `FALLBACK_LOCALE` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `FCM_CLIENT_EMAIL` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/admin.ts:16` | Conditional feature group; see rules above | Conditional feature group; see rules above | PRESENT | PRESENT | OPTIONAL |
| `FCM_ENABLED` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. scripts/validate-production-env.mjs (dynamic candidate); scripts/validate-production-env.mjs (dynamic candidate)` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `FCM_PRIVATE_KEY` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/admin.ts:17` | Conditional feature group; see rules above | Conditional feature group; see rules above | PRESENT | PRESENT | OPTIONAL |
| `FCM_PROJECT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/admin.ts:15` | Conditional feature group; see rules above | Conditional feature group; see rules above | PRESENT | PRESENT | OPTIONAL |
| `GITHUB_CLIENT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GITHUB_CLIENT_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GITHUB_ENABLED` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GITHUB_REDIRECT_URI` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_CLIENT_ID` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. scripts/validate-production-env.mjs (dynamic candidate)` | No active requirement | No active requirement | MISSING | REMOVED (stored) | REMOVED |
| `GOOGLE_CLIENT_SECRET` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. scripts/validate-production-env.mjs (dynamic candidate)` | No active requirement | No active requirement | MISSING | REMOVED (stored) | REMOVED |
| `GOOGLE_CONNECTED_CLIENT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_CONNECTED_CLIENT_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_CONNECTED_ENABLED` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/backup-providers.ts:5`<br>`apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_CONNECTED_REDIRECT_URI` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_CLASS_SUFFIX` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:105`<br>`apps/web/src/lib/wallet.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_ISSUER_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:103`<br>`apps/web/src/lib/wallet.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_ISSUER_STATUS` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:102` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_MODE` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:106` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_ORIGINS` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/api/wallet/google/[virtualCardId]/route.ts:26`<br>`apps/web/src/app/api/mobile/virtual-cards/[id]/google-wallet/route.ts:32` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_PRIVATE_KEY` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:104`<br>`apps/web/src/lib/wallet.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/wallet.ts:104`<br>`apps/web/src/lib/wallet.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `GOOGLE_WEB_CLIENT_ID` | DELETE_CANDIDATE | `apps/android/app/build.gradle.kts:31 (local.properties only)` | Android local property only | Android local property only | MISSING | MISSING | REVIEW_LATER |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts:19`<br>`apps/web/src/lib/connected-accounts.ts:22`<br>`apps/web/src/lib/connected-accounts.ts:23` | Conditional feature group; see rules above | Conditional feature group; see rules above | PRESENT | PRESENT | OPTIONAL |
| `LINKEDIN_CLIENT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `LINKEDIN_CLIENT_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `LINKEDIN_ENABLED` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `LINKEDIN_REDIRECT_URI` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `LOCALAPPDATA` | USED_OPTIONAL | `scripts/auth-test-environment.mjs:18` | Tool/platform supplied | Tool/platform supplied | MISSING | MISSING | OPTIONAL |
| `MAX_FILE_UPLOAD_MB` | USED_OPTIONAL | `packages/storage/src/index.ts:71`<br>`packages/storage/src/index.ts (dynamic candidate)`<br>`apps/web/src/app/admin/settings/page.tsx:6` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `MAX_IMAGE_UPLOAD_MB` | USED_OPTIONAL | `packages/storage/src/index.ts:55`<br>`packages/storage/src/index.ts (dynamic candidate)`<br>`apps/web/src/lib/profile-editor.ts:361` | Optional; existing runtime default | Optional; existing runtime default | PRESENT | PRESENT | OPTIONAL |
| `META_APP_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `META_APP_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `META_ENABLED` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | PRESENT | PRESENT | OPTIONAL |
| `META_GRAPH_API_VERSION` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:47` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `META_OAUTH_CAPABILITIES` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/meta-oauth-capabilities.ts:14` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `META_REDIRECT_URI` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `MOBILE_ENROLLMENT_SECRET` | USED_REQUIRED | `apps/web/src/lib/mobile-enrollment.ts:23` | Required | Required | PRESENT | PRESENT | KEEP |
| `MOBILE_TOKEN_SECRET` | USED_REQUIRED | `apps/web/src/lib/mobile-enrollment.ts:23`<br>`apps/web/src/lib/mobile-auth.ts:7`<br>`apps/web/src/lib/security-session.ts:9` | Required | Required | PRESENT | PRESENT | KEEP |
| `NEXTAUTH_SECRET` | USED_REQUIRED | `apps/web/src/middleware.ts:24`<br>`apps/web/src/lib/auth.ts:44`<br>`apps/web/src/lib/card-tokens.ts:41` | Required | Required | PRESENT | PRESENT | KEEP |
| `NEXTAUTH_URL` | USED_REQUIRED | `packages/shared/src/index.ts:59`<br>`apps/web/src/lib/passkeys.ts:6`<br>`apps/web/src/app/layout.tsx:15` | Required | Required | PRESENT | PRESENT | KEEP |
| `NEXT_PUBLIC_ANDROID_APK_SIZE` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:10` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_ANDROID_APK_URL` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:9` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_ANDROID_MIN_VERSION` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:10` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_ANDROID_SHA256` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:11` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_ANDROID_UPDATED_AT` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:10` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_ANDROID_VERSION` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/app/download/page.tsx:10` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_APP_URL` | USED_REQUIRED | `packages/shared/src/index.ts:53`<br>`packages/db/prisma/seed.ts:10`<br>`packages/db/prisma/backfill-tap-upgrade.ts:4` | Required | Required | PRESENT | PRESENT | KEEP |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. scripts/validate-production-env.mjs (dynamic candidate); apps/web/src/lib/firebase/client.ts (dynamic candidate)` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `NEXT_PUBLIC_FIREBASE_GUEST_AUTH_ENABLED` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. turbo.json (retired pass-through)` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts:30` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/firebase/client.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `NEXT_PUBLIC_WEB_APP_URL` | USED_OPTIONAL | `packages/shared/src/index.ts:59` | Required TEST alias | Optional app-origin alias | PRESENT | MISSING | OPTIONAL |
| `NODE_ENV` | USED_OPTIONAL | `packages/shared/src/index.ts:57`<br>`packages/db/src/index.ts:7`<br>`packages/db/prisma/seed.ts:11` | Optional; existing runtime default | Optional; existing runtime default | PRESENT | PRESENT | OPTIONAL |
| `OTP_EXPIRY_MINUTES` | USED_OPTIONAL | `apps/web/src/lib/otp-policy.ts:8` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | KEEP |
| `OTP_EXPOSE_IN_RESPONSE` | TEST_ONLY | `apps/web/src/lib/otp-test-policy.ts:44` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `OTP_HOURLY_SEND_LIMIT` | USED_OPTIONAL | `apps/web/src/lib/otp-policy.ts:10` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | KEEP |
| `OTP_MAX_ATTEMPTS` | USED_OPTIONAL | `apps/web/src/lib/evolution-otp-sender.ts:17`<br>`apps/web/src/lib/evolution-otp-sender.ts (dynamic candidate)`<br>`apps/web/src/lib/otp-policy.ts:11` | Required owner TEST contract | Optional bounded runtime default | PRESENT | MISSING | OPTIONAL |
| `OTP_PEPPER` | USED_REQUIRED | `apps/web/src/lib/card-tokens.ts:41`<br>`apps/web/src/lib/evolution-otp-sender.ts:13` | Required | Required | PRESENT | PRESENT | KEEP |
| `OTP_RESEND_COOLDOWN_SECONDS` | USED_OPTIONAL | `apps/web/src/lib/evolution-otp-sender.ts:16`<br>`apps/web/src/lib/evolution-otp-sender.ts (dynamic candidate)` | Required owner TEST contract | Optional bounded runtime default | PRESENT | MISSING | OPTIONAL |
| `OTP_SEND_COOLDOWN_SECONDS` | USED_OPTIONAL | `apps/web/src/lib/otp-policy.ts:9` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | KEEP |
| `OTP_TEST_CODE` | TEST_ONLY | `apps/web/src/lib/otp-test-policy.ts:33` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `OTP_TEST_MODE` | TEST_ONLY | `apps/web/src/lib/otp-test-policy.ts:30` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `OTP_TEST_PHONES` | TEST_ONLY | `apps/web/src/lib/otp-test-policy.ts:29` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `OTP_TTL_SECONDS` | USED_OPTIONAL | `apps/web/src/lib/evolution-otp-sender.ts:15`<br>`apps/web/src/lib/evolution-otp-sender.ts (dynamic candidate)` | Required owner TEST contract | Optional bounded runtime default | PRESENT | MISSING | OPTIONAL |
| `PASSKEY_ANDROID_ORIGINS` | USED_REQUIRED | `apps/web/src/lib/passkeys.ts:14` | Required | Required | PRESENT | PRESENT | REVIEW_LATER |
| `PASSKEY_ORIGIN` | USED_REQUIRED | `apps/web/src/lib/passkeys.ts:6` | Required | Required | PRESENT | PRESENT | KEEP |
| `PASSKEY_RP_ID` | USED_REQUIRED | `apps/web/src/lib/passkeys.ts:8` | Required | Required | PRESENT | PRESENT | KEEP |
| `PASSKEY_RP_NAME` | USED_OPTIONAL | `apps/web/src/lib/passkeys.ts:8` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `PHONE_OTP_FALLBACK_CHANNEL` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:85` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `PHONE_OTP_PRIMARY_CHANNEL` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:84` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `PHONE_OTP_TIMEOUT_MS` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:68` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `POPWAM_API_BASE_URL` | USED_OPTIONAL | `scripts/build-auth-test-apk.ps1:3`<br>`scripts/build-auth-test-apk.ps1:6`<br>`scripts/build-auth-test-apk.ps1:13` | Required TEST build override | Production build defaults | MISSING | MISSING | OPTIONAL |
| `POPWAM_PUBLIC_BASE_URL` | USED_OPTIONAL | `scripts/build-auth-test-apk.ps1:4`<br>`scripts/build-auth-test-apk.ps1:7`<br>`scripts/build-auth-test-apk.ps1:13` | Required TEST build override | Production build defaults | MISSING | MISSING | OPTIONAL |
| `PORT` | USED_OPTIONAL | `Next.js start / Railway framework port` | Optional; existing runtime default | Optional; existing runtime default | PRESENT | MISSING | OPTIONAL |
| `PUBLIC_HOST` | USED_REQUIRED | `apps/web/src/lib/domains.ts:2` | Required | Required | PRESENT | PRESENT | KEEP |
| `PUBLIC_URL` | USED_REQUIRED | `packages/shared/src/index.ts:53`<br>`apps/web/src/lib/share-center.ts:177`<br>`apps/web/src/app/api/mobile/cards/[id]/route.ts:3` | Required | Required | PRESENT | PRESENT | KEEP |
| `R2_ACCESS_KEY_ID` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:13`<br>`packages/storage/src/index.ts:29`<br>`packages/storage/src/index.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_ACCOUNT_ID` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. scripts/validate-production-env.mjs (dynamic candidate)` | Unused | Required by deployed old validator; retain | MISSING | PRESENT | REVIEW_LATER |
| `R2_BUCKET_NAME` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:14`<br>`packages/storage/src/index.ts:109`<br>`packages/storage/src/index.ts:159` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_ENDPOINT` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:13`<br>`packages/storage/src/index.ts:27`<br>`packages/storage/src/index.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_PRIVATE_BUCKET_NAME` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:19`<br>`packages/storage/src/index.ts:124`<br>`packages/storage/src/index.ts:137` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_PRIVATE_FOLDER` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | MISSING | REMOVED (stored) | REMOVED |
| `R2_PUBLIC_BASE_URL` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:14`<br>`packages/storage/src/index.ts:100`<br>`packages/storage/src/index.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_PUBLIC_FOLDER` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:84`<br>`packages/storage/src/index.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `R2_SECRET_ACCESS_KEY` | FEATURE_DISABLED_OPTIONAL | `packages/storage/src/index.ts:13`<br>`packages/storage/src/index.ts:30`<br>`packages/storage/src/index.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | PRESENT | OPTIONAL |
| `RAILWAY_CLI_PATH` | USED_OPTIONAL | `scripts/auth-test-environment.mjs:12` | Tool/platform supplied | Tool/platform supplied | MISSING | MISSING | OPTIONAL |
| `RAILWAY_ENVIRONMENT_ID` | USED_OPTIONAL | `scripts/validate-test-env.mjs:4` | Required TEST isolation metadata | Platform identity; also gates isolated TEST app-origin override | PRESENT | PRESENT | OPTIONAL |
| `RAILWAY_ENVIRONMENT_NAME` | USED_OPTIONAL | `packages/db/prisma/ensure-admin.ts:12` | Required TEST isolation metadata | Tool/platform supplied | PRESENT | PRESENT | OPTIONAL |
| `RAILWAY_SERVICE_ID` | USED_OPTIONAL | `scripts/validate-test-env.mjs:6` | Required TEST isolation metadata | Tool/platform supplied | PRESENT | PRESENT | OPTIONAL |
| `RUN_ONBOARDING_DB_INTEGRATION` | TEST_ONLY | `apps/web/src/lib/dynamic-onboarding.integration.test.ts (opt-in DB tests)` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `SECURITY_SESSION_SECRET` | USED_OPTIONAL | `apps/web/src/lib/security-session.ts:9` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | OPTIONAL |
| `SMS_API_TOKEN` | USED_OPTIONAL | `apps/web/src/lib/sms/index.ts:29` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `SMS_API_URL` | USED_OPTIONAL | `apps/web/src/lib/sms/index.ts:29` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `SMS_ENABLED` | USED_OPTIONAL | `apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `SMS_PROVIDER` | USED_OPTIONAL | `apps/web/src/lib/sms/index.ts:42`<br>`apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `SMS_SENDER_ID` | USED_OPTIONAL | `apps/web/src/lib/sms/index.ts:33` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `SMS_TIMEOUT_MS` | USED_OPTIONAL | `apps/web/src/lib/sms/index.ts:33` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `STAGING` | TEST_ONLY | `apps/web/src/lib/otp-test-policy.ts:31` | Local/automated fixtures only; absent in owner TEST | Absent; false flags tolerated | MISSING | MISSING | TEST_ONLY |
| `SUPPORTED_LOCALES` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `TIKTOK_CLIENT_KEY` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `TIKTOK_CLIENT_SECRET` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `TIKTOK_ENABLED` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `TIKTOK_REDIRECT_URI` | FEATURE_DISABLED_OPTIONAL | `apps/web/src/lib/connected-accounts.ts (dynamic candidate)` | Conditional feature group; see rules above | Conditional feature group; see rules above | MISSING | MISSING | OPTIONAL |
| `WHATSAPP_ACCESS_TOKEN` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:41`<br>`apps/web/src/lib/phone-otp.ts:65`<br>`apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `WHATSAPP_AUTH_TEMPLATE_LANGUAGE` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:55` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `WHATSAPP_AUTH_TEMPLATE_NAME` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:41`<br>`apps/web/src/lib/phone-otp.ts:54`<br>`apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | LEGACY_UNUSED | `Retired source/example/Turbo reference; see findings above. No active reader.` | No active requirement | No active requirement | MISSING | MISSING | REMOVED |
| `WHATSAPP_OTP_ENABLED` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:40`<br>`apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |
| `WHATSAPP_PHONE_NUMBER_ID` | USED_OPTIONAL | `apps/web/src/lib/phone-otp.ts:41`<br>`apps/web/src/lib/phone-otp.ts:47`<br>`apps/web/src/app/admin/integrations/page.tsx:5` | Optional; existing runtime default | Optional; existing runtime default | MISSING | MISSING | REVIEW_LATER |

## Railway cleanup: exact names, no values

All five STAGING/OTP_TEST/OTP_EXPOSE controls are absent on both environments. No meaningless blank integration, Wallet or APK variables were present to delete. Legacy SMS/Meta OTP variables were already absent on Railway; reachable source remains, so this is not their architectural retirement. R2_ACCOUNT_ID remains for the deployed validator. Production PASSKEY_ANDROID_ORIGINS remains unchanged for release review.

Used unrendered variableCollectionUpsert with replace=true and skipDeploys=true. Re-read before mutation to refuse concurrent changes. Verified every retained value byte-for-byte unchanged and only these keys removed. Raw values stayed in memory/stdin. This changes stored configuration, not the running container environment. No core/auth/provider/storage/integration secret rotated or replaced; retired seed/login credentials explicitly removed below.

### TEST_API

Removed: `APP_NAME`.

Intentionally retained (all user-configured names): `ACTIVATION_RATE_LIMIT_PEPPER`, `ACTIVATION_SCRATCH_PEPPER`, `ALLOWED_IMAGE_TYPES`, `APP_HOST`, `APP_URL`, `BCRYPT_SALT_ROUNDS`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`, `MAX_IMAGE_UPLOAD_MB`, `META_ENABLED`, `MOBILE_ENROLLMENT_SECRET`, `MOBILE_TOKEN_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_APP_URL`, `NODE_ENV`, `OTP_MAX_ATTEMPTS`, `OTP_PEPPER`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_TTL_SECONDS`, `PASSKEY_ANDROID_ORIGINS`, `PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, `PORT`, `PUBLIC_HOST`, `PUBLIC_URL`.

### TEST_PUBLIC

Removed: `APP_NAME`.

Intentionally retained (all user-configured names): `ACTIVATION_RATE_LIMIT_PEPPER`, `ACTIVATION_SCRATCH_PEPPER`, `ALLOWED_IMAGE_TYPES`, `APP_HOST`, `APP_URL`, `BCRYPT_SALT_ROUNDS`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`, `MAX_IMAGE_UPLOAD_MB`, `META_ENABLED`, `MOBILE_ENROLLMENT_SECRET`, `MOBILE_TOKEN_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_APP_URL`, `NODE_ENV`, `OTP_MAX_ATTEMPTS`, `OTP_PEPPER`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_TTL_SECONDS`, `PASSKEY_ANDROID_ORIGINS`, `PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, `PORT`, `PUBLIC_HOST`, `PUBLIC_URL`.

### PRODUCTION

Removed: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_NAME`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_PRIVATE_FOLDER`.

Intentionally retained (all user-configured names): `ACTIVATION_RATE_LIMIT_PEPPER`, `ACTIVATION_SCRATCH_PEPPER`, `ALLOWED_IMAGE_TYPES`, `APP_HOST`, `APP_URL`, `BCRYPT_SALT_ROUNDS`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`, `MAX_IMAGE_UPLOAD_MB`, `META_APP_ID`, `META_APP_SECRET`, `META_ENABLED`, `META_REDIRECT_URI`, `MOBILE_ENROLLMENT_SECRET`, `MOBILE_TOKEN_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `OTP_PEPPER`, `PASSKEY_ANDROID_ORIGINS`, `PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, `PUBLIC_HOST`, `PUBLIC_URL`, `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PRIVATE_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `R2_PUBLIC_FOLDER`, `R2_SECRET_ACCESS_KEY`.

Railway-managed metadata, untouched and excluded from the application count: `RAILWAY_ENVIRONMENT`, `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_PROJECT_ID`, `RAILWAY_PROJECT_NAME`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_SERVICE_AHMED_ABDELRHEEM_URL`, `RAILWAY_SERVICE_CAPITALGATE_URL`, `RAILWAY_SERVICE_MAMDOUH_URL`, `RAILWAY_SERVICE_NAME`, `RAILWAY_SERVICE_POPWAM_AUTH_TEST_URL`, `RAILWAY_SERVICE_POPWAM_PUBLIC_TEST_URL`, `RAILWAY_SERVICE_POPWAM_TAP_URL`, `RAILWAY_SERVICE_SALATI_URL`, `RAILWAY_STATIC_URL`.

## Verification and deployment evidence

- Final focused tests: 22 Node environment-validator tests and 4 application-origin tests PASS (26 total). Final TypeScript PASS after the bounded URL source changes.
- TypeScript: `pnpm --filter @popwam/web lint` PASS.
- Earlier Web production build PASS. It predates final bounded URL edits; those received focused origin tests and TypeScript. No additional full Web build or unrelated suite was run during finalization.
- Prisma loader/schema unchanged; no Prisma command, migration or database operation executed. Web build used the existing generated client.
- Android wiring unchanged; no configuration compile required.
- `git diff --check`: PASS; final documentation check performed before completion.
- Fresh stored TEST API and TEST public configs pass the updated local TEST validator. Current Production validation also passes. Only the explicit future-auth preflight fails, as expected, on intentionally absent Evolution variables and the unapproved release signing origin. This does not block current configuration closure.
- TEST API `/health`: HTTP 200. TEST public `/`: HTTP 200. TEST public `/health`: HTTP 307 to the same TEST API `/health` (200). Production app `/health`: 200; public `/health`: 307 to Production app.
- Evolution connectionState read-only probe using current TEST service configuration: HTTP 200, credentials accepted, instance matches, state open. Probe originated locally, not inside the deployed container; no OTP/message sent. Passkey readiness is config/assetlinks evidence, not physical acceptance.
- Latest deployments all remain SUCCESS and unchanged from this pass's starting snapshot: TEST API `53d7b1f2-db34-4bbd-9b47-6b965c3aac84`; TEST public `449c5f7c-a236-4666-b1b7-a59ac7db176e`; Production `1d2bead1-14a3-4168-8f63-cba891551669` (2026-09-13 20:13:40.608 UTC, pre-existing commit 66b7b4b). No redeploy/restart requested or created. Local validation/Firebase/Turbo changes are not deployed.
- `.env.example` has all requested sections, placeholders only, commented seed/TEST examples, explicit security-recovery/activation exceptions, optional integrations/Wallet/APK and the missing private-draft R2 bucket contract. Turbo now passes active build env inputs and omits proven-retired names.
- Canonical handoff updated with ENV CONTRACT CLEANUP — CLOSED for current deployment contracts and explicit REVIEW_LATER items. Historical auth/TEST/PASS 7 reports link here.

## Final statuses

```text
ENV CONTRACT AUDIT COMPLETE: YES
OTP ENV DUPLICATION RESOLVED: YES
LEGACY FIREBASE PHONE AUTH ENV REMOVED: YES
LEGACY META WHATSAPP LOGIN OTP ENV REMOVED: NOT SAFE TO REMOVE — ACTIVE NON-LOGIN CONSUMER
LEGACY SMS LOGIN FALLBACK ENV REMOVED: NOT SAFE TO REMOVE — ACTIVE NON-LOGIN CONSUMER
TEST ENV CLEAN: YES
PRODUCTION ENV CLEAN FOR CURRENT DEPLOYED VERSION: YES
PRODUCTION EVOLUTION ENV: INTENTIONALLY NOT CONFIGURED UNTIL AUTH PRODUCTION DEPLOYMENT
PASSKEY TEST CONFIG: READY
PASSKEY PRODUCTION RELEASE CONFIG: REVIEW_LATER
CANONICAL URL CONTRACT VERIFIED: NO
READY FOR PASS 7A: YES

NO SECRET VALUES PRINTED
NO SECRET ROTATION
NO PRODUCTION DEPLOYMENT
NO DATABASE CHANGE
NO MIGRATION
NO FEATURE DEVELOPMENT
NO PASS 7A WORK
NO COMMIT
```

Canonical URL NO refers to remaining Android/UI/runtime consumers listed below, not incorrect Railway env values. They are explicit review items for later work and do not prevent beginning that work. No device, emulator, ADB, APK install or OTP send was performed. No additional Railway mutation or health check was needed during finalization; earlier post-cleanup health evidence is retained.
