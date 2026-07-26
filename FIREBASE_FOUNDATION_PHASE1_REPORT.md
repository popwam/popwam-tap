# 1. Executive Summary

Firebase Phase 1 is implemented locally as a supplement to POP authentication. POP PostgreSQL `User.id` remains the authoritative CUID business identity; Firebase UIDs are stored only through an additive external-identity mapping. Meta code, routes, scopes, callback URI, and review flow were not changed.

# 2. Files Changed

Changed: `.env.example`, `turbo.json`, `scripts/validate-production-env.mjs`, `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/app/layout.tsx`, `apps/web/src/lib/firebase/client.ts`, `apps/web/src/lib/firebase/admin.ts`, `apps/web/src/lib/firebase/guest.ts`, `apps/web/src/lib/firebase/analytics.ts`, `apps/web/src/lib/firebase/foundation.test.ts`, `apps/web/src/lib/external-identity.ts`, `apps/web/src/components/firebase-guest-bootstrap.tsx`, `apps/web/src/app/api/firebase/guest/route.ts`, `apps/web/src/app/api/firebase/link-pop-user/route.ts`, `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/20260723153000_firebase_external_identity_foundation/migration.sql`, `apps/android/build.gradle.kts`, `apps/android/app/build.gradle.kts`, `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/FcmTokenBridge.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/PopMessagingService.kt`, and `apps/android/app/src/main/java/com/popwam/pop/data/auth/SessionRepository.kt`.

The pre-existing untracked `apps/android/app/google-services.json`, Firebase Web dependency/configuration, and audit report were preserved.

# 3. Web Firebase Configuration

Status: IMPLEMENTED.

`apps/web/src/lib/firebase/client.ts` now reads only `NEXT_PUBLIC_FIREBASE_*` configuration, initializes the app once with `getApps()`/`getApp()`, and safely returns `null` on SSR or missing config. Analytics is dynamically loaded only in supported browsers. The feature flag `NEXT_PUBLIC_FIREBASE_GUEST_AUTH_ENABLED` is default-off in `.env.example`; when false, existing POP behavior is unchanged.

# 4. Firebase Admin / Token Verification

Status: IMPLEMENTED.

`apps/web/src/lib/firebase/admin.ts` is server-only and uses the existing server credential names `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY`. It verifies Firebase ID tokens with Firebase Admin, including revocation checking, and returns only validated UID/auth metadata. A plain client UID is never accepted. Credentials are not logged or exposed.

# 5. External Identity Model

Status: IMPLEMENTED.

`ExternalIdentity` adds a nullable `userId`, Firebase provider subject, type, status, timestamps, and a unique `[provider, providerSubject]` constraint. This prevents one Firebase UID from being mapped to multiple POP users while allowing a POP user to retain multiple external identities.

# 6. Guest Identity Foundation

Status: PARTIAL.

`POST /api/firebase/guest` verifies an anonymous Firebase ID token and creates or restores only an unlinked `ExternalIdentity`; it does not create a POP `User`. The invisible browser bootstrap can create/restore an anonymous Firebase client identity only when the local feature flag is explicitly enabled. It intentionally does not grant POP dashboard or business access.

# 7. Guest → POP User Linking Security

Status: IMPLEMENTED.

`POST /api/firebase/link-pop-user` requires both an existing POP session (NextAuth cookie or POP mobile bearer token) and a separately supplied `x-firebase-id-token`. The target POP user is re-read and must have `phoneVerifiedAt`, so the mapping is only linked after independently verified POP phone OTP. Same-user links are idempotent; another POP user is rejected with `EXTERNAL_IDENTITY_CONFLICT`. A second Firebase UID for one POP user is retained as an additional identity—nothing is merged, deleted, or reassigned.

# 8. Existing POP Auth Compatibility

Status: IMPLEMENTED.

Existing Web Phone OTP → NextAuth, Android Phone OTP → POP access/refresh tokens, and POP/WebAuthn passkeys remain unchanged as authorization authorities. Firebase token verification is restricted to external-identity endpoints; it is not accepted by existing protected business APIs.

# 9. Android Firebase Configuration

Status: CONFIG ONLY.

The Android root build now declares Google Services plugin `4.5.0`; the app uses Firebase BoM `34.16.0` with Auth, Analytics, and Messaging. The plugin is deliberately opt-in through `-Ppopwam.firebase.android.enabled=true`, preventing accidental use of the release Firebase client for debug. No Firestore, Realtime Database, Remote Config, or App Check dependency was added.

# 10. Android Debug Firebase Client Status

Status: BLOCKED.

The checked-in configuration contains no client for `com.popwam.pop.debug`. `verifyFirebaseDebugClient` fails with an explicit instruction to register that application ID in Firebase Console. The release application ID remains `com.popwam.pop`; no fake client, package rename, or copied Firebase application ID was used.

# 11. FCM Token Registration

Status: IMPLEMENTED.

`FcmTokenBridge` now uploads the stored FCM token to the existing `POST /api/mobile/push-tokens` endpoint after a successful POP OTP session and on later application startup. Token rotation is stored and retried on a later authenticated startup/login if a network call fails. Logout attempts the existing DELETE endpoint before POP credentials are cleared. Push ownership remains POP-user based; guest push ownership was not added.

# 12. Analytics Foundation

Status: PARTIAL.

A centralized Web taxonomy and safe-property gate were added. It permits only non-sensitive context such as `user_type`, platform, screen name, version, outcome, and provider. OTPs, phone/email values, passwords, tokens, cookies, OAuth data, secrets, and arbitrary properties are excluded. No raw analytics stream is copied to Neon or R2. No broad UI instrumentation was added.

# 13. Crashlytics Status

Status: NOT IMPLEMENTED.

Crashlytics was intentionally not added because Android Firebase runtime configuration is blocked pending the correct debug client and no real-device validation was requested. No crash test or UI was introduced.

# 14. Firestore Status

Status: NOT IMPLEMENTED.

No Firestore dependency, collection, rule, or business-data copy was introduced.

# 15. Realtime Database Status

Status: NOT IMPLEMENTED.

No Realtime Database dependency, presence record, rule, or business-data copy was introduced.

# 16. App Check Status

Status: NOT IMPLEMENTED.

No App Check SDK or enforcement was enabled. POP access is not dependent on App Check.

# 17. Meta Regression Safety

Status: IMPLEMENTED.

No Meta file appears in the Phase 1 change set. Meta remains a Connected Account with its existing routes, canonical callback URI, `public_profile,user_link` base scopes, profile fields, and review-visible behavior unchanged.

# 18. Database Migration Status

Status: CONFIG ONLY.

Created `packages/db/prisma/migrations/20260723153000_firebase_external_identity_foundation/migration.sql` as an additive migration. `pnpm db:generate` completed successfully.

MIGRATION FILE CREATED: YES

MIGRATION APPLIED: NO

# 19. Test Results

Web `pnpm --filter ./apps/web test`: PASS — 31 files, 153 tests. New tests cover mocked valid/missing/invalid Firebase verification, guest mapping without POP user creation, same-user idempotency, conflict/takeover rejection, OTP-verification requirement, multiple Firebase identities, and analytics property filtering.

Android `gradlew.bat testDebugUnitTest`: PASS.

# 20. Build Results

Web `pnpm --filter ./apps/web lint`: PASS.

Web `pnpm --filter ./apps/web build`: PASS. It includes `/api/firebase/guest`, `/api/firebase/link-pop-user`, and the existing integration routes.

Android `gradlew.bat assembleDebug`: PASS.

Android `gradlew.bat lintDebug`: BLOCKED by a local Android Gradle Plugin lint-model deserialization failure for a missing generated `debug-artifact-dependencies.xml`; Kotlin compilation and APK assembly passed. This is not an app-source lint finding. The generated lint-model directory was inspected; an attempt to delete only that generated directory was denied by the execution policy, so no deletion was performed.

`git diff --check`: PASS.

# 21. Runtime Tests Not Run

ANDROID RUNTIME DEVICE TESTS: NOT RUN — `adb devices` reported no attached authorized real device. No emulator, AVD, or QEMU was created or used.

# 22. Git Working Tree

The working tree was already dirty before Phase 1 (audit report, Firebase Web client/dependency state, and Android `google-services.json`). All existing user work was preserved. No files were staged, committed, pushed, reset, cleaned, or checked out.

# 23. Remaining Manual Firebase Console Actions

1. Register Android package `com.popwam.pop.debug` as a separate Firebase Android app if debug Firebase use is desired.
2. Download the Firebase-generated `google-services.json` that contains both appropriate clients; do not hand-edit or fabricate one.
3. Enable Firebase Anonymous Authentication for the intended project before enabling the local guest flag.
4. Add the documented public Web Firebase configuration and the server service-account credentials only in the appropriate user-controlled local/deployment environment.
5. After the debug client is present, validate with `-Ppopwam.firebase.android.enabled=true` and a real authorized device before enabling Android anonymous auth/runtime analytics.
6. Apply the additive Prisma migration only through the normal approved database change process; it was not applied here.

# 24. Blockers

Android Firebase runtime integration is BLOCKED pending the `com.popwam.pop.debug` Firebase app registration. Android Anonymous Auth is therefore intentionally not implemented at runtime. Android lint is additionally blocked by the local AGP generated lint-model defect described above.

# 25. Exact Recommended Phase 2

After the Console actions and approved migration are complete: enable the guest feature only in a controlled local/staging environment; add a small server mapping call after anonymous sign-in; integrate the secure link endpoint after existing OTP completion for web and Android; add real-device Firebase Auth/FCM validation; then add minimal, reviewed analytics events. Keep POP sessions, POP User IDs, OTP, passkeys, PostgreSQL business data, and Meta Connected Account behavior authoritative.
