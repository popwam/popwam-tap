# AUTH REBUILD — Evolution WhatsApp OTP

> Current environment contract (2026-09-13): [POP_ENV_CONTRACT.md](POP_ENV_CONTRACT.md). This dated report is historical evidence; current Railway readiness and unresolved Meta/SMS, URL and signing-origin exceptions are recorded there.


**Deployment follow-up, 2026-09-12:** the later owner-authorized [isolated TEST activation](AUTH_TEST_ENVIRONMENT_ACTIVATION.md) completed TEST-only migration/reset/seed/deployment and a TEST-targeted APK. Evolution connectivity passed from TEST; no real message/device acceptance. Production unchanged. Earlier migration/TEST/APK statements below describe the implementation phase before that activation.

Date: 2026-09-12. **IMPLEMENTED / CODE VERIFIED / AWAITING TEST DEPLOYMENT / AWAITING OWNER OTP ACCEPTANCE**. Scope: Android authentication, existing POP sessions, first-user onboarding, directly required backend contracts and retirement of Firebase Phone Auth. PASS 1–6 remain preserved outside this scope. No deployment/device acceptance is implied.

## 1–6. Retired architecture and deletion

The former path was Android Firebase native verification → Firebase ID-token exchange → POP external-identity resolution → full/restricted POP session. Both the shared authentication module and an older Android login presentation existed. They have been removed, including their native callbacks, proof exchange, client/server DTOs, verifier/policy helpers, exclusive resources and tests.

Deleted Android/shared sources include `FirebasePhoneAuthGateway.kt`, `AuthenticationFlowViewModel.kt`, `AuthenticationHost.kt`, all source/resources/tests of `apps/mobile/authentication`, the old phone/OTP/verified/passkey/biometric/account-created presentation, exclusive preview fixtures and the old auth screenshot test. The module build file, composite substitution and dependency were removed. `PopwamApp.kt` no longer contains the alternate login, old OTP or welcome/help presentation. Shared language and native legal reading remain in `PreAuthExperience.kt`.

Deleted backend routes include `/api/mobile/auth/firebase/phone/exchange`, the obsolete `/api/mobile/auth/challenge` and `/api/mobile/auth/otp/send`, inactive Firebase guest/link endpoints, inactive Web OTP send/verify/channels routes, and the obsolete Firebase-only Admin phone-auth status page. The canonical `/api/mobile/auth/otp/verify` tombstone is replaced by real POP verification. `external-identity.ts` and `firebase/phone-policy.ts` were deleted; `firebase/admin.ts` now constructs only the shared FCM Admin app. Web Analytics no longer imports `firebase/auth`. Retired Firebase-only explanatory copy was corrected without implementing Web phone login or changing activation behavior.

Dependencies removed: Android `firebase-auth`, the old shared authentication module, its unused direct Ktor client dependencies, and the obsolete direct Play Services phone-hint dependency. Credential Manager's Play Services integration remains for existing account-security/passkey features.

Remaining Firebase uses are FCM (`FcmTokenBridge`, `PopMessagingService`, Admin/friend notification senders), Analytics (`FirebasePopAnalytics`, Web Analytics bootstrap/events), Crashlytics and their Gradle/Google Services/configuration dependencies. Web's umbrella `firebase` package remains for Analytics; its dependency lock naturally lists SDK subpackages, including auth packages that the application no longer imports. `firebase-admin` remains for messaging. `ExternalIdentityProvider.FIREBASE` is historical compatibility for stored identities, not an active login authority. No Firebase sign-in, proof exchange or fallback exists.

The exact file/line/context classification of every remaining matching reference is in [the Firebase audit](AUTH_REBUILD_FIREBASE_AUDIT.md). Immutable old migrations and historical documents are retained as evidence. No backup/legacy source tree was created. Exact modified/deleted/added file inventory appears below.

## 7. Clean navigation and localized presentation

`PhoneLoginScreen` + `PhoneLoginViewModel` implement Phone → WhatsApp OTP → existing first-user onboarding when required → authenticated app. `MainActivity` has one unauthenticated auth host. A valid cached POP session bypasses it. Legal content opens in the existing native legal reader, and country selection is a searchable dialog over the existing country infrastructure.

The UI uses official POP branding and the accepted theme/fonts. Arabic is RTL, English/French LTR, and phone/code fields explicitly LTR. There are 30 new resource keys per language. A single accessible numeric OTP field supports six digits, Arabic-digit normalization, paste/backspace, loading/error states and explicit Verify. Resend uses a monotonic deadline and server-authoritative retry timing. Change number clears the challenge and code. Duplicate operations are guarded in the ViewModel.

`LoginOnboardingScreen` uses existing legal/category/template/bootstrap/dynamic-onboarding APIs. The existing bootstrap domain now accepts zero initial profiles: only after submitted identity and legal consent does it create the first draft and matching VirtualCard. Historical one-placeholder completion remains supported; multi-profile accounts are not rewritten. Names/biographies/links/items/media are never invented at login.

## 8. Evolution adapter

`evolution-otp-sender.ts` owns provider URL/key/instance, HTTPS validation, version check, 10-second total timeout, headers, localized text, response acceptance and safe errors. Real read-only installation inspection returned **2.3.7**. No real OTP was sent.

The implementation uses the verified v2 `POST /message/sendText/{instance}` contract, `apikey` header and `{number,text,linkPreview:false}` payload. It refuses redirects and unsupported versions, requires an accepted message key, and never logs/returns provider content. Evolution delivers messages only; POP owns verification and sessions. Upstream sources and environment requirements are in [TEST readiness](AUTH_REBUILD_TEST_READINESS.md).

## 9–10. Mobile API

`POST /api/mobile/auth/otp/request` accepts `{phone,countryCode?,locale?}` and returns `{ok,challengeId,expiresInSeconds,resendAfterSeconds}`. It never looks up account existence, returns OTP/hash, or creates a user. Invalid requests/provider problems return fixed safe categories with `Cache-Control: no-store`; throttles include authoritative retry seconds.

`POST /api/mobile/auth/otp/verify` accepts `{challengeId,phone,code,deviceName?}` and returns the existing mobile session fields, user, `isNewAccount`, `needsOnboarding` and `nextAction`. Tokens are issued by the existing `issueMobileSession` inside the same database transaction as challenge consumption and user resolution. Request/verify do not require or accept Firebase proof.

## 11–14. OTP security, normalization and abuse controls

Existing `OtpChallenge` is reused; no new OTP/identity table is introduced. The server uses `crypto.randomInt` for a padded six-digit code and a random UUID challenge. Only HMAC-SHA-256 of challenge ID + canonical phone + code is persisted, keyed by the existing OTP pepper. Constant-time comparison is reused. Phone and hashed request source, expiry, max attempts, attempts, delivery status, sent/created timestamps and consumed state live in the existing model.

Defaults are TTL 300 seconds, resend cooldown 60 seconds, maximum attempts 5, read from the requested env variables and validated lazily. Missing provider/OTP configuration yields a controlled auth error without crashing unrelated routes. Wrong-code attempts commit even though the caller receives an error; expired, used, mismatched and exhausted challenges cannot issue a session. Failed delivery consumes its challenge. Resend consumes older outstanding challenges.

`loginPhone` validates input and reuses `normalizePhone`/libphonenumber to canonical E.164 before challenge/user/limit/delivery use. The normalized country must be enabled in `PhoneCountryConfig`; there is no second country list. Limits are five requests/phone/hour and 30/source/hour in persistent serializable transactions, supplemented by existing process-local request throttles. Forwarded-source trust follows the existing deployment boundary; TEST/reverse-proxy configuration must supply trustworthy source headers.

Serializable transactions retry unique/serialization conflicts. Consumption, canonical phone uniqueness, user creation and POP session creation commit together. Concurrent verification can issue only one successful session for a challenge. Request concurrency cannot bypass the cooldown.

## 15–19. Users, sessions, restoration and logout

An existing active user owning the canonical `phoneE164` or historical canonical `phone` is reused. Ambiguous ownership or inactive users fail closed after verification. A first-time login creates the minimum user + existing Free-plan association + onboarding marker. The schema requires email, so it receives a random non-deliverable internal address under `auth.popwam.invalid`; it is not copied into public profile contact fields. No profile is created until the user submits setup data.

The current POP access/refresh token formats, lifetimes, DeviceSession association, refresh-family rotation, server checks and logout/revocation remain intact. Android uses the same AES-256-GCM/Android Keystore encrypted v2 session record and key alias. Retired restricted-auth fields are ignored when old full sessions are read. An optional encrypted `needsOnboarding` marker resumes incomplete first-user setup; normal cached sessions add no OTP/network request.

Successful login and completed onboarding refresh the minimum LocalFirst snapshot through the existing lifecycle hook. Normal restored launch retains its accepted cache path and zero-request target. Connectivity/provider failures do not invalidate an authenticated session or delete its encrypted cache. Explicit logout revokes through POP, clears account-specific state through existing lifecycle hooks, and returns to the new phone screen; there is no Firebase sign-out dependency.

## 20–22. Verification

- Focused backend: **74 tests passed across 12 files**, including OTP request/verification, provider errors, concurrency/rollback harness, first-profile creation, normalization, POP sessions/revocation and removal guards.
- Android focused new flow/session tests passed. Final `:app:testDebugUnitTest`: **256 passed, 0 failures/errors/skips**. Final `:app:lintDebug` and `:app:assembleDebug` passed; lint **0 errors / 366 warnings**. No broad unrelated warning cleanup was attempted.
- TypeScript/Web lint passed (`tsc --noEmit`). Final local production Web build passed after removal of obsolete routes.
- Prisma schema validation and client generation passed. Schema-to-schema `prisma migrate diff --script` produces exactly the single intended column drop; no database connection/application is needed for that comparison.
- `git diff --check` passed, including final documentation. APK DEX scan found no `FirebaseAuth`, `PhoneAuthProvider` or `PhoneAuthCredential` class descriptors.
- Transaction tests use a deterministic serial/rollback database harness, not a live Production or TEST database. No claim of physical UI/performance or real provider delivery acceptance is made.
- Old source-shape tests were updated to inspect the new auth entry/native legal/country path. Behavioral tests cover input, loading, double submission, countdown/resend, invalid/expired/locked OTP, network retry, secure-session repository integration and logout.

## 23–25. Audit and schema migration

No active source occurrence implements Firebase Phone Auth. The static architecture test rejects retired Android SDK symbols, Firebase auth Gradle dependency and return of the exchange endpoint/header. The full audit documents remaining non-auth SDK references and historical material.

**Schema change: YES. Migration created: YES.**

`packages/db/prisma/migrations/20260911190000_retire_firebase_phone_subject/migration.sql`

It drops only `MobileAuthChallenge.firebaseSubjectHash`. Classification: obsolete nullable HMAC proof digest formerly written by phone-exchange/enrollment creation; all code dependency has been removed. Production row/non-null counts were not inspected and are not asserted. The migration deletes no users/profiles/sessions, but dropping the digest column is irreversible without backup; it must accompany the auth release after review. The old application cannot be rolled back after this drop without restoring the column. This migration was prepared and compared locally, **not applied anywhere**.

`ExternalIdentity.provider/providerSubject` and enum value `FIREBASE` are retained for historical identity records. They are not phone-auth-specific columns; no further destructive identity-table migration is required for the new flow, which never reads/writes that provider mapping.

## 26–27. TEST reset

**TEST RESET BLOCKED — ISOLATION NOT PROVEN. TEST RESET READY: NO.**

No isolated TEST/STAGING database/service was proven. No reset/seed ran. The current default seed creates demo customer data and was explicitly not used. [TEST readiness](AUTH_REBUILD_TEST_READINESS.md) records required isolation, configuration-only seed scope, Admin access, all 17 templates and no Inventory/demo requirements. A deployment package being code-ready does not constitute environment isolation or reset approval.

## 28. APK

APK exists and was built only, never installed. Actual aapt2 metadata and SHA-256 were checked:

- Path: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`.
- Size: **53,480,757 bytes**.
- SHA-256: **DC2C564EC1C5F80CA50F4282D2F1D2EF4304983A4AA03F79CF29E0C4ACC49651**.
- Package: **com.popwam.pop.debug**.
- versionName: **0.0.12-debug**.
- versionCode: **12**.

Default API configuration points to Production; owner TEST acceptance requires a matching TEST backend and a TEST-targeted build.

## 29–31. Deployment, handoff and final status

No Production env, migration or deployment changed. The six requested Evolution/OTP variables plus existing database/OTP pepper/mobile session secrets and shared app configuration are listed in [TEST readiness](AUTH_REBUILD_TEST_READINESS.md). Secrets are absent from this report and Android.

The canonical [handoff](POP_ADMIN_REBUILD_HANDOFF.md) records the auth rebuild separately from the accepted PASS 1–6 baseline. Physical OTP acceptance is **NOT PERFORMED**. No emulator, physical device, adb, APK installation or instrumentation was used; no Inventory cleanup, unrelated Admin acceptance fix or commit was started.

```text
EVOLUTION OTP IMPLEMENTED: YES
OLD FIREBASE PHONE AUTH CODE DELETED: YES
OLD AUTH UI DELETED: YES
ONE CLEAN AUTH FLOW ONLY: YES
POP SESSION PRESERVED: YES
TEST RESET READY: NO — ISOLATION NOT PROVEN
READY FOR TEST ENVIRONMENT DEPLOYMENT: YES (code/build package; requires an independently configured TEST environment)
OWNER PHYSICAL OTP ACCEPTANCE: NOT PERFORMED
```

No Production data reset, deployment or migration application occurred. The work stops after code/build verification.

## Exact changed-file inventory


### Deleted

- `apps/android/app/src/androidTest/java/com/popwam/pop/ui/auth/Phase4ScreenshotTest.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePhoneAuthGateway.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthenticationFlowViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthenticationHost.kt`
- `apps/android/app/src/test/java/com/popwam/pop/data/auth/FirebasePhoneAuthPolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/AuthRuntimeSecurityContractTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/PreAuthExperiencePolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/auth/AuthenticationThemeAuthorityTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/auth/PasskeyOperationErrorTest.kt`
- `apps/mobile/authentication/build.gradle.kts`
- `apps/mobile/authentication/src/commonMain/composeResources/values-ar/strings.xml`
- `apps/mobile/authentication/src/commonMain/composeResources/values-fr/strings.xml`
- `apps/mobile/authentication/src/commonMain/composeResources/values/strings.xml`
- `apps/mobile/authentication/src/commonMain/kotlin/com/popwam/mobile/authentication/AuthState.kt`
- `apps/mobile/authentication/src/commonMain/kotlin/com/popwam/mobile/authentication/AuthVectors.kt`
- `apps/mobile/authentication/src/commonMain/kotlin/com/popwam/mobile/authentication/AuthenticationApi.kt`
- `apps/mobile/authentication/src/commonMain/kotlin/com/popwam/mobile/authentication/AuthenticationCoordinator.kt`
- `apps/mobile/authentication/src/commonMain/kotlin/com/popwam/mobile/authentication/AuthenticationScreens.kt`
- `apps/mobile/authentication/src/commonTest/kotlin/com/popwam/mobile/authentication/AuthenticationCoordinatorTest.kt`
- `apps/mobile/authentication/src/commonTest/kotlin/com/popwam/mobile/authentication/AuthenticationInputDirectionTest.kt`
- `apps/mobile/authentication/src/commonTest/kotlin/com/popwam/mobile/authentication/AuthenticationStateMachineTest.kt`
- `apps/web/src/app/admin/sms/page.tsx`
- `apps/web/src/app/api/firebase/guest/route.ts`
- `apps/web/src/app/api/firebase/link-pop-user/route.ts`
- `apps/web/src/app/api/mobile/auth/challenge/route.ts`
- `apps/web/src/app/api/mobile/auth/firebase/phone/exchange/route.ts`
- `apps/web/src/app/api/mobile/auth/otp/send/route.ts`
- `apps/web/src/app/api/otp/channels/route.ts`
- `apps/web/src/app/api/otp/send/route.ts`
- `apps/web/src/app/api/otp/verify/route.ts`
- `apps/web/src/lib/external-identity.ts`
- `apps/web/src/lib/firebase/phone-auth-contract.test.ts`
- `apps/web/src/lib/firebase/phone-exchange-route.test.ts`
- `apps/web/src/lib/firebase/phone-policy.ts`

### Modified

- `docs/POP_ADMIN_REBUILD_HANDOFF.md`
- `.env.example`
- `apps/android/app/build.gradle.kts`
- `apps/android/app/src/debug/java/com/popwam/pop/review/DesignReviewActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/AuthRuntimeDiagnostics.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/SecureSessionStore.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/SessionRepository.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt`
- `apps/android/app/src/main/res/values-ar/strings.xml`
- `apps/android/app/src/main/res/values-fr/strings.xml`
- `apps/android/app/src/main/res/values/strings.xml`
- `apps/android/app/src/test/java/com/popwam/pop/data/auth/SessionRepositoryPasskeyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/FirstLaunchAndroidContractTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/PasskeyLoginPolicyTest.kt`
- `apps/android/settings.gradle.kts`
- `apps/mobile/settings.gradle.kts`
- `apps/web/src/app/activate/card/[publicSlug]/phone/page.tsx`
- `apps/web/src/app/api/mobile/auth/otp/verify/route.ts`
- `apps/web/src/components/phone-entry-screen.tsx`
- `apps/web/src/lib/firebase/admin.ts`
- `apps/web/src/lib/firebase/client.ts`
- `apps/web/src/lib/firebase/foundation.test.ts`
- `apps/web/src/lib/mobile-auth-contract-v2.ts`
- `apps/web/src/lib/mobile-enrollment.ts`
- `apps/web/src/lib/profile-bootstrap.ts`
- `packages/db/prisma/schema.prisma`

### Added

- `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginViewModel.kt`
- `apps/android/app/src/main/res/values-ar/whatsapp_auth.xml`
- `apps/android/app/src/main/res/values-fr/whatsapp_auth.xml`
- `apps/android/app/src/main/res/values/whatsapp_auth.xml`
- `apps/android/app/src/test/java/com/popwam/pop/ui/auth/PhoneLoginViewModelTest.kt`
- `apps/web/src/app/api/mobile/auth/otp/request/route.ts`
- `apps/web/src/lib/evolution-otp-sender.test.ts`
- `apps/web/src/lib/evolution-otp-sender.ts`
- `apps/web/src/lib/mobile-otp-http.ts`
- `apps/web/src/lib/mobile-otp.test.ts`
- `apps/web/src/lib/mobile-otp.ts`
- `apps/web/src/lib/otp-profile-bootstrap.test.ts`
- `apps/web/src/lib/phone-auth-removal.test.ts`
- `docs/AUTH_REBUILD_FIREBASE_AUDIT.md`
- `docs/AUTH_REBUILD_TEST_READINESS.md`
- `docs/POP_AUTH_REBUILD_VERIFICATION.md`
- `packages/db/prisma/migrations/20260911190000_retire_firebase_phone_subject/migration.sql`

### Removed exclusive Android resource entries

143 entries from the original values files, plus `verify_phone_help` wherever present; the old shared-module resource files were deleted in full.

`back_to_sign_in`, `change_phone`, `channel_sms`, `channel_whatsapp`, `choose_country`, `continue_to_pop`, `firebase_activity_error`, `firebase_app_verification_error`, `firebase_code_invalid`, `firebase_configuration_error`, `firebase_exchange_error`, `firebase_identity_conflict`, `firebase_network_error`, `firebase_phone_invalid`, `firebase_quota_error`, `firebase_recaptcha_error`, `firebase_session_expired`, `firebase_too_many_requests`, `firebase_unavailable`, `how_pop_works`, `no_country_results`, `otp_accessibility`, `passkey_login_cancelled`, `passkey_login_failed`, `passkey_login_network`, `passkey_login_no_credential`, `passkey_login_server`, `passkey_login_unavailable`, `phone_auth_help`, `phone_auth_title`, `phone_help`, `phone_invalid`, `phone_national_hint`, `phone_number`, `pop_slogan`, `pre_auth_intro_connect_body`, `pre_auth_intro_connect_title`, `pre_auth_intro_identity_body`, `pre_auth_intro_identity_title`, `pre_auth_intro_ready_body`, `pre_auth_intro_ready_title`, `pre_auth_intro_share_body`, `pre_auth_intro_share_title`, `resend_code`, `resend_countdown`, `search_countries`, `send_code`, `sign_in`, `smart_title`, `use_phone_instead`, `verification_code`, `verify_continue`, `verify_phone_title`, `welcome_description`
