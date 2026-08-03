# Phase 4 authentication and security enrollment

## Scope and architecture

Phase 4 adds a feature-scoped Kotlin Multiplatform `authentication` module and keeps the existing Android application as the host. The shared coordinator owns immutable Phone, Country, OTP, Verified, passkey, biometric, Account Created, recovery, and native-operation state. Android supplies Firebase Phone Auth, Credential Manager, BiometricPrompt, Android Keystore, Phone Number Hint, and encrypted persistence. Only Phase 4 endpoints use the new Ktor client; unrelated Retrofit services remain unchanged.

The backend is authoritative. Every response carries typed account state, allowed and preferred methods, OTP policy, passkey requirement, biometric policy, session scope, next action, and expiry. The client may offer a fallback only when the current server challenge allows it.

## Server flow and session scopes

The version 2 flow is:

1. `POST /api/mobile/auth/challenge` creates one current, expiring challenge for the HMAC-hashed phone identity.
2. Firebase verifies phone ownership. `POST /api/mobile/auth/firebase/phone/exchange` binds that proof to the challenge.
3. A returning user receives a full session only after an allowed passkey, device-credential, or phone proof succeeds.
4. A new user receives only a restricted enrollment token and `ENROLL_PASSKEY`.
5. The enrollment routes issue and consume a one-time WebAuthn registration challenge, then require a device-capability/binding result.
6. `POST /api/mobile/auth/enrollment/complete` atomically consumes the enrollment, issues the full rotating session, links the device credential, and returns `PROFILE_SETUP`.
7. Account Created is shown only after the Android encrypted store commits the returned full session.

Restricted credentials use `Authorization: Enrollment …`. Normal middleware accepts only a valid access Bearer token, so the restricted token cannot authorize Home, profile, sharing, NFC, Settings, or arbitrary authenticated endpoints. Enrollment expiry, abort, completed replay, challenge replay, and invalid state transitions fail closed. Completion uses a 32–128 character client idempotency key and supports a five-minute lost-response recovery window; an earlier refresh token for that device session is revoked before a replacement is issued.

The additive Prisma migration is `20260803120000_mobile_auth_contract_v2`. It adds typed challenge/enrollment/device-credential records, passkey challenge enrollment binding, completion recovery metadata, and a device-credential authentication method. Production must apply this migration before enabling contract v2.

## Phone, Country, and OTP

Phone input is normalized through libphonenumber to E.164; parser failures are mapped to typed UI errors. Country options come from the offline libphonenumber region set and the existing optional product configuration. Search covers localized display names, ISO codes, calling codes, and diacritic-insensitive matching. French product support remains present even though the approved Phase 4 Figma frames provide only English and Arabic.

Android Phone Number Hint uses the explicit Google system selection surface and passes the result through the same parser. Phase 4 adds no `READ_PHONE_STATE`, `READ_PHONE_NUMBERS`, `READ_SMS`, or contacts permission. Cancellation, no result, and unavailability leave the editable field unchanged.

The OTP bottom sheet is owned by the shared OverlayCoordinator. Length, expiry, resend delay, maximum displayed attempts, and auto-submit policy come from the backend challenge. The Firebase provider enforces real SMS code validity, resend/quota behavior, and provider abuse controls; POP also rate-limits challenge/exchange endpoints. The verification ID and typed challenge may be encrypted for process restoration, but the entered OTP is never persisted.

## Passkeys

Credential Manager renders all Android passkey selection and creation UI. The server binds registration to the restricted enrollment session and a one-time challenge; it verifies expected challenge, approved mobile origins, RP ID, user verification, credential uniqueness, and stores only public credential data. Authentication assertions use the existing counter-aware verification and, for contract v2, consume the matching typed mobile challenge transactionally. Private keys remain in the platform credential provider.

New users have no Skip or Not Now path. Cancellation and recoverable native errors remain on the passkey step. A returning-user phone fallback is enabled only when `PHONE_OTP` is in the current unauthenticated challenge.

## Biometrics and the POP device credential

Biometrics locally authorize use of a POP device credential; they are not remote identity proof. Android creates a P-256 key in Android Keystore and submits an ES256 possession proof over a server nonce. When a strong biometric is available, each signature requires a BiometricPrompt `CryptoObject`, and the key is invalidated when biometric enrollment changes. The backend stores the public SPKI key, stable public-key-derived credential ID, categorical biometric type, status, and device-session link. It never receives a fingerprint, face image, template, raw sensor data, or private key.

Capability is typed as unavailable, not enrolled, fingerprint, face, generic biometric, temporary lockout, permanent lockout, or security-update-required. A device with hardware but no enrollment is directed to system settings and rechecked on activity resume. Temporary and permanent recovery states are not treated as hardware absence. The app-owned explanation follows Figma; authentication and enrollment prompts remain native system UI.

When Android reports no strong biometric hardware, passkey enrollment remains mandatory and the app creates a non-biometric Keystore possession key to bind the device and report the `UNAVAILABLE` policy outcome. This outcome is a signed client capability assertion, not independently attested proof that hardware is absent. Stronger remote assurance would require a separately approved device-attestation policy and external console configuration.

Revoking a device session also revokes its linked device credential. Biometric enrollment changes invalidate the protected key and force passkey or OTP recovery. App uninstall removes local keys and encrypted tokens; the server record then cannot be used without its private key. Removing the secure device lock can invalidate or make the key unusable according to Android Keystore policy. A revoked/expired local credential never counts as identity proof and falls back only to server-approved passkey or phone methods.

## Persistence, recovery, navigation, and deep links

`SecureSessionStore` keeps full sessions, restricted enrollment tokens, restoration metadata, and the completion idempotency key inside one AES-GCM record whose key is held by Android Keystore. Restricted and full credentials are mutually exclusive. Full-session commit writes the new access/refresh session and clears restricted/restoration/completion data in the same encrypted DataStore update. Legacy encrypted session data remains readable through the existing migration boundary. The existing refresh mutex and unrelated refresh behavior are unchanged.

OTP digits, native passkey responses, device private keys, and biometric data are not placed in DataStore, SavedState, logs, or analytics. On process restart, a restricted token is reconciled with `/enrollment/status`; an incomplete OTP may restore its provider verification handle but never its code.

Phase 3 launch state remains the owner of the validated pending destination and is not cleared during authentication. Returning users can continue after full authentication according to the existing host handoff. New users receive a one-shot typed `ProfileSetup(BASIC_IDENTITY)` handoff after Account Created; Phase 4 does not render Profile Setup and does not consume the pending destination. Phase 5 must complete profile requirements before consuming any protected pending destination.

Back closes Country or returns from OTP to editable Phone. Mandatory passkey and biometric stages do not navigate backward into authenticated content. Native callbacks, server verification, completion, and Profile Setup navigation each have duplicate guards.

## Figma authority and visual assumptions

The local source audited for this phase was `POP by POPWAM.fig`, SHA-256 `0B9863EA89FDB23A3F9B64282C85A75F3E13449126D72AA5055F749FADD63CB0`. Approved English nodes were Phone `0:2550`, Country `0:2567`, OTP `0:2594`, Verified `0:2625`, Setup Passkey `0:2651`, Setup Fingerprint `0:2708`, and Account Created `0:2736`. Arabic equivalents were `0:2748`, `0:2765`, `0:2792`, `0:2823`, `0:2848`, `0:2905`, and `0:2933`; sheet references included OTP `0:3388`, Verified `0:3441`, face `0:3457`, and fingerprint `0:3496`.

The reference canvas is 393×852 with `#EEF3F2` backgrounds. English uses Montserrat and Arabic uses Cairo through the shared semantic theme. The earlier ABeeZee-to-Montserrat change is an intentional controlled visual migration affecting existing English screens, not a claim of unchanged production presentation.

The exact approved POP logo path is drawn as a shared Compose vector/Canvas path. Security, back, passkey, check, and biometric glyphs are shared code vectors to avoid unsupported runtime SVG loading. Their hierarchy, size, and color follow the approved screens, but the parser did not expose every original glyph path; those small glyphs require final overlay review against Figma. Native Credential Manager and BiometricPrompt surfaces cannot and must not match custom Figma sheets. Passkey text was minimally adjusted where needed to avoid an unconditional credential-sync promise. No prototype motion specification was present, so transitions remain restrained system/Compose sheet behavior rather than a pixel-perfect motion claim.

## Android and iOS boundaries

Android uses a feature-scoped `AuthenticationFlowViewModel`; the legacy oversized MainViewModel receives only the already-issued full session through a small compatibility bridge. No new DI or navigation framework was introduced. No Phone, Profile Setup, Home, Profile, Share, NFC/HCE, or Settings feature was migrated to Ktor.

The shared module registers `iosArm64`, `iosSimulatorArm64`, and `PopAuthenticationKit` XCFramework tasks and defines future passkey, biometric, secure-storage, phone-hint, settings, and telephone-semantics contracts. Windows cannot validate AuthenticationServices, LocalAuthentication, Keychain access groups, `NSFaceIDUsageDescription`, Associated Domains, APNs/Firebase phone setup, signing, archives, or device behavior. Those require implementation and verification on macOS before any iOS production claim.

## External configuration

- Set a strong, distinct `MOBILE_ENROLLMENT_SECRET`; production environment validation rejects missing, weak, or duplicated secrets.
- Apply the Prisma migration and regenerate the database client.
- Configure `PASSKEY_RP_ID`, allowed Android/mobile origins, the production Credential Manager association, and `https://pop.popwam.com/.well-known/assetlinks.json` for the release signing certificate.
- Enable and configure Firebase Phone Auth for the production Android application. The repository keeps the development Firebase client behind `-Ppopwam.firebase.android.enabled=true`; production SHA fingerprints, quotas, abuse policy, and SMS regions require console access.
- Perform manual isolated QA on a real device for OTP delivery, passkey creation/assertion, fingerprint/face prompt, no-enrollment settings return, lockout, enrollment-change invalidation, offline retry, and app-reinstall recovery.

## Rollback

Disable contract v2 at the mobile rollout boundary and return clients to the existing v1 route while retaining the additive database tables. Revoke active enrollment records/tokens and drain in-flight completions before removing server routes. On Android, revert the AuthenticationHost/MainActivity wiring and authentication-module dependency; the legacy authentication implementation was retained for rollback. Do not roll back the additive migration destructively while records or passkey/device references exist.

## Verification commands

From the repository root, the shared wrapper command must use `-p ..\mobile` because the Windows wrapper first changes into `apps/android`:

```powershell
.\apps\android\gradlew.bat -p ..\mobile :foundation:testDebugUnitTest :design-system:testDebugUnitTest :onboarding:testDebugUnitTest :authentication:testDebugUnitTest
pnpm db:generate
pnpm --filter @popwam/db lint
pnpm --filter @popwam/web lint
pnpm --filter @popwam/web test -- --run src/lib/mobile-auth-contract-v2.test.ts src/lib/mobile-device-binding.test.ts src/lib/mobile-enrollment-policy.test.ts src/lib/mobile-auth.test.ts src/lib/mobile-auth-revocation.test.ts src/lib/firebase/phone-exchange-route.test.ts
Push-Location apps\android
.\gradlew.bat testDebugUnitTest compileDebugAndroidTestKotlin lintDebug assembleDebug
.\gradlew.bat connectedDebugAndroidTest
Pop-Location
git diff --check
```

The literal `-p apps\mobile` form resolves to `apps\android\apps\mobile` under this wrapper and fails before executing tests.
