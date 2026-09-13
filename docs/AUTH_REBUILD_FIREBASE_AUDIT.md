# Firebase / Phone Auth remaining-reference audit

Scope: tracked and new non-ignored text files, excluding generated build outputs and this audit itself. Every matching line is listed; symbol context avoids copying configuration values. Historical documents and immutable migrations are evidence, not executable fallback.

| File | Line | Symbol context | Why retained |
|---|---:|---|---|
| `apps/web/src/lib/phone-auth-removal.test.ts` | 7 | `FirebaseAuth, PhoneAuthCredential, PhoneAuthProvider, signInWithCredential, verifyPhoneNumber` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/phone-auth-removal.test.ts` | 10 | `firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/phone-auth-removal.test.ts` | 13 | `firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/phone-auth-removal.test.ts` | 14 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `docs/AUTH_REBUILD_TEST_READINESS.md` | 38 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 3 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 7 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 9 | `FirebasePhoneAuthGateway` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 11 | `Firebase, firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 13 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 15 | `FIREBASE, Firebase, FirebasePopAnalytics, firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 17 | `FIREBASE_AUDIT, Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 37 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 55 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 63 | `FirebaseAuth, PhoneAuthCredential, PhoneAuthProvider` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 69 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 73 | `firebase_phone_subject` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 75 | `firebaseSubjectHash` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 77 | `FIREBASE` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 106 | `FIREBASE` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 123 | `FirebasePhoneAuthGateway` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 126 | `FirebasePhoneAuthPolicyTest` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 144 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 145 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 147 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 153 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 154 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 155 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 184 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 185 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 186 | `firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 209 | `FIREBASE_AUDIT` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 212 | `firebase_phone_subject` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_AUTH_REBUILD_VERIFICATION.md` | 218 | `firebase_activity_error, firebase_app_verification_error, firebase_code_invalid, firebase_configuration_error, firebase_exchange_error, firebase_identity_conflict, firebase_network_error, firebase_phone_invalid, firebase_quota_error, firebase_recaptcha_error, firebase_session_expired, firebase_too_many_requests, firebase_unavailable` | Historical documentation/evidence or current removal report; no executable authentication. |
| `packages/db/prisma/migrations/20260911190000_retire_firebase_phone_subject/migration.sql` | 1 | `Firebase` | Immutable historical migration or local column-retirement migration; no active login implementation. |
| `packages/db/prisma/migrations/20260911190000_retire_firebase_phone_subject/migration.sql` | 3 | `firebaseSubjectHash` | Immutable historical migration or local column-retirement migration; no active login implementation. |
| `.env.example` | 90 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 96 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 97 | `FIREBASE_API_KEY` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 98 | `FIREBASE_AUTH_DOMAIN` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 99 | `FIREBASE_PROJECT_ID` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 100 | `FIREBASE_STORAGE_BUCKET` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 101 | `FIREBASE_MESSAGING_SENDER_ID` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 102 | `FIREBASE_APP_ID` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `.env.example` | 103 | `FIREBASE_MEASUREMENT_ID` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/README.md` | 25 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `apps/android/app/build.gradle.kts` | 8 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 11 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 13 | `firebaseAndroidIntegrationEnabled` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 33 | `FIREBASE_RUNTIME_ENABLED, firebaseAndroidIntegrationEnabled` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 96 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 97 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 98 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 99 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 117 | `FirebaseDebugClient` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 119 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 122 | `FIREBASE` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 130 | `FIREBASE, Firebase, firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 135 | `firebaseAndroidIntegrationEnabled` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/build.gradle.kts` | 136 | `FirebaseDebugClient` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/google-services.json` | 5 | `firebasestorage` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/main/AndroidManifest.xml` | 14 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/main/AndroidManifest.xml` | 15 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/main/AndroidManifest.xml` | 41 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt` | 60 | `FirebasePopAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/FcmTokenBridge.kt` | 7 | `Firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt` | 5 | `FirebaseAnalytics, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt` | 8 | `FirebasePopAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt` | 13 | `FIREBASE_RUNTIME_ENABLED` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/FirebasePopAnalytics.kt` | 17 | `FirebaseAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/PopMessagingService.kt` | 3 | `FirebaseMessagingService, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/PopMessagingService.kt` | 4 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/data/auth/PopMessagingService.kt` | 12 | `FirebaseMessagingService` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/share/SharePayloadPolicy.kt` | 34 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/android/app/src/main/res/values-ar/strings.xml` | 430 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/main/res/values/strings.xml` | 430 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/app/src/test/java/com/popwam/pop/ui/DynamicOnboardingPolicyTest.kt` | 104 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/android/app/src/test/java/com/popwam/pop/ui/DynamicOnboardingPolicyTest.kt` | 105 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/android/app/src/test/java/com/popwam/pop/ui/DynamicOnboardingPolicyTest.kt` | 106 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/android/app/src/test/java/com/popwam/pop/ui/NearbyAndroidContractTest.kt` | 28 | `FirebaseCrashlytics` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/android/app/src/test/java/com/popwam/pop/ui/NearbyAndroidContractTest.kt` | 52 | `FirebasePopAnalytics` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/android/build.gradle.kts` | 6 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/android/google-services.json` | 5 | `firebasestorage` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/web/locales/ar.json` | 18 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/web/locales/en.json` | 18 | `Firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/web/package.json` | 21 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/web/package.json` | 22 | `firebase` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `apps/web/src/app/layout.tsx` | 5 | `FirebaseAnalyticsBootstrap, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/app/layout.tsx` | 19 | `FirebaseAnalyticsBootstrap` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 5 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 143 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 153 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 180 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 183 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/dynamic-onboarding-client.tsx` | 197 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/firebase-analytics-bootstrap.tsx` | 5 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/firebase-analytics-bootstrap.tsx` | 7 | `FirebaseAnalyticsBootstrap` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/firebase-analytics-bootstrap.tsx` | 10 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/firebase-analytics-bootstrap.tsx` | 11 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friend-profile-action.tsx` | 6 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friend-profile-action.tsx` | 44 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 6 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 79 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 112 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 121 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 131 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 140 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 150 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 171 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 173 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/friends-center.tsx` | 177 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/image-field.tsx` | 5 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/image-field.tsx` | 16 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/initial-profile-bootstrap.tsx` | 5 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/initial-profile-bootstrap.tsx` | 16 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/initial-profile-bootstrap.tsx` | 24 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/initial-profile-bootstrap.tsx` | 30 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/initial-profile-bootstrap.tsx` | 31 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/legal-consent-sheet.tsx` | 7 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/legal-consent-sheet.tsx` | 22 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 6 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 95 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 106 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 107 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 119 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 165 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 176 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 187 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 192 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 211 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 220 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 248 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 268 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/nearby-center.tsx` | 327 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/passkey-enrollment-prompt.tsx` | 7 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/passkey-enrollment-prompt.tsx` | 11 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/passkey-enrollment-prompt.tsx` | 12 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 9 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 126 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 134 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 151 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 173 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 206 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 207 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 216 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 239 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 243 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-home-editor.tsx` | 254 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 4 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 36 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 41 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 50 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 63 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 74 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/profile-publishing-client.tsx` | 76 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/settings-center.tsx` | 9 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/settings-center.tsx` | 100 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/settings-center.tsx` | 135 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/settings-center.tsx` | 152 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/settings-center.tsx` | 162 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 11 | `FirebaseAnalyticsEvent, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 92 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 112 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 132 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 155 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 166 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 207 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 230 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 235 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 258 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/components/share-center.tsx` | 267 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/admin-notifications.ts` | 3 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/admin-notifications.ts` | 5 | `FirebaseAdminApp, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/admin-notifications.ts` | 142 | `FirebaseAdminApp` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/api-auth.ts` | 21 | `Firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 2 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 4 | `FirebasePrivateKey` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 8 | `FirebasePrivateKey` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 10 | `FirebasePrivateKey` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 17 | `FirebasePrivateKey` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 18 | `FirebasePrivateKey` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 21 | `FirebaseAdminApp` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/admin.ts` | 23 | `FIREBASE_ADMIN_UNAVAILABLE` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 3 | `FirebaseAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 5 | `FIREBASE_ANALYTICS_EVENTS` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 31 | `FIREBASE_ANALYTICS_EVENTS, FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 32 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 36 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 37 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 41 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 46 | `FirebaseAnalyticsEvent` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 48 | `FirebaseAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 50 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 51 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/analytics.ts` | 52 | `FirebaseAnalyticsProperties` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 3 | `FirebaseApp, FirebaseOptions, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 4 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 7 | `FIREBASE_API_KEY` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 8 | `FIREBASE_AUTH_DOMAIN` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 9 | `FIREBASE_PROJECT_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 10 | `FIREBASE_STORAGE_BUCKET` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 11 | `FIREBASE_MESSAGING_SENDER_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 12 | `FIREBASE_APP_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 19 | `FirebaseOptions, firebaseConfig` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 24 | `FIREBASE_API_KEY` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 25 | `FIREBASE_AUTH_DOMAIN` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 26 | `FIREBASE_PROJECT_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 27 | `FIREBASE_STORAGE_BUCKET` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 28 | `FIREBASE_MESSAGING_SENDER_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 29 | `FIREBASE_APP_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 30 | `FIREBASE_MEASUREMENT_ID` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 34 | `FirebaseApp` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 35 | `firebaseConfig` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 40 | `FirebaseAnalytics` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 41 | `FirebaseApp` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/client.ts` | 44 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 3 | `FirebasePrivateKey` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 4 | `FirebaseAnalyticsProperties` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 8 | `FirebasePrivateKey` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 11 | `FirebasePrivateKey` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 12 | `FirebasePrivateKey` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 16 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/firebase/foundation.test.ts` | 18 | `FirebaseAnalyticsProperties` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/friends-contract.test.ts` | 13 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/friends-contract.test.ts` | 16 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/friends-notifications.ts` | 3 | `firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/friends-notifications.ts` | 5 | `FirebaseAdminApp, firebase` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/friends-notifications.ts` | 68 | `FirebaseAdminApp` | Verified FCM/Analytics/Crashlytics infrastructure or explicit POP authorization/privacy boundary. |
| `apps/web/src/lib/mobile-menu-contract.test.ts` | 12 | `firebaseUid` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/mobile-passkey-contract.test.ts` | 28 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/mobile-passkey-contract.test.ts` | 30 | `firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/nearby-contract.test.ts` | 14 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/nearby-contract.test.ts` | 17 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/nearby-contract.test.ts` | 78 | `firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/profile-editor.test.ts` | 49 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/share-center-contract.test.ts` | 85 | `Firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `apps/web/src/lib/share-center-contract.test.ts` | 86 | `firebase` | Negative architecture/privacy assertion or retained FCM/Analytics test; no Phone Auth operation. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 14 | `FIREBASE` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 209 | `FIREBASE` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 217 | `Firebase, firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 218 | `FIREBASE_AUDIT, Firebase, PhoneAuthCredential, PhoneAuthProvider` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 219 | `FIREBASE, firebaseSubjectHash, firebase_phone_subject` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 222 | `Firebase` | Historical documentation/evidence or current removal report; no executable authentication. |
| `docs/POP_ADMIN_REBUILD_HANDOFF.md` | 223 | `FIREBASE` | Historical documentation/evidence or current removal report; no executable authentication. |
| `packages/db/prisma/migrations/20260723153000_firebase_external_identity_foundation/migration.sql` | 1 | `Firebase` | Immutable historical migration or local column-retirement migration; no active login implementation. |
| `packages/db/prisma/migrations/20260723153000_firebase_external_identity_foundation/migration.sql` | 2 | `FIREBASE` | Immutable historical migration or local column-retirement migration; no active login implementation. |
| `packages/db/prisma/migrations/20260803120000_mobile_auth_contract_v2/migration.sql` | 20 | `firebaseSubjectHash` | Immutable historical migration or local column-retirement migration; no active login implementation. |
| `packages/db/prisma/schema.prisma` | 309 | `FIREBASE` | Historical ExternalIdentity provider value retained to preserve records; OTP login does not use it. |
| `pnpm-lock.yaml` | 41 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 44 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 409 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 413 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 414 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 416 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 419 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 421 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 424 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 427 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 429 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 433 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 435 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 438 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 441 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 445 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 447 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 451 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 454 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 458 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 462 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 464 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 467 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 470 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 471 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 473 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 477 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 483 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 487 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 490 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 492 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 496 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 499 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 503 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 507 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 509 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 512 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 513 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 515 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 519 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 521 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 525 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 527 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 530 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 534 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 536 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 539 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 541 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 544 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 546 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 549 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 551 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 555 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 558 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 560 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 563 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 566 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 568 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 571 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 573 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 576 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 579 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 581 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 584 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 586 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 589 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 592 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 594 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 598 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 600 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 603 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 604 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 606 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 610 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 612 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 616 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 1702 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 1706 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3032 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3034 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3035 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3036 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3037 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3038 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3039 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3042 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3044 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3045 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3046 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3047 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3048 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3051 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3053 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3055 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3057 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3058 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3059 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3060 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3061 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3064 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3066 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3067 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3068 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3069 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3070 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3071 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3074 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3076 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3078 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3080 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3082 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3083 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3084 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3085 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3088 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3090 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3091 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3092 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3093 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3096 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3098 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3100 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3102 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3103 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3104 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3108 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3110 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3111 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3112 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3113 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3114 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3117 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3118 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3121 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3123 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3125 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3126 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3128 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3130 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3131 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3132 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3133 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3136 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3138 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3141 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3143 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3144 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3145 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3146 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3147 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3150 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3152 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3153 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3154 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3155 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3156 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3159 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3161 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3162 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3164 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3166 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3167 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3168 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3169 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3170 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3174 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3176 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3177 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3178 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3179 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3180 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3183 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3184 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3186 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3188 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3189 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3191 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3193 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3194 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3195 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3196 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3197 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3203 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3205 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3206 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3207 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3208 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3209 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3212 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3214 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3216 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3218 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3219 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3220 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3221 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3222 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3223 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3226 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3228 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3229 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3230 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3231 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3232 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3235 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3236 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3238 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3240 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3242 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3244 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3245 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3246 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3250 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3254 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3256 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3257 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3258 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3259 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3262 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3264 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3266 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3268 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3269 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3270 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3271 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3272 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3276 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3278 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3279 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3280 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3281 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3282 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3283 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3286 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3288 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3290 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3292 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3293 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3294 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3295 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3296 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3300 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3302 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3303 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3304 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3305 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3306 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3307 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3310 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3312 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3314 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3316 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3317 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3318 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3319 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3320 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3323 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3325 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3326 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3327 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3328 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3329 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3332 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3333 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3335 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3337 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3338 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3340 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3342 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3343 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3344 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3347 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 3351 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4416 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4419 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4420 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4432 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4434 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4435 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4436 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4437 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4438 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4439 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4440 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4441 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4442 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4443 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4444 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4445 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4446 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4447 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4448 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4449 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4450 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4451 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4452 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4453 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4454 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4455 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4456 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4457 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4458 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4459 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4460 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `pnpm-lock.yaml` | 4461 | `firebase` | Dependency lock metadata for retained SDK packages; no application import of Phone Auth. |
| `scripts/validate-production-env.mjs` | 53 | `FIREBASE_API_KEY, FIREBASE_APP_ID, FIREBASE_AUTH_DOMAIN, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, firebaseWebConfig` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 54 | `firebaseAdminConfig` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 55 | `firebaseAdminConfig` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 56 | `firebasePrivateKey` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 57 | `firebasePrivateKey` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 60 | `firebaseWebConfig` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `scripts/validate-production-env.mjs` | 62 | `firebaseAdminConfig` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
| `turbo.json` | 9 | `FIREBASE_API_KEY, FIREBASE_APP_ID, FIREBASE_AUTH_DOMAIN, FIREBASE_GUEST_AUTH_ENABLED, FIREBASE_MEASUREMENT_ID, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET` | Retained messaging/Analytics/Crashlytics configuration or build integration. |
