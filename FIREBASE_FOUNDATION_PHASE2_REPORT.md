# 1. Executive Summary

Phase 2 adds local runtime wiring for Firebase Anonymous guest identity, server registration, post-login POP linking, Android Firebase activation, authenticated FCM lifecycle hooks, privacy-safe analytics, and Crashlytics build integration. POP `User.id`, POP OTP, NextAuth, POP mobile tokens, passkeys, and Meta remain authoritative and unchanged in purpose.

# 2. Phase 1 Baseline Verification

Status: IMPLEMENTED. Web public configuration is environment-driven and SSR-safe; Firebase Admin is server-only; token verification and `ExternalIdentity` services/routes remain present; FCM bridge exists; Android Google Services is opt-in; and no Meta implementation file was changed.

# 3. Android Debug Firebase Client Verification

Status: IMPLEMENTED. `gradlew.bat verifyFirebaseDebugClient` passed without exposing configuration values. The checked configuration now contains the required `com.popwam.pop.debug` client.

# 4. Web Anonymous Guest Runtime

Status: PARTIAL. The root bootstrap silently creates or reuses an anonymous Firebase user behind `NEXT_PUBLIC_FIREBASE_GUEST_AUTH_ENABLED`, obtains a fresh ID token, and calls `/api/firebase/guest`. It is non-blocking, has no retry loop, stores no token manually, and does not create a POP user/session or unlock protected content. Live database registration was not run because the additive migration was not applied to any confirmed non-production database.

# 5. Android Anonymous Guest Runtime

Status: PARTIAL. The enabled Android build creates/restores only an anonymous Firebase user on startup when no POP session exists, obtains an ID token, and registers it through POP asynchronously. Failure returns quietly and leaves public Android flows usable. Runtime Firebase network behavior was not tested because no real device is connected.

# 6. Guest Identity Server Registration

Status: IMPLEMENTED. The existing Node runtime endpoint verifies the Firebase Admin token before using its UID and returns a minimal guest record. It now includes `ok: true` for mobile clients. It never creates a POP `User`.

# 7. Web Guest → POP Link

Status: IMPLEMENTED. On a subsequent root bootstrap with an existing POP/NextAuth session and anonymous Firebase user, the client calls the secure link endpoint with a fresh Firebase ID token in a separate header. Server-side current-user, phone OTP verification, and conflict checks remain authoritative. Link failure is silent and cannot invalidate the POP session; later page/bootstrap attempts are idempotent.

# 8. Android Guest → POP Link

Status: IMPLEMENTED. After the existing Android POP OTP flow stores its POP tokens, the lifecycle hook separately obtains a Firebase ID token and calls the link endpoint. The normal POP bearer interceptor continues to authenticate the application request; Firebase is only in `X-Firebase-Id-Token`. Failure is contained and does not log the user out.

# 9. POP Auth Independence From Firebase

Status: IMPLEMENTED. Firebase coordinator/network exceptions return false/are swallowed by the existing after-auth hook. POP OTP success, NextAuth sessions, POP mobile access/refresh tokens, passkeys, roles, and business APIs do not depend on Firebase success.

# 10. FCM Token Lifecycle

Status: IMPLEMENTED. A pre-login or rotated token remains stored locally, uploads after authenticated OTP, retries on later authenticated startup, and attempts backend revocation before POP credentials are cleared. No guest-owned device-token schema was introduced. Unit policy tests cover pending/rotated upload and logout-revocation conditions.

# 11. Analytics Runtime

Status: PARTIAL. Web root bootstraps `app_open` and de-duplicated pathname `screen_view`; Android records guest startup and guest conversion, with `otp_verified` after the existing POP OTP success hook. Both central APIs allow only safe keys (`user_type`, platform, screen name, version, outcome, provider) and reject sensitive identity/token/OTP data. No analytics is copied to Neon/R2.

# 12. Crashlytics

Status: PARTIAL. Firebase Crashlytics Gradle plugin `3.0.7` and BoM SDK are integrated only for the explicitly Firebase-enabled Android build. Enabled build tasks ran successfully. No crash was triggered, no crash button/helper was added, and no secrets/tokens are logged.

# 13. Firestore

Status: NOT IMPLEMENTED intentionally. No SDK, collection, rule, or PostgreSQL business-data duplication was added.

# 14. Realtime Database

Status: NOT IMPLEMENTED intentionally. No SDK, presence implementation, rule, or business-data duplication was added.

# 15. App Check

Status: NOT IMPLEMENTED intentionally. No enforcement or request dependency was enabled.

# 16. Migration Status

Status: CONFIG ONLY. The Phase 1 additive migration `20260723153000_firebase_external_identity_foundation` remains present but was not applied here because no clearly isolated local/test database workflow was available.

MIGRATION APPLIED TO PRODUCTION: NO

# 17. Meta Regression Check

Status: IMPLEMENTED. `git diff --name-only` contains no Meta route, scope, callback, or connected-account file. Search confirms the existing Meta capability/base-scope files remain the only relevant sources. No Meta behavior was changed.

# 18. Automated Tests

Web `pnpm --filter ./apps/web test`: PASS — 32 files, 158 tests. Added mocks cover disabled guest bootstrap, anonymous-user reuse, transient guest failure, conflict-safe link handling, non-fatal link failure, server verification/mapping policies, and analytics filtering.

Android `gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true`: PASS. Added mocked coordinator tests verify guest registration, failed linking without POP logout, successful conversion event, and FCM lifecycle policy.

# 19. Build Results

`pnpm --filter ./apps/web lint`: PASS.

`pnpm --filter ./apps/web build`: PASS.

`gradlew.bat verifyFirebaseDebugClient`: PASS.

`gradlew.bat assembleDebug -Ppopwam.firebase.android.enabled=true`: PASS, including Google Services and Crashlytics tasks.

`gradlew.bat lintDebug -Ppopwam.firebase.android.enabled=true`: PASS. The prior generated AGP lint-model failure did not recur.

`git diff --check`: PASS.

# 20. Runtime Tests

ANDROID RUNTIME DEVICE TESTS: NOT RUN. `adb devices` reported no authorized real device. No emulator, AVD, or QEMU was used. Web guest registration against a live database was not run because applying the migration was out of scope.

# 21. Blockers

No build/configuration blocker remains. Production/runtime rollout remains blocked pending the approved application of the additive migration and real-device Firebase validation; neither was attempted here.

# 22. Files Changed

Phase 2 changes: `apps/web/src/lib/firebase/client.ts`, `apps/web/src/lib/firebase/guest.ts`, `apps/web/src/lib/firebase/guest-state.ts`, `apps/web/src/lib/firebase/guest-runtime.test.ts`, `apps/web/src/lib/firebase/analytics.ts`, `apps/web/src/components/firebase-guest-bootstrap.tsx`, `apps/web/src/components/firebase-analytics-bootstrap.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/api/firebase/guest/route.ts`, `apps/web/src/app/api/firebase/link-pop-user/route.ts`, `apps/android/build.gradle.kts`, `apps/android/app/build.gradle.kts`, `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/SessionRepository.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/FcmTokenBridge.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebaseGuestCoordinator.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt`, `apps/android/app/src/test/java/com/popwam/pop/data/auth/FirebaseGuestCoordinatorTest.kt`, and `apps/android/app/src/test/java/com/popwam/pop/data/auth/FcmTokenLifecycleTest.kt`.

# 23. Git Status

The worktree remains dirty with preserved Phase 1/user changes and Phase 2 additions. Nothing was staged, committed, pushed, reset, cleaned, or checked out.

# 24. Manual Actions Remaining

1. Apply the existing additive migration through the approved non-production then production database change process.
2. On a real authorized Android device, validate anonymous sign-in, guest registration, post-OTP link, FCM registration/revocation, analytics delivery, and Crashlytics dashboard receipt.
3. Keep `NEXT_PUBLIC_FIREBASE_GUEST_AUTH_ENABLED` disabled outside an approved rollout until the migration and runtime validation are complete.
4. Do not enable App Check enforcement, Firestore, or Realtime Database in this phase.

# 25. Readiness For UI Redesign

YES for UI redesign work: the identity/runtime seams are in place and POP authentication remains independent. NO for claiming a production Firebase guest rollout until the approved migration and real-device checks above are completed.
