# POP developer manual

Audited from the current repository on 2026-07-27. Paths below are repository-relative unless stated otherwise. This is a source map, not a design proposal. `NOT IMPLEMENTED` means no current source path was found; `legacy` means code exists but the active route graph does not select it.

## 1. Root map and working rules

| Path | Purpose / dependencies | Edit when | Do not edit when |
|---|---|---|---|
| `package.json` | Monorepo scripts; Railway invokes `build` and `start`. | Adding root workflow commands. | Changing deployment semantics casually. |
| `pnpm-workspace.yaml` | Declares `apps/*`, `packages/*`. | Adding a workspace package. | Changing build allow-lists without need. |
| `turbo.json` | Task cache/dependency graph and build-time env exposure. | Adding a Turbo task or required build env. | Putting secrets into client code. |
| `.env.example` | Safe variable inventory/template. | Adding documented configuration. | Replacing `.env` or putting real secrets here. |
| `railway.json` | Railway build, predeploy migration, start and `/health`. | Intentional deploy-pipeline change. | Local feature work. |
| `apps/android` | Native Android Compose client. | Android UI/native integration. | Generated `build/`, `.gradle/`. |
| `apps/web` | Next.js 15 App Router: web, admin and API. | Pages, API, server libraries. | `.next/`. |
| `packages/db` | Prisma schema/client configuration, migrations, seed/backfills. | Intentional data-model work. | Applied migrations/generated Prisma output. |
| `packages/storage` | R2/S3-compatible validation, keys and object operations. | Upload/storage rules. | Credentials. |
| `packages/shared` | Shared POP theme tokens. | Cross-client plan palette. | App-only layout. |
| `scripts` | Production-env validator and i18n audit. | Tooling policy. | Generated output. |
| `docs` and root `*_REPORT.md` | Historical/supporting reports. | Reference only. | Treating them as authority over source. |
| `apps/ios` | Small Swift deep-link/NFC writer source; no full iOS app project is present. | Those helpers only. | Assuming Android parity means iOS is implemented. |

Normal install is `pnpm install`. Avoid committing `.env`, `node_modules`, `.next`, Android `build`, `.gradle`, APK output, or Prisma generated artifacts.

## 2. Android foundation (`apps/android`)

`settings.gradle.kts` and root `build.gradle.kts` configure the Android build; `gradle.properties` contains Gradle switches; `gradle/wrapper/*` pins Gradle. `app/build.gradle.kts` is authoritative for application id/version/SDK, dependencies, `BuildConfig.API_BASE_URL`, `PUBLIC_BASE_URL`, and opt-in Firebase plugin application. It reads `POPWAM_API_BASE_URL` and `POPWAM_PUBLIC_BASE_URL` from environment or `local.properties`. The checked-in `app/google-services.json` is release-package material; Firebase Gradle/Crashlytics plugins activate only with `-Ppopwam.firebase.android.enabled=true`, because debug uses `.debug`.

`app/src/main/AndroidManifest.xml` declares activity, permissions, HCE service, deep links/FileProvider/Firebase services. `src/debug/AndroidManifest.xml` is debug-only. `TapApplication.kt` initializes app-level behavior; `MainActivity.kt` owns the activity, lifecycle/deep-link launch handoff and Compose root. `data/api/PopwamApi.kt` is Retrofit endpoint contract, `Models.kt` is Android DTOs, and `data/auth/AuthNetwork.kt` builds authenticated network behavior. `AppViewModels.kt` holds `AuthViewModel` and `MainViewModel`; `RuntimeLaunchViewModel.kt` gates cold launch.

Authentication/session: `FirebasePhoneAuthGateway.kt` runs Firebase phone auth; `SessionRepository.kt` exchanges/verifies, refreshes and logs out; `SecureSessionStore.kt` persists mobile tokens securely; `AuthRuntimeDiagnostics.kt` records diagnostic stages; `FcmTokenBridge.kt`, `PopMessagingService.kt`, `FirebasePopAnalytics.kt` and `PopAnalytics.kt` bridge optional Firebase messaging/analytics. `PasskeyCoordinator.kt` is Credential Manager only. `data/repository/AuthSetupRepository.kt` handles legal/bootstrap/onboarding; `PopwamRepository.kt` is the feature repository; `AndroidUploadPolicy.kt` rejects oversized/unaccepted local uploads before network.

NFC is in `nfc/*`; HCE is in `hce/*`. `data/localization/LocalizationAuthorityStore.kt` caches server localization authority. Tests are `app/src/test/java/...`; edit/add tests with corresponding policy/repository behavior, not for routine UI copy.

## 3. Android current screens and routes

The active authenticated shell is `ui/FigmaNavigation.kt` (`FigmaMainNavigation`), called by `ui/PopwamApp.kt`. A number of `Legacy*`, `HomeScreen`, `ProfileEditor`, `NfcToolsScreen`, and old OTP composables remain in `PopwamApp.kt`; they are retained code and **not the active navigation route UI**.

| Screen | Route | Main UI / state | API/repository and data | Edit UI / logic |
|---|---|---|---|---|
| Cold splash | before app | `PopwamApp.kt`, `RuntimeLaunchViewModel` | localization bootstrap | same / `RuntimeLaunchViewModel.kt` |
| Language | pre-auth | `PreAuthExperience.kt` | localization snapshot, `PreAuthStore` | same / `LocalePolicy.kt` |
| Appearance | pre-auth | `PreAuthExperience.kt` | `AppearanceStore` | same / `theme/AppearanceStore.kt` |
| Intro / how POP works | pre-auth | `PreAuthExperience.kt` | `PreAuthStore` | same |
| Phone login / Firebase OTP | pre-auth | current `LoginScreen` in `PopwamApp.kt` | `AuthViewModel`, `FirebasePhoneAuthGateway`, `/api/mobile/auth/firebase/phone/exchange`, `User`, `ExternalIdentity`, `DeviceSession`, `MobileRefreshToken` | `PopwamApp.kt` / gateway, `SessionRepository.kt` |
| Legal | pre-auth and setup | `NativeLegalScreen`, `PhaseCSetupScreen.kt` | `/api/legal/required`, `/api/onboarding/*`, `LegalDocument`, `UserLegalConsent` | those files |
| Setup: profile/bootstrap/passkey | setup stage | `PhaseCSetupScreen.kt`, `DynamicOnboardingScreen.kt` | `AuthSetupRepository`, bootstrap/onboarding/passkey APIs; Profile/onboarding models | screens / `AuthSetupResolver.kt` |
| Home profile editor | `home` | `ProfileEditorHomeScreen.kt` | `/api/profiles/[profileId]/editor`; Profile/revisions/modules | screen / `profile-editor.ts` |
| Share centre / QR | `share` | `ShareCenterScreen.kt` | share/card APIs; `Card`, `Profile`, `ActivationClaimSession` | screen / `ShareCenterPolicy.kt` |
| Share activation | `share-activate` | `ShareCenterScreen.kt` | scratch activation APIs | same / `share-center.ts` |
| Menu | `menu` | `FigmaNavigation.kt` (`PopMenu`) | navigation only | same |
| Virtual profile list | `virtual-cards` | `FigmaNavigation.kt` | mobile profiles API | same / `PopwamRepository.kt` |
| Create virtual card wizard | `create-card/{step}` | `VirtualCardFlow.kt` | `/api/mobile/profiles`, templates; `Profile`, `VirtualCard`, `Destination` | `VirtualCardFlow.kt` / mobile profiles route |
| Virtual card details | `virtual-card/{id}` | `VirtualCardFlow.kt` | profile/card DTOs | same |
| Publishing | `profile-publish/{id}` | `ProfilePublishingScreen.kt` | `/api/profiles/[profileId]/publishing`; Publication/Revision | same / `profile-publishing.ts` |
| Legacy profile editor | `profile/{id}` | legacy `PopwamApp.kt` | older mobile profile API | avoid for new UI; use editor home |
| Physical products/card | `products`, `card/{id}` | `FigmaNavigation.kt` | cards/mobile cards; `Card`, `Tag` | same / `card-lifecycle.ts` |
| Activity | `activity` | `FigmaNavigation.kt` | main reload/card activity | same |
| Activate/QR scan | `activate` | `FigmaNavigation.kt`, `QrScanner.kt` | mobile activation APIs; `ActivationAttempt`, `Card` | scanner UI / activation routes |
| Programming | `programming`, `program/{id}` | legacy composables in `PopwamApp.kt` selected by active route | mobile programming APIs | route shell / NFC policy |
| HCE | `hce` | legacy HCE screen selected by active route | `hce/*`, cards | UI / `HceConfig.kt`, `PopwamHostApduService.kt` |
| Friends / requests / blocked | `friends`, `friends/{tab}` | `FriendsScreen.kt` | `/api/friends/*`, `/api/blocks`, `/api/reports`; friendship models | screen / `friends-domain.ts`, `friends-api.ts` |
| Nearby | `nearby` | `NearbyScreen.kt`, `NearbyLocationController.kt` | `/api/nearby/*`; nearby models | screen/permissions / `nearby-domain.ts` |
| Settings root/subsections | `settings`, `settings/{section}` | `SecuritySettingsScreen.kt` | settings, quota, security APIs; preferences/device/session/passkey models | screen / security/settings libraries |
| Integrations portal | `integrations` | `FigmaNavigation.kt` secure web portal | web dashboard integrations | route/path |
| Terms/privacy in app | `legal/terms`, `legal/privacy` | `PreAuthExperience.kt` | legal documents | UI / legal records |

`FriendsScreen` exposes friends, incoming/outgoing requests, blocked users and reporting. `SecuritySettingsScreen` contains preferences, appearance, language, notifications, quota, devices, sessions, passkeys, account actions and security step-up sections. There is no separate current Android “Nearby settings” route: nearby settings are within the Nearby flow. No standalone Android public NFC Tools route exists—`PopNavigationPolicy.exposesNfcTools()` is false; NFC is contextual via activation/programming/HCE.

### Navigation changes

Routes, NavHost, bottom items, start route and top-level BackHandler are all in `FigmaNavigation.kt`; bottom roots are exactly `home`, `share`, `menu` in `PopNavigationPolicy.kt`. Root BackHandler intentionally consumes Back to prevent exiting. Add a screen by: create/update a composable, add `composable(...)` to this NavHost, navigate from the caller, and add API/DTO/repository/ViewModel state only if needed. Change Home destination in the `NavHost` and every `"home"` root reference; change back behavior in the `BackHandler` and individual `nav.popBackStack()` callbacks. Pre-auth resolution is `PopwamApp.kt` + `PreAuthExperience.kt`; post-auth setup resolution is `AuthSetupResolver.kt`, `AuthSetupRepository.kt`, and `PhaseCSetupScreen.kt`.

## 4. Android appearance, localization, launch and auth

`ui/theme/Theme.kt` centralizes Material `Light`/`Dark`, system-mode decision, colors, Cairo/ABeeZee choice, all Material typography families, and shapes (small 14dp, medium 24dp, large 32dp). It automatically uses Cairo for Arabic and ABeeZee otherwise. `AppearanceStore.kt` persists mode. `PopVisuals.kt` contains reusable visual/backdrop/system-bar treatment; `PopPlanThemes.kt` consumes shared plan themes. `res/font/cairo.ttf`, `res/font/abeezee.ttf`; `res/values/colors.xml`, `styles.xml`; graphics in `res/drawable*`; strings in `values/strings.xml`, with `values-ar`/`values-fr` static resources.

To change global primary button corner family edit `Theme.kt` Shapes, but audit local `RoundedCornerShape(...)` calls—especially `FigmaNavigation.kt`, `VirtualCardFlow.kt`, profile/share screens—which override it. Light background: `Light.background`; dark background: `Dark.background`; Arabic font: Cairo declaration; Latin font: ABeeZee declaration; global heading scale: `popwamTypography`. Plan/card palettes are `packages/shared/src/pop-themes.ts` and Android `PopPlanThemes.kt`.

Cold splash is exactly `POP_COLD_SPLASH_MILLIS = 3_000L` in `RuntimeLaunchViewModel.kt`. The resolver in `PreAuthExperience.kt` uses SharedPreferences file `pop_pre_auth`: `language`, `appearance`, `intro_version_seen`. Language appears only if runtime has more than one locale and no valid selection; Appearance if invalid/missing; Intro if version is old. A valid authenticated session calls `adoptAuthenticatedInstallation`, bypassing replay for a returning installation. `LocalizationAuthorityStore.kt` fetches/caches `/api/localization/bootstrap`; `LocalePolicy.kt` validates/chooses locale and `applyPopLanguage` uses AppCompat locales. Static Arabic resources alone do **not** enable Arabic: `SystemSetting` key `localization.runtime` must publish it to bootstrap.

Firebase OTP flow: `LoginScreen` → `AuthViewModel` (`AppViewModels.kt`) → `FirebasePhoneAuthGateway.start/verifyCode` → Firebase `PhoneAuthProvider`/credential → Firebase sign-in → forced Firebase ID token → `SessionRepository` → `POST /api/mobile/auth/firebase/phone/exchange` → server verifies Firebase Admin token/links `ExternalIdentity` and issues POP access + refresh session → `SecureSessionStore` → setup resolver. OTP UI, country picker, 6-digit input and resend interaction live in active login composable in `PopwamApp.kt`; timeout is Firebase `setTimeout(60L)` in the gateway. Errors map in `firebasePhoneFailure`; diagnostics are `AuthRuntimeDiagnostics.kt`. Server fallback OTP endpoints exist (`/api/mobile/auth/otp/*`, `/api/otp/*`) but `LegacyServerOtpLoginScreen` is explicitly deprecated. Android phone validation/country list is `PhoneIdentity.kt`; backend URL is Gradle BuildConfig setup. Firebase UID is an external identity, not `User.id`; Firebase ID token is exchanged and is not the POP session.

Passkey: Android calls Credential Manager through `PasskeyCoordinator.kt`; mobile options `/api/mobile/auth/passkey/options`; assertion `/api/mobile/auth/passkey/verify`; server code `mobile-passkey-auth.ts`, `passkey-authentication.ts`, `passkeys.ts`; persistent records `PasskeyCredential`, `PasskeyChallenge`, `DeviceSession`, `MobileRefreshToken`. Web uses browser WebAuthn and `/api/passkeys/*`; Android uses Credential Manager and requires `PASSKEY_ANDROID_ORIGINS`/asset-links association. Both map to the same POP `User`; Firebase OTP is a separate proof of phone ownership and then exchange, while passkeys are WebAuthn credentials.

Session behavior: access/refresh issuance and verification are `apps/web/src/lib/mobile-auth.ts`; refresh route `/api/mobile/auth/refresh`; Android persistence `SecureSessionStore.kt`, orchestration `SessionRepository.kt`, authenticated Retrofit setup `AuthNetwork.kt`. Server `MobileRefreshToken` is tied to `DeviceSession`; revoke/logout routes are `/api/mobile/auth/logout`, `/logout-all` and `/api/security/sessions/*`. Edit those paths (and security-session library) for lifetime/revocation, never hand-edit stored token/crypto data.

## 5. Web application and admin map

`apps/web/src/app` is Next App Router: `layout.tsx` root, `globals.css` global Tailwind/CSS, `middleware.ts` request policy, `page.tsx` landing, `dashboard/layout.tsx` authenticated shell, `admin/layout.tsx` admin shell. Server actions are root `*-actions.ts`; UI components are `src/components`; business policy is `src/lib`; handlers are `src/app/api/**/route.ts`.

### Primary web pages

| URL family | Page file(s) | Main component/logic | Models / purpose |
|---|---|---|---|
| `/`, `/login`, `/login/phone`, `/onboarding/*` | `page.tsx`, `login/page.tsx`, `login/phone/page.tsx`, `onboarding/{page,start,page/passkey}` | `login-form`, `phone-entry-screen`, onboarding components/actions | User/auth/onboarding |
| `/dashboard` | `dashboard/page.tsx`, `dashboard/layout.tsx` | `dashboard-shell` | signed-in hub |
| `/dashboard/profile`, `/profiles`, `/profile/publish` | respective pages | `profile-home-editor`, `profile-save-form`, `profile-publishing-client` | Profile/revision/module/publication |
| `/dashboard/share`, `/cards`, `/nfc`, `/products`, `/wallet` | respective pages | `share-center`, QR/card/product/wallet UI | Card/Tag/VirtualCard/WalletPass |
| `/dashboard/friends`, `/nearby`, `/chats/*` | respective pages | `friends-center`, `nearby-center` | Friend*, UserBlock/Report, Nearby*, chat |
| `/dashboard/settings[/[section]]`, `/security/passkeys`, `/appearance` | respective pages | `settings-center`, `passkey-actions`, `theme-picker` | preference/device/session/passkey/quota |
| `/dashboard/files`, `/uploads`, `/integrations` | respective pages | `file-manager`, `connected-accounts` | UploadedFile/media/ConnectedAccount |
| `/dashboard/plans`, `/templates[/preview/*]`, `/tags/*`, `/transfers` | respective pages | plan/template/tag/transfer UI | Plan/ProfileTemplate/TagTransfer |
| public `/p/[slug]`, `/profile/[slug]`, `/[shortCode]`, `/file/[slug]`, `/product/[slug]` | listed pages | `public-profile`, `public-tag-page`, storefront | public profile/file/product resolution |
| activation `/activate/**`, `/t/[token]` | `activate/**/page.tsx`, `t/[token]/page.tsx` | `activation-scanner`, actions | card activation/scratch |
| `/privacy`, `/terms`, `/community-guidelines`, `/nearby-privacy`, `/download`, `/ideas`, `/offline` | named pages | static/feature UI | legal/PWA/support |

### Admin pages (all current page routes)

`admin/layout.tsx` and `lib/admin-access.ts` are the gate. The core POP administration pages are `/admin/users` (`users/page.tsx`, detail `[id]`), `/admin/profiles`, `/admin/plans` (`plans/*`), `/admin/limits`, `/admin/quota-requests`, `/admin/localization`, `/admin/reports/*`, `/admin/settings`, `/admin/integrations`, `/admin/uploads`, `/admin/themes`, `/admin/templates`, `/admin/branding`, `/admin/audit`, and `/admin/sms`. They call server actions in `actions.ts`, `localization-actions.ts`, `quota-actions.ts`, `moderation-actions.ts`, or corresponding libraries/models. Safely edit labels/layout/forms; preserve authorization and server validations.

Additional active business/admin routes are `/admin/cards/**`, `/batches`, `/organizations`, `/customers`, `/subscriptions`, `/wallet`, `/link-platforms`, `/resources`, `/feature-requests`, `/tags`, `/transfers`, `/inventory/**`, `/suppliers`, `/purchases/**`, `/expenses/**`, `/expense-categories`, `/orders/**`, `/store`, and `/branding`. These are real pages for product/card manufacturing, commerce, inventory and operations, backed respectively by `Card*`, `Organization`, `Customer`, `UserPlan`, `WalletPass`, `LinkPlatform`, `FeatureRequest`, `Tag*`, `Inventory*`, `Supplier`, `Purchase*`, `Expense*`, `Order*`, `Product*`, `BrandSettings` models. Admin login is `(admin-auth)/admin/login/page.tsx` + `components/admin-login-form.tsx`.

## 6. Profiles, limits, media, share, friends and nearby

Canonical profile source is `Profile`; editable/public lifecycle is `ProfileRevision`, `ProfilePublication`, `ProfileRevisionModule/Field/Destination/File/Service/Branch/Media`, and `ProfileSlugHistory`. Definitions/catalog are `ProfileCategory`, `ProfileModuleDefinition`, `ProfileModule`, `ProfileTemplate`, `ProfileTemplateModule`, `ProfileEntitlement`; draft media is `ProfileMediaAsset`; legacy/simple fields and links are `ProfileField`, `Destination`, `ProfileService`, `ProfileBranch`. Authoritative edit/publish code: `profile-editor.ts`, `profile-publishing.ts`, `profile-domain.ts`, `profile-module-config.ts`, `profile-templates.ts`; handlers `/api/profiles/**`. Android uses `ProfileEditorHomeScreen.kt` + `PopwamRepository` and the same handlers; web uses profile editor components.

Quota precedence is **UserLimitOverride → active UserPlan/Plan → plan slug `free`** (`plans.ts`, `PLATFORM_DEFAULT_PLAN_SLUG`). `UserLimitOverride` has nullable per-user fields; `Plan` has defaults (schema defaults: 1 profile/card/tag, 5 links, 0 uploads/files/storage unless seeded plan changes them); `QuotaIncreaseRequest` only supports `MAX_STORAGE_BYTES` and `MAX_LINKS` (`quota-requests.ts`). Usage sums `UploadedFile.sizeBytes` plus non-deleted `ProfileMediaAsset.sizeBytes`; links exclude core contact destination types. Enforcement locks the User row in `assertWithinLimitLocked`/`assertStorageWithinLimitLocked` before mutation. UI/API: `/api/settings/quota`, `quota-actions.ts`, admin limits/quota-request pages; upload routes and `profile-editor.ts` enforce it. To make free storage 100 MB, edit the actual `Plan` row with slug `free` through admin/seed—not schema default. To grant one user 2 GB use a `UserLimitOverride.maxStorageBytes` through admin limits. Add MAX_PROFILES later: it already exists as `maxProfiles`; expose/change it consistently in admin forms, entitlement merge, usage/enforcement, Android/web display, request type only if requests should support it.

R2 implementation is `packages/storage/src/index.ts`: public bucket `R2_BUCKET_NAME`, optional private draft bucket `R2_PRIVATE_BUCKET_NAME`; public key `createStorageKey`, draft key `createDraftStorageKey`; promotion/read/delete helpers; public URL `R2_PUBLIC_BASE_URL`. Image maximum defaults 5 MB (`MAX_IMAGE_UPLOAD_MB`), files default 10 MB (`MAX_FILE_UPLOAD_MB`); MIME defaults and extension matching are here. Android mirrors limits in `AndroidUploadPolicy.kt`. Handlers are `/api/upload/{avatar,cover,file,branding}`, `/api/profiles/[profileId]/media*`, `/api/mobile/profiles/[id]/{media,files}`; ownership authorization is route/profile authorization. Private data is read through server helper, not a public signed-URL implementation; do not claim signed R2 URLs exist.

Share: Android `ShareCenterScreen.kt`/`ShareCenterPolicy.kt`; server `share-center.ts`, `/api/share/*`, mobile activation/card routes; QR UI `qr-card.tsx` web and QR scanner Android; public profile URLs come from profile publishing/domain and `url.ts`. NFC reading/writing uses `NfcCoordinator.kt`, `NfcTagManager.kt`, `PermanentUrlPolicy.kt`; HCE uses `PopwamHostApduService.kt`, `HceConfig.kt`, `HceSelectionPolicy.kt`. Scratch activation uses `activation-scratch.ts`, activation routes, `ActivationClaimSession`/`ActivationAttempt`.

Friends: models `FriendRequest`, `Friendship`, `FriendPreference` (favorite/mute), `FriendsPreference`, `FriendPrivacyRule`, `UserBlock`, `UserReport`, `FriendNotificationEvent`; APIs `/api/friends/**`, `/api/blocks/**`, `/api/reports`; server policy `friends-domain.ts`, `friends-api.ts`, `friends-policy.ts`, `friend-privacy.ts`, `friends-moderation.ts`; Android `FriendsScreen.kt`. Block-first behavior is enforced by friends policy/domain: blocks make relationship/actions unavailable and suppress interaction before normal request processing.

Nearby: consent is a `LegalDocument`/`UserLegalConsent` of `NEARBY_PRIVACY`; runtime config is `SystemSetting` key `nearby.runtime.v1`, parsed strictly in `nearby-policy.ts`; server operations `nearby-domain.ts`/`nearby-api.ts`; routes `/api/nearby`, `/presence`, `/consent`, `/settings`; records `NearbyPreference`, `NearbyPresence`, `NearbyRateLimitBucket`. Android requires location through `NearbyLocationController.kt` and presents `NearbyScreen.kt`; it heartbeats `ENABLE`/`REFRESH`. A precision-6 geohash plus neighborhood ring is used, not exact-distance disclosure. Change TTL, max results, radius-like neighborhood/cell precision/caps in the persisted runtime JSON (reference `packages/db/prisma/nearby-feature-config.example.json`) and validation limits in `nearby-policy.ts`; never only change UI text.

## 7. Localization, API, database and deployment

Web canonical static dictionary is `apps/web/locales/en.json`; Arabic is `ar.json`; `i18n.ts` selects server dictionary/cookie locale. Runtime locale authority is `SystemSetting.localization.runtime`: `localization-policy.ts`, `localization-runtime.ts`, `/api/localization/bootstrap`, admin localization page/actions. Android receives bootstrap via `LocalizationAuthorityStore.kt`, persists selection in `PreAuthStore`, applies RTL via Android locale/resources, and falls back to built-in `strings.xml`. To add an Android text use a resource key in `values/strings.xml` and translations in localized resource files. To make it Admin-runtime translatable, add the key to the server localization configuration/translation workflow, publish locale in Admin, and render dynamic returned value; static `strings-ar` is independent. Add a language in runtime config + admin enable/publish + web dictionary + Android resource/locale config `res/xml/locales_config.xml`, then verify bootstrap; Arabic existing resource files alone do not activate it.

API catalog is source-first: Auth: `/api/auth/[...nextauth]`, `/api/otp/*`, `/api/passkeys/*`, `/api/mobile/auth/*`, `/api/firebase/*`; Profiles/media: `/api/profiles/*`, `/api/profile-bootstrap`, `/api/profile-categories`, `/api/profile-templates`, `/api/upload/*`, `/api/public-profile-media/*`; Share/products/activation: `/api/share/*`, `/api/activation/start`, `/api/mobile/activation/*`, `/api/mobile/cards/*`, `/api/mobile/programming/cards/*`, `/api/mobile/nfc/verify`; Friends/abuse: `/api/friends/*`, `/api/blocks/*`, `/api/reports`; Nearby: `/api/nearby/*`; Settings/security/quota: `/api/settings/*`, `/api/security/*`, `/api/legal/required`, `/api/locale`, `/api/onboarding/*`; localization: `/api/localization/bootstrap`; integrations/wallet: `/api/integrations/*`, `/api/wallet/*`; admin support: `/api/admin/*`. Methods/auth requirements are implemented in each verified `route.ts`; routes use `getApiUser`/`api-auth.ts` or mobile auth as applicable. Android consumer contract is `PopwamApi.kt`; web consumer is page/component/server action.

Prisma source is `packages/db/prisma/schema.prisma`. Group models: identity/auth (`User`, Account, Session, VerificationToken, `ExternalIdentity`, `PasskeyCredential/Challenge`, `MobileRefreshToken`, `DeviceSession`, `AuthTicket`, `OtpChallenge/SendLog`, legal consent); profile (`Profile*`, `Destination`, UploadedFile); plans/quota (`Plan`, `UserPlan`, `UserLimitOverride`, `QuotaIncreaseRequest`); social (`Friend*`, Chat/Message, UserBlock/Report, Follow); nearby; cards/activation (`Tag*`, `Card*`, `VirtualCard`, `Activation*`, `WalletPass`, `TagTransfer`); integrations/content/product (`ConnectedAccount`, Product*, Content*); operations (`Inventory*`, Supplier/Purchase/Expense/Customer/Order); global (`SystemSetting`, `BrandSettings`, `AuditLog`).

Migrations live in `packages/db/prisma/migrations`, chronological from `20260713150000_init` through `20260726233000_priority_runtime_foundation`. Create a new migration only after schema change with `pnpm db:migrate` locally; inspect SQL and `pnpm --filter @popwam/db prisma migrate status`; production uses `pnpm db:deploy`. `pnpm db:generate` regenerates Prisma client. Never edit an old applied migration; add a new one.

Railway: `railway.json` runs `pnpm build`, then `pnpm validate:production-env && pnpm db:deploy`, then `pnpm start`; health is `/health`. Redeploy rebuilds, validates required production env, applies pending migrations, starts Next, then health-checks. Neon variables: `DATABASE_URL` is normal runtime/pool connection where configured; `DIRECT_DATABASE_URL` is direct connection for Prisma migration operations—keep both secret, never print them. R2 configuration is storage package/env above. Firebase currently supports Android Phone Auth (mandatory in active Android login when enabled), optional FCM (`FcmTokenBridge`/`PopMessagingService` and server Firebase Admin), and optional Analytics/Crashlytics dependency/config; it is not POP’s database/session authority.

### Environment reference (names only)

| Group | Variables | Server/client/secret |
|---|---|---|
| App/db | `NODE_ENV`, `APP_NAME`, `APP_URL`, `PUBLIC_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_APP_URL`, `APP_HOST`, `PUBLIC_HOST`, `DATABASE_URL`, `DIRECT_DATABASE_URL` | server; DB URLs secret |
| Auth/security | `NEXTAUTH_SECRET`, `MOBILE_TOKEN_SECRET`, `SECURITY_SESSION_SECRET`, `BCRYPT_SALT_ROUNDS`, `OTP_PEPPER`, OTP/activation limits, `ACTIVATION_*` peppers | server secret except numeric limits |
| Passkeys | `PASSKEY_RP_ID`, `PASSKEY_ORIGIN`, `PASSKEY_RP_NAME`, `PASSKEY_ANDROID_ORIGINS` | server; origins/id generally non-secret |
| Firebase | `NEXT_PUBLIC_FIREBASE_*`, `FCM_ENABLED`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | public client values are public; Admin key secret |
| R2 | `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, folders, `R2_ACCOUNT_ID`, access/secret keys, private bucket | endpoint/name/public base non-secret; keys secret |
| Upload/quota | `MAX_IMAGE_UPLOAD_MB`, `ALLOWED_IMAGE_TYPES`, `MAX_FILE_UPLOAD_MB`, `ALLOWED_FILE_TYPES` | server, non-secret policy |
| integrations/wallet/SMS | `META_*`, provider client secrets, `SMS_*`, `GOOGLE_WALLET_*`, `APPLE_WALLET_*`, encryption key | server; credentials/keys secret |
| operator/test | `ADMIN_*`, `DEMO_*`, `ALLOW_PRODUCTION_SEED`, `OTP_TEST_*`, `STAGING` | server; passwords/tokens secret |

## 8. Constants, commands, diagnostics and diagrams

Current explicit constants: splash 3 seconds `RuntimeLaunchViewModel.kt`; Firebase phone timeout 60 seconds `FirebasePhoneAuthGateway.kt`; server OTP resend baseline 60 seconds/max attempts 10 `otp-policy.ts` (env can tighten/adjust per code); image 5 MB/file 10 MB storage defaults `packages/storage/src/index.ts`, Android mirror `AndroidUploadPolicy.kt`; step-up grant 7 minutes `security-step-up.ts`; Nearby values are runtime JSON, not a hardcoded product radius; quota schema defaults above and real product limits are Plan rows. Access/refresh exact TTLs are issued in `mobile-auth.ts`—edit there only after reviewing tests/rotation behavior. Activation limits are environment-backed in activation routes; auth/friends rate limits are in `auth-request-rate-limit.ts` and individual routes.

Windows commands: `pnpm install`; `pnpm dev`; `pnpm --filter @popwam/web test`; `pnpm --filter @popwam/web build`; `pnpm lint`; `cd apps/android; .\gradlew.bat testDebugUnitTest`; `cd apps/android; .\gradlew.bat assembleDebug`; `cd apps/android; .\gradlew.bat lintDebug`; `adb devices`; `adb install -r app\build\outputs\apk\debug\app-debug.apk`; `adb shell pm clear com.popwam.pop.debug`; `adb shell monkey -p com.popwam.pop.debug 1`; `pnpm db:generate`; `pnpm --filter @popwam/db prisma migrate status`; `pnpm db:deploy`; `pnpm i18n:audit`. Do not run deployment/migration commands against production without intention.

Debug: Android crash `adb logcat` plus `MainActivity`, ViewModels; OTP `AuthRuntimeDiagnostics`, Firebase logcat and exchange route/server Firebase Admin; passkey `PasskeyCoordinator`, mobile passkey routes, `PASSKEY_*`/assetlinks; 401 `AuthNetwork`, `SessionRepository`, mobile-auth refresh; 500 route handler + server log and underlying `src/lib`; DB Prisma error/migration status; R2 upload `packages/storage` validation/route/server env; language bootstrap/localization setting/cache; theme `AppearanceStore`/`Theme`; quota `plans.ts`/`quota-requests.ts`; Nearby `NearbyLocationController`, Android permission log, routes/domain/SystemSetting config.

```
Phone OTP: Login UI -> Firebase PhoneAuthProvider -> Firebase credential/sign-in -> Firebase ID token
           -> /api/mobile/auth/firebase/phone/exchange -> ExternalIdentity/User -> DeviceSession + POP tokens -> SecureSessionStore
Passkey: Credential Manager/WebAuthn -> options route -> signed assertion -> verify route -> PasskeyCredential/User -> POP session
Profile: editor -> ProfileRevision draft -> publishing readiness -> publish -> ProfilePublication/published revision -> /p/[slug]
Upload: client validation -> upload/media route -> R2 public/private object -> UploadedFile/ProfileMediaAsset -> profile revision/publication
Quota: UserLimitOverride ? active Plan : free Plan -> usage(UploadedFile + media / destinations) -> locked enforcement -> mutation
Language: SystemSetting localization.runtime -> bootstrap route -> Android authority cache/PreAuthStore -> AppCompat locale/resources
Nearby: consent + community + published profile + runtime config -> location/geohash -> presence TTL heartbeat -> neighbor query -> privacy-filtered results
```

## 9. Daily edit cheat sheet and danger zone

| I want to change | Primary file(s) | Then |
|---|---|---|
| Android logo/app name | `res/drawable*`, `res/values/strings.xml`, manifest | Android build |
| Web logo/brand | `apps/web/public/brand/pop/*`, `public/icons/*`, `BrandSettings` admin | web build |
| slogan/login/OTP UI | `PopwamApp.kt`, strings | Android test/build |
| Home/share/menu UI | `ProfileEditorHomeScreen.kt`; `ShareCenterScreen.kt`; `FigmaNavigation.kt` | Android build |
| colors/font/radius/spacing | `theme/Theme.kt`, `PopVisuals.kt`, local composable overrides | Android build |
| splash duration | `RuntimeLaunchViewModel.kt` | Android tests |
| language/Arabic/translation | runtime localization admin + `locales/*.json` + Android strings/locales config | `pnpm i18n:audit` |
| free storage/link limit | Plan `free` data through admin/seed; enforcement `plans.ts` | web tests |
| upload type/size | `packages/storage/src/index.ts`, `AndroidUploadPolicy.kt` | web/Android tests |
| public/API/passkey domain | web `url.ts`/env; Android Gradle BuildConfig; `PASSKEY_*` env | deploy + association verification |
| Firebase project | Android google services + Firebase public/admin env | rebuild/configure Firebase |
| R2 bucket | R2 env and storage package only if behavior changes | deploy |
| Nearby radius/TTL | `nearby.runtime.v1` config + `nearby-policy.ts` bounds | Nearby tests |
| friend request policy | `friends-policy.ts`, `friends-domain.ts` | web tests |
| Settings page | `SecuritySettingsScreen.kt` + route; web settings page/component/API if web parity | relevant builds |
| profile module | schema/migration, module definition/config/editor/publishing, APIs, Android editor | migration/generate/tests |
| admin page | `app/admin/<area>/page.tsx`, `admin/layout`, action/lib/model as needed | web test/build |

Never modify: `.env` secrets or production connection URLs; `google-services.json`/Firebase private key without controlled project change; Android signing keystores; refresh/session token hashing/crypto (`mobile-auth.ts`, `security-session.ts`, stores); R2 key secrets; generated Prisma client; old applied migration SQL; build/cache folders. These can break identity, authorization, data integrity, signing or deployment.

## 10. Structured file index (important maintained files)

| Path/pattern | Type | Purpose/feature | Safe to edit? |
|---|---|---|---|
| `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`, `TapApplication.kt` | Kotlin | Android entry/app lifecycle | Carefully |
| `.../ui/{PopwamApp,FigmaNavigation,ProfileEditorHomeScreen,ShareCenterScreen,FriendsScreen,NearbyScreen,SecuritySettingsScreen,ProfilePublishingScreen,DynamicOnboardingScreen,PhaseCSetupScreen,VirtualCardFlow}.kt` | Kotlin | active Android UI | Yes |
| `.../ui/{PreAuthExperience,AuthSetupResolver,RuntimeLaunchViewModel,LocalePolicy,PopNavigationPolicy}.kt` | Kotlin | launch/auth/nav/locale policy | Carefully |
| `.../ui/theme/*`, `.../ui/PopVisuals.kt` | Kotlin | Android theme/appearance | Yes |
| `.../data/api/{PopwamApi,Models}.kt`, `.../data/repository/*` | Kotlin | API contract/features | Carefully |
| `.../data/auth/*` | Kotlin | phone/passkey/session/Firebase | Carefully |
| `.../nfc/*`, `.../hce/*` | Kotlin | NFC/HCE | Carefully |
| `apps/android/app/src/main/res/**` | resources | strings, fonts, visual assets, manifest supporting XML | Yes (credentials cautiously) |
| `apps/web/src/app/{layout,globals,error,not-found,page}.tsx`, `middleware.ts` | TSX/TS | web root behavior | Carefully |
| `apps/web/src/app/dashboard/**/page.tsx` | TSX | authenticated web screens | Yes |
| `apps/web/src/app/admin/**/page.tsx` | TSX | admin screens | Yes, retain access checks |
| `apps/web/src/app/api/**/route.ts*` | TS | API handlers | Carefully |
| `apps/web/src/components/*.tsx` | TSX | reusable web UI | Yes |
| `apps/web/src/lib/{auth,api-auth,mobile-auth,session,security-session}.ts` | TS | identity/session | Carefully |
| `apps/web/src/lib/{profile-*,plans,quota-requests,share-center,friends-*,nearby-*,localization-*,passkeys,otp-*}.ts` | TS | domain policy | Carefully |
| `apps/web/locales/{en,ar}.json` | JSON | web static translations | Yes |
| `packages/db/prisma/schema.prisma` | Prisma | database source schema | Carefully + migration |
| `packages/db/prisma/migrations/*/migration.sql` | SQL | applied schema history | No after apply |
| `packages/db/prisma/{seed,onboarding-definitions.seed,*.ts}` | TS | seed/backfill/maintenance | Carefully |
| `packages/storage/src/index.ts` | TS | R2 and upload rules | Carefully |
| `packages/shared/src/pop-themes.ts` | TS | shared plan palette | Yes |
| `scripts/{i18n-audit,validate-production-env}.mjs` | JS | checks | Carefully |
| root configs named in section 1 | config | workspace/build/deploy | Carefully |

