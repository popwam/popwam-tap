# 1. Executive Summary

POP Android phone ownership verification now uses the official Firebase Phone Authentication SDK. The resulting Firebase ID token is sent once to a dedicated POP proof-exchange endpoint; the backend verifies it with Firebase Admin, derives the authoritative phone from the Firebase user record, resolves the canonical PostgreSQL `User.id`, links the supplementary Firebase `ExternalIdentity`, and issues the existing POP access/rotating-refresh session.

The former SMS Masr adapter, configuration, validation, admin test UI, and tests have been removed. Unauthenticated Android/Web legacy phone-OTP routes are inert and cannot send through the old provider. Automatic anonymous Firebase startup was removed from Android and Web.

Local automated validation is green: Android 120/120 tests, Android debug assembly, Android lint, 325/325 Web/backend tests, Web TypeScript lint, Web production build, Prisma generation/validation/type-checking, and i18n audit all pass.

Operational status is **implementation complete, live runtime pending**. Firebase Console settings were not changed, migrations were not applied, the backend was not deployed, and `adb devices -l` showed no attached device at final validation. The APK was built but not installed.

# 2. Existing Authentication Audit

Classification:

| Area | Decision | Result |
|---|---|---|
| POP `User.id` and profile ownership | KEEP | Remains canonical |
| POP mobile access/refresh sessions | KEEP | Reused after Firebase proof |
| Android Credential Manager/passkeys | KEEP | Returning-user option remains before phone fallback |
| FCM/Analytics/Crashlytics | KEEP, supplementary | Failures do not authorize or invalidate POP sessions |
| Firebase `ExternalIdentity` | KEEP | Supplementary provider identity only |
| Firebase anonymous startup | DELETE | Removed from Android/Web runtime |
| Firebase guest/link routes | DEPRECATE | Inert HTTP 410 compatibility tombstones |
| SMS Masr adapter/config | DELETE | Removed |
| Unauthenticated server SMS login | REPLACE | Android replaced by Firebase; Web gated |
| Generic server OTP delivery | COMPATIBILITY ONLY | Disabled by default; retained for separate security step-up/phone-change flows |
| `OtpChallenge` schema | COMPATIBILITY ONLY | Not used by Firebase phone sign-in |

The previous Android login relied on POP server OTP routes. Firebase was initialized separately and guest startup could sign in anonymously. The new flow has one phone-verification authority and one POP session authority.

# 3. SMS Masr Removal

Removed:

- SMS Masr provider implementation and provider tests.
- SMS Masr environment variables from `.env.example`.
- SMS Masr production-environment validation.
- Provider-specific runtime/config parsing and country behavior.
- Admin SMS provider test form/actions and provider-specific status copy.
- Active Android and Web login use of server SMS OTP.

The generic disabled-by-default SMS compatibility layer remains only for Phase H security step-up/account phone-change workflows. It contains no SMS Masr endpoint, credential name, sender mapping, or fallback.

Immutable migration `20260714120000_smsmisr_otp_observability` is preserved as historical migration history and is not an active provider implementation.

# 4. Firebase Duplicate User Root Cause

The code-level root cause of the approximately three observed Firebase Authentication users was automatic anonymous authentication:

- Android startup previously executed `auth.currentUser ?: auth.signInAnonymously()` from the application startup path.
- Web root bootstrap also called `signInAnonymously()`.
- Clearing app data/reinstalling removed the local anonymous session; the next launch created another disposable anonymous Firebase user.

That behavior directly explains a new Firebase Auth record per cleared/reinstalled test cycle. It was not evidence that Firebase Phone Auth created three canonical phone users.

No Firebase Console or database was accessed. Therefore the provider classification of each existing Console row and whether each has an `ExternalIdentity`/POP row cannot be asserted from local code. Those rows must be inspected manually before cleanup.

# 5. Anonymous Authentication Audit

An active-source scan of Android main code and Web source finds zero `signInAnonymously` or `isAnonymous` calls. Android `TapApplication` initializes POP session/FCM lifecycle only. Firebase initialization alone does not create an Auth user.

The two old Firebase guest API paths remain only as no-store HTTP 410 tombstones:

- `/api/firebase/guest` → `FIREBASE_ANONYMOUS_AUTH_RETIRED`
- `/api/firebase/link-pop-user` → `FIREBASE_PHONE_PROOF_EXCHANGE_REQUIRED`

They create, link, or authorize nothing.

# 6. Anonymous Authentication Removal/Retention Decision

Decision: **remove anonymous Firebase Authentication from normal runtime**.

No current POP feature requires a disposable Firebase Auth identity merely to open the app or browse public content. POP auth, profiles, public pages, FCM, and analytics do not require anonymous Auth. Existing unlinked legacy identity records may be associated only during a verified, consistency-checked phone resolution; they are not account authority.

# 7. Firebase Phone Auth Architecture

```text
Country + national number
  → libphonenumber E.164
  → Firebase PhoneAuthProvider.verifyPhoneNumber
  → automatic credential OR six-digit manual credential
  → FirebaseAuth.signInWithCredential
  → short-lived Firebase ID token
  → POST /api/mobile/auth/firebase/phone/exchange
  → Firebase Admin verification + server Firebase user lookup
  → canonical POP phone/User resolution
  → supplementary ExternalIdentity link
  → existing POP access + rotating refresh session
  → existing AuthSetupResolver
```

The Firebase token is proof for this exchange only. It is not stored in the POP session store and is not accepted by ordinary POP APIs.

# 8. Firebase App Verification

The Android gateway uses the official `PhoneAuthProvider.verifyPhoneNumber` callbacks:

- `onVerificationCompleted`
- `onVerificationFailed`
- `onCodeSent`
- `onCodeAutoRetrievalTimeOut`

It supplies the current `ComponentActivity`, so Firebase can use Play Integrity where available and the supported reCAPTCHA fallback when needed. The source does not call `setAppVerificationDisabledForTesting`, and no test-phone bypass is present in normal runtime.

Firebase App Check is independent and is not required or enforced by this implementation.

# 9. Firebase Console Requirements

Before physical testing, manually verify in project `pop-by-popwam`:

1. Authentication → Sign-in method → Phone is enabled.
2. Android app `com.popwam.pop.debug` exists.
3. The exact debug SHA-1 and SHA-256 in section 10 are registered on that app entry.
4. Phone Authentication SMS region policy allows the test country.
5. Project quota/billing is sufficient for a real verification SMS.
6. If fingerprints or app registration are changed, download the refreshed `google-services.json` and replace the local file through normal secret/config handling.

Repository inspection cannot prove these Console settings. No Console change was made.

# 10. Debug SHA-1 / SHA-256

Actual `signingReport` values for the debug keystore/variant used by package `com.popwam.pop.debug`:

- SHA-1: `09:29:AB:89:CA:00:40:F9:95:4A:6D:44:2B:49:06:EC:8F:EB:8B:89`
- SHA-256: `DB:02:C1:E8:0A:FE:AD:CD:E0:A0:F5:7E:4B:2B:9D:F2:85:89:77:92:29:BB:BF:1B:16:12:7E:81:14:1C:E5:30`

Register both against the Firebase Android app entry whose package is exactly `com.popwam.pop.debug`, not only `com.popwam.pop`.

# 11. google-services.json / Project Consistency

Local safe parsing confirmed:

- Firebase project ID: `pop-by-popwam`
- Android clients include `com.popwam.pop` and `com.popwam.pop.debug`.
- Local backend Firebase Admin project ID matches the Android project ID.
- Local backend Admin project/email/private-key variables are present; values and credentials were not printed.

Project mismatch found: **NO**.

# 12. Android Phone Verification Flow

`FirebasePhoneAuthGateway` starts verification only after an explicit user action. `AuthViewModel` receives provider callbacks, handles manual/automatic verification, exchanges the transient proof, stores only the returned POP tokens, and continues through the existing authenticated setup resolver.

Passkey remains the first returning-user action where Credential Manager supports it, with phone verification as fallback.

# 13. Firebase Proof Exchange

New Node.js route:

`POST /api/mobile/auth/firebase/phone/exchange`

Transport:

- Firebase proof is supplied in the dedicated `X-Firebase-Id-Token` header.
- Request body accepts only an optional bounded device label.
- It does not accept phone, Firebase UID, POP user ID, role, ownership, or `verified=true`.
- Responses use `Cache-Control: no-store`.

Rate limits:

- Network scope: 12 requests/minute.
- Hashed verified Firebase-subject scope: 6 requests/minute.

The route returns the established POP mobile authentication response.

# 14. Firebase Admin Verification

The backend uses the official Firebase Admin SDK:

1. `verifyIdToken(token, true)` verifies the token and checks revocation.
2. Admin SDK configuration validates signature, issuer, audience/project, and expiry.
3. The verified claim must have `sign_in_provider = phone`.
4. `auth.getUser(claims.uid)` obtains the server-authoritative Firebase user record.
5. `user.phoneNumber` must be present.

Missing, malformed, non-phone, revoked, and invalid proofs fail closed. Tokens and Admin credentials are never logged.

# 15. Canonical Phone Resolution

The server normalizes and validates the Admin-derived phone as canonical E.164, then resolves:

- `ExternalIdentity(provider=FIREBASE, providerSubject=firebaseUid)`
- existing user by `phoneE164` or legacy canonical `phone`
- the user currently linked to the external identity

Consistent ownership reuses the existing user. A user is created only if neither phone ownership nor identity ownership exists. A Firebase-UID/phone-owner mismatch returns an account conflict and never merges or transfers ownership automatically.

The transaction uses serializable isolation. Prisma `P2002` uniqueness and `P2034` serialization conflicts are retried up to three attempts.

# 16. POP User Identity Stability

`User.id` remains the account identifier for profiles, friendships, sessions, products, business ownership, and all normal authorization. The invariant is:

`same authoritative E.164 phone → same POP User.id`

Logout, Firebase local sign-out, app-data clear, reinstall, device change, or installation metadata change do not alter phone ownership. A safe new Firebase UID with the same verified phone attaches to the existing POP user; an unsafe conflict fails closed.

# 17. ExternalIdentity

Firebase is stored as a supplementary relationship:

`ExternalIdentity(provider=FIREBASE, providerSubject=<Firebase UID>, userId=<POP User.id>)`

The existing unique provider/subject constraint is retained. Active linked identities are touched on login; safe unlinked legacy identities can be linked; revoked or inconsistent identities fail closed. Firebase UID never replaces any POP primary/foreign key.

# 18. Device Installation Identity

No hardware or stable cross-install identifier is used. The audited Phase H session design does not need a client installation ID for authentication:

- Each new login creates a server-generated random refresh family/device session.
- Manufacturer/model is only a bounded human-readable device label.
- App-data clear/reinstall naturally creates another session after reauthentication.
- The verified phone still resolves the same POP user.

No extra installation identifier or schema was introduced.

# 19. Device / Session Model

`DeviceSession` is owned by a POP user and keyed by a unique hash of a cryptographically random server-generated refresh family. Access tokens are short-lived; refresh tokens rotate and are stored hashed server-side. Each phone/device may have a separate revocable session while sharing the same canonical POP account.

POP logout revokes/clears the POP session, then signs out local Firebase Auth as cleanup. POP session validity never depends on Firebase `currentUser`.

# 20. Repeat Login Identity Test

Pure identity-policy tests cover:

- first login creates only when no canonical user exists;
- second login uses the same POP user;
- same phone after POP logout;
- same phone after Firebase sign-out;
- another installation;
- app-data reset;
- reinstall;
- changed installation metadata;
- safe new Firebase UID with the same phone;
- different verified phone;
- UID/phone ownership conflict;
- retry classification for unique/serializable races.

These tests pass. No live database integration/concurrency test was run because migrations were intentionally not applied and no remote database was touched.

# 21. POP Mobile Session

After successful resolution, the server calls the existing `issueMobileSession` implementation. Android saves only the returned POP access token, rotating refresh token, POP user ID, and role. Firebase proof is neither persisted in `SecureSessionStore` nor used for later API calls.

FCM and analytics lifecycle hooks run after POP session acceptance and are non-fatal.

# 22. OTP Six-Digit UX

The native Compose OTP presentation is a centered full-screen state with:

- exactly six visible digit slots;
- one underlying numeric password input;
- digit filtering and six-character limit;
- native paste/backspace behavior;
- masked phone context;
- verify action enabled only for six digits;
- change-number action.

The code itself is never logged or sent to POP; only Firebase receives the credential.

# 23. Firebase Automatic Verification

`onVerificationCompleted` signs in with the returned `PhoneAuthCredential`, retrieves a fresh ID token, exchanges it with POP, and continues without requiring manual code entry. Analytics records only `outcome=automatic`.

# 24. Resend

The SDK `ForceResendingToken` is retained in memory for the active verification generation. Resend is gated by a 60-second UI countdown and uses `setForceResendingToken`. Missing/expired resend state fails safely and asks the user to restart verification.

# 25. Error Handling

Localized safe categories cover:

- invalid phone;
- invalid code;
- expired session;
- throttling/too many requests;
- network failure;
- app verification failure;
- reCAPTCHA failure;
- missing activity;
- quota/configuration;
- backend exchange failure;
- identity conflict;
- temporary unavailability.

No error surface includes raw token, verification ID, OTP, Firebase UID, or full phone.

# 26. Country Picker / E.164

The existing full metadata/libphonenumber implementation remains:

- searchable country list;
- localized country name, flag representation, and calling code;
- changeable default selection;
- national-number input;
- canonical E.164 normalization before Firebase verification;
- no Egypt-only behavior and no citizenship inference.

# 27. Auth / OTP Layout

Phone and OTP screens now use full-height centered Compose layouts with safe drawing insets, IME padding, bounded width, large actions, and vertically balanced content. The phone screen keeps POP branding, passkey-first returning entry, country selector, phone field, and native legal/help actions.

# 28. Header / Back Navigation

Authenticated root destinations are `home`, `share`, and `menu`. Their top bar has no navigation icon. Genuine child destinations continue to use `popBackStack()` and their existing Back controls. OTP Back returns to phone input; the phone auth root cannot return to Intro.

# 29. System Back Behavior

A root-destination `BackHandler` consumes Back for Home/Share/Menu, preventing an unexpected immediate app termination. Modals retain their normal dismiss behavior. Child routes retain navigation-stack Back. Authentication root also consumes Back; OTP Back resets to phone entry.

# 30. Screenshot / Screen Recording Protection

`MainActivity.onCreate` applies `WindowManager.LayoutParams.FLAG_SECURE` globally before Compose content. It is not toggled by routes, so it covers pre-auth, OTP, setup, authenticated navigation, settings/security, and legal surfaces.

Limitations: this cannot prevent an external-camera photo and cannot promise protection on a compromised/rooted system. A physical screenshot attempt remains manual.

# 31. Web Auth Status

SMS Masr is no longer active on Web. The obsolete unauthenticated Web/mobile OTP send/verify routes return HTTP 410 and cannot send a code. The Web phone-entry and activation-phone surfaces are safely gated with a Firebase-phone migration notice.

Full Firebase Web Phone Auth/NextAuth cookie establishment is intentionally deferred because it is not required for the Android physical bring-up and needs browser reCAPTCHA/CSRF/session work. Existing passkey/NextAuth behavior remains. No broken SMS fallback is left active.

# 32. Privacy / Analytics / Logging

Android reuses the existing Firebase analytics wrapper and allows:

- `phone_auth_started`
- `phone_auth_code_sent`
- `phone_auth_verified`
- `phone_auth_failed`
- `phone_auth_resend`

Properties are restricted to platform/provider/outcome category. Raw phone, OTP, verification ID, Firebase UID, Firebase token, POP user ID, and credentials are excluded.

The server audit record stores only the operation, provider, and whether a POP user was newly created. It stores no proof or OTP.

# 33. Security Review

- [x] SMS Masr no longer active.
- [x] Firebase Phone Auth is current Android phone provider.
- [x] No automatic anonymous Auth startup.
- [x] Same phone deterministically resolves the same POP user.
- [x] Firebase UID is supplementary; POP `User.id` is canonical.
- [x] Client cannot assert the verified phone/UID/user/role.
- [x] Firebase proof is verified server-side and never becomes a POP bearer.
- [x] Standard POP session is issued only after proof verification.
- [x] Unique constraints, serializable transaction, and retries protect races.
- [x] Ownership conflicts fail closed.
- [x] Firebase phone OTP is not stored or logged by POP.
- [x] Firebase proof and full phone are excluded from analytics/logs.
- [x] No app-verification bypass.
- [x] No MAC/IMEI/serial/hardware identity.
- [x] Device session remains distinct from account.
- [x] Root Back/header policy is enforced.
- [x] Global `FLAG_SECURE` is configured.
- [x] Android/backend Firebase project consistency checked.

# 34. Firebase Test User Cleanup Plan

Do not delete anything until each Console user is inspected:

1. In Firebase Authentication, record each candidate UID, provider (`anonymous`, `phone`, or other), creation time, and last sign-in.
2. In an explicitly approved non-production/production-safe database inspection, check `ExternalIdentity(provider=FIREBASE, providerSubject=UID)` and its linked POP user.
3. Check whether the linked POP user owns profiles, sessions, friendships, products, or business data.
4. Preserve every phone-provider identity and every referenced identity unless an approved account-resolution process says otherwise.
5. Only orphaned anonymous test identities with no `ExternalIdentity` and no product data are cleanup candidates.
6. Delete candidates manually in small reviewed batches and record the action.

No Firebase user, POP user, external identity, or session was deleted here.

# 35. Prisma Schema / Migration

No schema change was needed. Existing constraints are sufficient:

- `User.phoneE164 @unique`
- `ExternalIdentity @@unique([provider, providerSubject])`
- existing `DeviceSession`/mobile refresh models

`MIGRATION CREATED: NO`

`MIGRATION APPLIED: NO`

# 36. Full Unapplied Migration Inventory

Based on the actual migration directory and prior phase reports that explicitly state they were not applied, the known pending sequence is:

1. `20260721190000_global_identity_integrations`
2. `20260723153000_firebase_external_identity_foundation`
3. `20260725003000_profile_phase_b_foundation`
4. `20260725143000_mobile_passkey_challenge_purpose`
5. `20260725200000_dynamic_onboarding_engine`
6. `20260725233000_profile_publishing_foundation`
7. `20260726003000_share_activation_scratch_security`
8. `20260726040000_security_settings_step_up`
9. `20260726120000_friends_privacy_abuse_foundation`
10. `20260726210000_nearby_privacy_presence_foundation`

No live `prisma migrate status` was run because that would connect to the configured database. The target database's actual migration table must be checked later in an explicitly approved environment; this report does not guess remote state.

# 37. Staging Database Readiness

Before any database command:

1. Identify the exact `DATABASE_URL` host/database/environment without printing credentials.
2. Confirm it is the intended isolated staging database, not production.
3. Confirm backup/restore coverage.
4. Run `pnpm --filter @popwam/db prisma migrate status`.
5. Review the pending SQL in the order listed above.
6. Run `pnpm db:generate` and `pnpm --filter @popwam/db lint`.
7. Apply only through the approved staging process.
8. Run required controlled seeds/backfill dry-runs, including onboarding definitions and legal-document readiness, after their schemas exist.
9. Validate duplicate-phone/identity conflicts before production promotion.

No database connection or mutation occurred in this task.

# 38. Railway / Web Deployment Readiness

Repository deployment configuration is internally consistent:

- RAILPACK build: `pnpm build`
- Pre-deploy: `pnpm validate:production-env && pnpm db:deploy`
- Start: `pnpm start`
- Health check: `/health`
- App/API/auth/admin host: `pop.popwam.com`
- Public profile/store/file host: `go.popwam.com`

Critical caution: Railway's pre-deploy command automatically runs `pnpm db:deploy`. A deployment must not be started until the migration inventory and database target are approved.

Deployment prerequisites include the standard Web/DB/R2/session values plus matching Firebase Admin `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY`. The proof-exchange endpoint must be deployed before the new APK can complete login against its default `https://pop.popwam.com/` API base.

No Railway or deployment action occurred.

# 39. Settings Runtime Readiness

The authenticated state still resolves through the existing setup coordinator to READY, then Home → Menu → Settings. Settings, nested settings routes, sessions/devices, security, passkeys, legal routes, and Web dashboard settings compile in both Android and the Next.js production build.

This is compile/contract readiness, not a claim of live runtime success. Physical navigation requires the approved database/backend bring-up and a successful real-device authentication.

# 40. Android Automated Tests

Command:

`apps/android/gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true`

Result: **PASS — 120 tests, 0 failures, 0 errors, 0 skipped across 26 suites**.

Coverage added/updated includes Firebase error mapping, official callback/resend/static bypass contract, anonymous-startup removal, Firebase-proof-only session persistence, POP/FCM independence, same-phone policy, country/E.164, passkey fallback, six-digit OTP contract, root/child Back policy, and global secure-window configuration.

No live SMS, Firebase, emulator, AVD, or QEMU was used.

# 41. Web / Backend Tests

Command:

`pnpm --filter ./apps/web test`

Result: **PASS — 61 files, 325 tests**.

Firebase tests cover server proof validation, phone-provider requirement, Admin-derived phone, canonical resolution/repeat-login matrix, safe new UID, conflict failure, race retry policy, POP-session boundary, no client phone assertion, no Firebase OTP persistence, and privacy-safe analytics.

Prisma:

- `pnpm db:generate` — PASS
- `pnpm --filter @popwam/db lint` — PASS; schema valid and TypeScript clean

# 42. Build / Lint

- Android `assembleDebug` with Firebase enabled — **PASS**
- Android `lintDebug` with Firebase enabled — **PASS**
- Android `signingReport` — **PASS**
- Web `lint` (`tsc --noEmit`) — **PASS**
- Web production `next build` — **PASS**, 165 pages generated/compiled
- `pnpm i18n:audit` — **PASS**: 713 Web keys, 729 Android keys, zero hardcoded candidates; 14 pre-existing possibly-unused Web-key warnings
- `git diff --check` — no whitespace errors; only Git line-ending conversion warnings in the dirty Windows worktree

# 43. SMS Masr Final Repository Scan

A case-insensitive scan for `SMSMASR`, `SMS_MASR`, `smsmasr`, `sms masr`, and `smsmisr` across active source/config/tests returned zero matches.

The only intentionally retained reference is the immutable historical migration directory name `20260714120000_smsmisr_otp_observability`, which is not runtime code and was not rewritten.

# 44. Real Device / ADB Status

Final command:

`adb devices -l`

Result: no devices were listed. The previously described Motorola moto g85 5G was not attached/authorized at final validation.

Therefore:

- real Firebase SMS was not sent;
- automatic/manual phone verification was not exercised;
- same-phone live repeat login was not exercised;
- Settings was not opened after live auth;
- physical screenshot blocking was not attempted.

# 45. APK

Actual artifact:

`E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`

Size: 52,986,399 bytes.

SHA-256: `821E19B4155CFCF2DB5933E0C968E7B614E821E483E8B00352229ECECB74980D`

The APK was **not installed automatically**.

# 46. Remaining Manual Runtime Steps

Required sequence:

1. Verify Firebase Console Phone provider, debug app, SHA-1/SHA-256, test-country SMS region policy, and quota.
2. Inspect the duplicate Firebase users and their database references; do not delete yet.
3. Approve a known staging database, check migration status, review/apply the pending migration sequence, and run required seed/readiness checks.
4. Deploy the reviewed Web/backend build only through the later approved process so the new exchange endpoint exists at the Android API origin.
5. Reconnect and authorize exactly the Motorola test phone; verify with `adb devices -l`.
6. Manually install the built APK only after the prior steps.
7. Exercise automatic and manual Firebase phone verification, invalid/resend/error cases, logout/re-login, app-data clear/reinstall, and confirm the same POP `User.id`.
8. Open Menu → Settings and nested security/session pages.
9. Attempt a physical screenshot/screen recording and confirm Android blocks it.

# 47. Next Localization/Typography Runtime Fix

Preserved for the next dedicated task:

- English must be the canonical/default product language.
- Additional enabled languages must come from platform/admin policy; bundled Arabic/French resources alone must not imply enablement.
- Cairo must be used for Arabic UI.
- The approved POP Latin font must be used for Latin scripts.
- First-launch spacing/typography still needs physical-device refinement.

This auth task preserves the existing English/Arabic/French resources and direction behavior without expanding into that architecture redesign.
