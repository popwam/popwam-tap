# POP Priority Runtime Foundation Report

Date: 2026-07-26  
Scope: local implementation and validation only. No deployment, migration application, APK installation, source-control publication, Firebase Console change, Railway change, or Meta change was performed.

## 1. Mobile OTP failure root cause

The exact physical-device Firebase OTP failure stage could not be reproduced at report time because `adb devices -l` returned no connected device. The audit did rule out the known local contract failures:

- The newly built debug APK uses `https://pop.popwam.com/`.
- Android calls `POST /api/mobile/auth/firebase/phone/exchange`.
- The route exists in the production Next.js build; an unauthenticated live `GET` returns `405`, which confirms the deployed route exists without performing a login mutation.
- The Android Firebase project and local Firebase Admin project match.
- The checked-in Firebase configuration contains both `com.popwam.pop` and `com.popwam.pop.debug`.
- The POP response model matches Android access/refresh token parsing.

Therefore the remaining physical failure is an unproven runtime/configuration-stage issue (for example app verification, Firebase sign-in, ID-token retrieval, or deployed proof exchange), not a demonstrated API-base or parser mismatch. The new DEBUG-only stage telemetry is required to identify it without logging a phone, OTP, Firebase token, POP token, or credential.

## 2. Mobile OTP fix

Local readiness is complete, but live end-to-end OTP success is not yet proven.

- Added fixed-stage DEBUG diagnostics for `START_PHONE_VERIFICATION`, `APP_VERIFICATION`, `CODE_SENT`, `CREDENTIAL_VERIFIED`, `FIREBASE_SIGN_IN`, `ID_TOKEN_FETCH`, `POP_EXCHANGE_REQUEST`, `POP_EXCHANGE_RESPONSE`, `POP_SESSION_SAVE`, and `AUTH_SETUP_RESOLVE`.
- Hardened Firebase Admin PEM normalization for both real line breaks and Railway-style literal `\n`.
- Added production environment validation without exposing the private key.
- Added an integration-style exchange route test proving the Android header/body contract produces the normal POP access/refresh session.
- Confirmed Firebase/FCM lifecycle failures remain non-authoritative after POP session persistence.

No OTP or token value is accepted by the diagnostics API.

## 3. Passkey failure root cause

The direct live blocker is confirmed:

- `https://pop.popwam.com/.well-known/assetlinks.json` currently returns `404 text/html`.
- The current local server environment does not explicitly configure `PASSKEY_ANDROID_ORIGINS`.

Android Credential Manager cannot establish the application/domain association until Digital Asset Links is live and the server accepts the reviewed Android APK origin. The Android Credential Manager request/response serialization and POP mobile-session issuance paths are otherwise in place. Passkey authentication does not create a Firebase user.

## 4. assetlinks fix

Added public `apps/web/public/.well-known/assetlinks.json` for:

- relation: `delegate_permission/common.get_login_creds`
- package: `com.popwam.pop.debug`
- SHA-256 certificate: `DB:02:C1:E8:0A:FE:AD:CD:E0:A0:F5:7E:4B:2B:9D:F2:85:89:77:92:29:BB:BF:1B:16:12:7E:81:14:1C:E5:30`

Next.js adds `application/json; charset=utf-8`, a short reviewed cache policy, no authentication, and no application redirect on the canonical host. Contract tests validate the exact JSON.

This is fixed in the local build only. The live URL remains 404 until deployment. No release fingerprint was invented; release association remains a separate release-readiness item.

## 5. RP ID status

- RP ID: `pop.popwam.com`
- Web origin: `https://pop.popwam.com`
- Android debug origin: `android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA`

Production validation now rejects a non-canonical RP ID/origin and rejects an empty or malformed Android-origin list. The legacy `app.popwam.com` reference remains only in the intentional canonical-host redirect policy.

## 6. Android API base status

Generated debug `BuildConfig` values:

- `APPLICATION_ID = "com.popwam.pop.debug"`
- `API_BASE_URL = "https://pop.popwam.com/"`
- `PUBLIC_BASE_URL = "https://go.popwam.com/"`

No `local.properties` or process-environment override changed the generated debug API base during validation. The manifest has `INTERNET`, HTTPS is used, cleartext traffic is disabled, and Retrofit uses this base for Firebase proof exchange and passkey challenge/verification.

## 7. Firebase Admin runtime status

The local Web runtime has a complete Firebase Admin credential set, its project ID matches Android, and the key is stored in an escaped-or-PEM form supported by the new normalizer. The production validator checks the normalized PEM shape without printing it.

Deployed Railway values were not read or changed, so deployed runtime readiness still requires normal deployment-time environment validation.

## 8. Same-user identity status

Firebase phone proof is resolved using the server-verified Firebase phone number, then matched to the authoritative POP phone fields. An existing phone maps to the existing `User.id`; a Firebase subject cannot create a second POP user for the same authoritative phone. Passkey authentication reads the existing POP passkey/user relation and issues the same POP mobile session authority. Firebase is not POP authorization.

Existing same-phone resolution tests pass.

## 9. READY navigation

Both Firebase OTP exchange and passkey verification persist the standard POP access/refresh session and then invoke the existing `AuthSetupResolver`. Complete accounts resolve to `READY`; genuinely incomplete accounts resolve to the exact legal/profile/passkey setup stage. Supplementary Firebase/FCM work cannot route a valid POP session back to Login.

## 10. User storage quota architecture

Effective storage limit precedence remains:

1. `UserLimitOverride.maxStorageBytes`
2. active `Plan.maxStorageBytes`
3. platform default `free` plan

The server calculates authoritative used bytes across uploaded documents and non-deleted profile media. File/media creation and replacement hold the user lock inside serializable transactions and check authoritative used storage plus incoming bytes (minus a replaced asset) against the effective numeric byte limit. Existing users need no backfill.

Admin forms display/edit MB while storing bytes. Usage displays MB/GB and remaining capacity.

## 11. User link quota architecture

Effective link limit uses the same override → active plan → platform-default precedence. Core identity/contact destinations do not consume the extra-link quota; additional social/custom/file destinations do.

Transactional user-row locking and authoritative counts protect Web editor links, Android destination creation, file-linked destinations, profile creation, and connected-account link import. Clients never supply the authoritative current count.

## 12. Admin quota controls

Admin user detail now shows:

- storage used, effective limit, and remaining storage
- links used, effective limit, and remaining links
- effective plan/default source
- custom storage limit in MB
- custom link count
- explicit reset of storage/link overrides to inherited defaults

The existing Plan Admin remains the platform/tier authority, including the `free` platform default. Its storage editor now uses MB rather than raw human-entered byte strings.

## 13. Quota request flow

Added an additive `QuotaIncreaseRequest` workflow with:

- resources `MAX_STORAGE_BYTES` and `MAX_LINKS`
- statuses `PENDING`, `APPROVED`, and `REJECTED`
- user request history and idempotent pending-request behavior
- Admin review page and audited approve/reject actions
- approval applying the numeric per-user override transactionally
- Web/Android-bearer compatible `GET/POST /api/settings/quota`
- Android Usage & Limits screen with used/limit/remaining values and request status

This is POP user quota and is unrelated to Firebase SMS quota.

## 14. Language authority

English is the canonical source/default. A single existing `SystemSetting` key, `localization.runtime`, stores platform localization configuration; no second database authority was created.

The public pre-auth bootstrap returns only:

- `defaultLocale`
- enabled and published `availableLocales` with metadata
- `translationVersion`
- optional flat translation values

Bundled Android resource folders are fallback capability, not product availability.

## 15. Admin language management

Added `/admin/localization`. Authorized Admin can:

- view locale metadata and direction
- enable/disable additional locales
- publish/unpublish locales
- edit flat product translation-key JSON
- see the missing-source-key count
- select a published default locale
- publish a new translation version

English is forced enabled and published. Changes are audited.

## 16. Android language bootstrap

Android fetches `/api/localization/bootstrap` during the cold splash, validates/cache-stores the last valid configuration, and applies only server-published locales supported by the installed fallback resources. If refresh fails, the last valid cache is used. If no cache exists, the authority is English only.

Stored selections that are no longer published are reconciled to the configured default. Settings and the language-cycle action expose only the current authority list.

Static `strings.xml` remains the minimal offline/failure fallback while server translation values are cached for progressive product-copy adoption.

## 17. English-only behavior

With only English published:

`Appearance → Intro → Auth`

The Language screen is skipped. Device Arabic/French locale cannot enable or select an unpublished language, and RTL is not activated merely because the device locale is Arabic. With English + Arabic published, the screen shows exactly those two options.

## 18. Cairo/Latin typography

Typography is centralized in `PopwamTheme`:

- selected RTL Arabic locale → Cairo
- Latin locale → ABeeZee, the existing approved POP Latin font

Manual per-screen/server font selection no longer overrides script mapping. This applies across first launch, auth, OTP, authenticated navigation, and settings.

## 19. Theme persistence

The existing `AppearanceStore` remains the single Android appearance authority:

- `SYSTEM` follows device dark mode
- `LIGHT` remains light
- `DARK` remains dark

The selected value is persisted locally and remains active across navigation, process restart, first-launch-to-auth transition, login, and logout. Fresh first launch still displays the Appearance choice before Intro; the pre-choice splash/flow does not force a dark palette.

## 20. First-launch/auth spacing

Language (when present) and Appearance now use responsive vertically centered scrollable arrangements with safe drawing padding. Intro, phone login, and OTP retain centered, IME-safe, full-screen layouts. Touch targets and Compose theme tokens remain shared with the current product.

## 21. 3-second splash

Cold process launch is gated by `RuntimeLaunchViewModel` for approximately `3,000 ms`, including the localization refresh time. The ViewModel survives Activity recreation and starts only once for that process. The splash is not a navigation route and does not replay during normal in-app navigation.

## 22. 3-second transient feedback

Normal success/info snackbars and copied-to-clipboard toast feedback use the centralized `POP_TRANSIENT_FEEDBACK_MILLIS = 3_000L`. Blocking errors remain indefinite/user-dismissed. Confirmation dialogs, legal consent, and security confirmation were not made transient.

## 23. Migration YES/NO

Migration created: **YES**

`packages/db/prisma/migrations/20260726233000_priority_runtime_foundation/migration.sql`

It only adds quota request enums/table/indexes/foreign keys. It has no destructive operation and needs no legacy backfill.

Migration applied: **NO**

Read-only migration status before this change showed all 25 existing migrations applied. Final read-only status shows 26 known migrations with only `20260726233000_priority_runtime_foundation` pending.

## 24. Tests

- Database schema validate/type-check: PASS
- Web tests: PASS — 65 files, 338 tests
- Android `testDebugUnitTest`: PASS — 126 tests
- Firebase exchange route integration contract: PASS
- Firebase Admin escaped-key parsing: PASS
- same-phone identity policy: PASS
- Android passkey/session/Firebase/FCM independence tests: PASS
- assetlinks contract: PASS
- quota precedence/reset/request policy: PASS
- English-only/multi-language/disabled-locale/RTL policy: PASS
- script typography/splash/transient policy contracts: PASS
- `pnpm i18n:audit`: PASS — 713 Web keys, 739 Android keys, 0 hardcoded candidates; 14 pre-existing possibly-unused Web keys reported as warnings

No live Firebase request and no emulator were used.

## 25. Builds

- `pnpm --filter @popwam/db lint`: PASS
- `pnpm --filter ./apps/web lint`: PASS
- `pnpm --filter ./apps/web build`: PASS; route manifest includes Firebase exchange, localization bootstrap, and quota API
- Android `assembleDebug`: PASS
- Android `lintDebug`: PASS

The repository's zero-byte `apps/android/gradlew.bat` was repaired so the required Windows commands now execute the Android build instead of returning immediately.

## 26. Deployment requirements

Deploy required: **YES**. Do not deploy until explicitly approved.

Required ordered release action:

1. Review and explicitly approve applying `20260726233000_priority_runtime_foundation`.
2. Configure/confirm server environment:
   - `PASSKEY_RP_ID=pop.popwam.com`
   - `PASSKEY_ORIGIN=https://pop.popwam.com`
   - `PASSKEY_ANDROID_ORIGINS=android:apk-key-hash:2wLB6Ar-rc3goPV-Syud8oWJd5Ipu78bFhJ-gRQc5TA`
   - complete, matching Firebase Admin variables
3. Run production environment validation.
4. Deploy the tested Web/backend build.
5. Verify the live assetlinks response is `200`, JSON, unredirected and unauthenticated; verify localization bootstrap is `200`.
6. Only if device DEBUG telemetry stops at `APP_VERIFICATION`, manually review Firebase Console phone provider/debug certificate registration. Do not change Console speculatively.

The live pre-deployment checks remain:

- assetlinks: `404 text/html`
- localization bootstrap: `404 text/html`
- Firebase exchange route: present (`GET` is `405`)
- passkey options route: present (`GET` is `405`)

## 27. APK path

`E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`

Size at validation: 53,011,823 bytes.

The APK was **not installed automatically**.

## 28. Remaining physical test steps

`adb devices -l` currently returns no connected device, so no physical OTP/passkey test was run.

After migration approval, environment configuration, and deployment:

1. Reconnect and authorize the physical phone; confirm exactly one authorized device with `adb devices -l`.
2. Manually install the APK.
3. Test Firebase OTP and capture only `PopAuthRuntime` stage/outcome lines if it fails.
4. Confirm the same account reaches `READY/Home`.
5. Test Android returning-user passkey login and phone fallback.
6. Test English-only first launch, then enable/publish Arabic in Admin and verify the exact two-language flow and RTL only after Arabic selection.
7. Verify System/Light/Dark continuity, 3-second cold splash, quota usage/request display, and Admin approval.

No production mutation, deployment, APK installation, emulator, AVD, QEMU, push, commit, or git staging occurred during this task.
