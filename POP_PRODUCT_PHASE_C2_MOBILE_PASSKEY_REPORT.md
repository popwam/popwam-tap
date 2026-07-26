# 1. Executive Summary

Phase C.2 implements a dedicated Android passkey-to-POP-mobile-session contract. Android can request a purpose-bound usernameless challenge, invoke Credential Manager, submit the signed assertion, and receive the same POP access/rotating-refresh session shape used by mobile OTP. Browser `AuthTicket` is not accepted or returned by the mobile channel.

The implementation and automated validation pass locally. Operational real-device activation remains pending an unapplied additive enum migration, an explicitly approved Android-origin allowlist, the relying party's hosted Digital Asset Links declaration, and a physical-device test.

# 2. Previous Blocker

The existing Web verification endpoint produced a browser/NextAuth `AuthTicket`; it had no safe mobile token output. Android therefore could enroll passkeys but could not use one to establish a normal POP bearer session.

# 3. Existing Passkey Architecture

`PasskeyCredential` remains the authoritative public-key record and user relation. `PasskeyChallenge` stores a hash, expiry, type, and consumption time. Web uses discoverable authentication options and a two-minute `AuthTicket`. `MobileRefreshToken` stores only a refresh-token hash, family, expiry, and revocation state.

# 4. Shared Verification Architecture

`passkey-authentication.ts` now owns authentication-option creation, assertion structure checks, credential/user lookup, the SimpleWebAuthn verification call, RP/origin validation, counter inputs/outputs, and transactional challenge consumption. Both web and mobile call this cryptographic core, then issue channel-specific sessions.

# 5. Mobile Challenge Contract

`POST /api/mobile/auth/passkey/options` creates discoverable authentication options with no claimed user ID or phone. It stores only the challenge hash with a five-minute expiry and the `AUTHENTICATE_MOBILE` purpose. Missing Android origin configuration fails closed with a generic unavailable response.

# 6. Mobile Verification Contract

`POST /api/mobile/auth/passkey/verify` accepts a Credential Manager assertion plus a bounded device name. The server resolves the credential and POP user, verifies active status, cryptography, RP, approved native origin, user verification, purpose, expiry, and replay state, updates the counter, records audit, and issues a normal mobile session in one serializable transaction.

# 7. Mobile Session Issuance

Passkey and OTP both call the existing `issueMobileSession`. Access TTL remains 900 seconds; refresh TTL remains 30 days. The mobile response includes standard bearer/access/refresh fields and the authenticated POP user. It contains no NextAuth ticket.

# 8. Refresh Token Reuse

The existing random refresh token, HMAC hash storage, family ID, rotation, reuse detection, revocation, logout, and logout-all code is unchanged. Tests verify that issuance stores only the refresh-token hash and normal family metadata.

# 9. Web Passkey Compatibility

The existing web endpoints remain same-origin protected. Web options use `AUTHENTICATE`; web assertion verification uses the shared core and still creates/returns only the short-lived browser `AuthTicket`. Web does not receive mobile tokens.

# 10. Android Credential Manager Flow

The unauthenticated screen offers passkey first on Android 9/API 28 or newer. Android fetches mobile options, calls the existing `PasskeyCoordinator.authenticate`, posts the assertion, and passes the successful `AuthResponse` through `SessionRepository`. The app declares the RP's Digital Asset Links statement.

# 11. Returning User UX

The login screen presents “Continue with passkey” before phone entry and retains “Use phone instead.” Safe localized states cover cancellation, unavailable platform/provider, no credential, network failure, authentication failure, and temporary server unavailability.

# 12. Account Enumeration Protection

Options are usernameless with an empty credential allow-list. No phone, user ID, or claimed account identifier is accepted. Verification failures use a generic `PASSKEY_AUTH_FAILED`; they do not reveal credential ownership or account status.

# 13. Replay Protection

The assertion is cryptographically verified before issuance, then challenge consumption is the first transactional write. `updateMany` requires the exact ID, purpose, unused state, and unexpired state, and exactly one winner. Counter/credential update, audit, and token issuance share the transaction; rollback restores challenge usability if later issuance fails.

# 14. Challenge Purpose Binding

Existing `AUTHENTICATE` retains its Web meaning. New `AUTHENTICATE_MOBILE` identifies only mobile session authentication. Tests prove that web-purpose lookup cannot satisfy mobile verification and vice versa.

# 15. RP / Origin Validation

RP ID remains `PASSKEY_RP_ID` or the existing configured hostname. Web origin remains `PASSKEY_ORIGIN`. Mobile accepts only explicit `android:apk-key-hash:` values from `PASSKEY_ANDROID_ORIGINS`; malformed or missing values fail closed. No origin or RP check was weakened.

Android's official [Credential Manager prerequisites](https://developer.android.com/identity/credential-manager/prerequisites) also require `https://pop.popwam.com/.well-known/assetlinks.json` to contain the approved package/signing-certificate relationships. The manifest reference is present, but the repository has no approved fingerprint data and no association file was invented or externally published.

# 16. Authenticator Counter Handling

The shared SimpleWebAuthn verifier receives the stored counter and returns the accepted `newCounter`, including the library's existing synced-passkey behavior. The transaction updates only the same active credential at the counter value used for verification, preventing stale concurrent writes.

# 17. Audit Logging

Successful mobile authentication writes `auth.passkey.verified` with only `platform=ANDROID`, `method=PASSKEY`, and `outcome=SUCCESS`. It records no challenge, raw credential ID, client data, authenticator data, signature, token, phone, or Firebase identifier.

# 18. Firebase Independence

The mobile passkey server issuer has no Firebase dependency or import. On Android, POP tokens are stored before lifecycle hooks run; exceptions from supplementary Firebase linking are contained and leave the POP session intact.

# 19. FCM Independence

Passkey success invokes the same best-effort lifecycle hook as OTP. FCM upload failure is caught and does not clear or delay the POP session. Existing retry and logout-revoke behavior remains.

# 20. AuthSetupResolver Reuse

After passkey tokens are stored, `AuthViewModel` enters `AUTHENTICATED_CHECKING` and reuses the existing server-driven `AuthSetupResolver`. No legal/profile/bootstrap rule is duplicated in passkey code.

# 21. Database Changes

NEW MIGRATION: YES.

`20260725143000_mobile_passkey_challenge_purpose` additively adds `AUTHENTICATE_MOBILE` to `PasskeyChallengeType`. It drops, renames, and rewrites nothing.

MIGRATION APPLIED: NO.

# 22. API Changes

Added:

- `POST /api/mobile/auth/passkey/options`
- `POST /api/mobile/auth/passkey/verify`

Refactored the existing web authentication options/verify routes to use the shared verification core without changing their session output. Android passkey registration verification now selects the approved web or native origin policy based on the existing cookie/bearer channel.

# 23. Automated Tests

Web: 43 files / 195 tests passed. New tests cover standard mobile token semantics, hashed refresh storage, purpose separation, valid/invalid assertions, expired/consumed lookup rejection, revoked/inactive credential/user rejection, RP/origin failure, counter propagation, replay rejection, safe audit metadata, no mobile browser ticket, retained web ticket behavior, Firebase independence, and request throttling.

Android: 15 suites / 50 tests passed with zero failures/errors/skips. New tests cover passkey-first ordering, platform support, phone fallback, normal token storage, server rejection, Firebase/FCM failure containment, and unchanged refresh/logout behavior. Existing `AuthSetupResolver` tests remain active.

Cryptographic verification is mocked in the focused service unit test; the production build compiles the real SimpleWebAuthn integration. A live assertion was not generated without a physical device and approved RP association.

# 24. Build / Lint Results

- `pnpm db:generate`: PASS.
- `pnpm --filter ./apps/web lint`: PASS.
- `pnpm --filter ./apps/web test`: PASS, 195 tests.
- `pnpm --filter ./apps/web build`: PASS.
- `pnpm i18n:audit`: PASS, zero hardcoded/unused candidates.
- Android `testDebugUnitTest`: PASS, 50 tests.
- Android `assembleDebug`: PASS.
- Android `lintDebug`: PASS.

The equivalent Gradle `--project-prop popwam.firebase.android.enabled=true` syntax was used because PowerShell/Gradle parses the requested short `-P` form incorrectly in this workspace.

# 25. Runtime Device Status

`adb devices` returned no attached authorized device.

ANDROID RUNTIME PASSKEY TEST: NOT RUN.

No emulator, AVD, or QEMU was created or used.

# 26. Security Review

- No bearer or refresh token is included in WebAuthn challenge data.
- No refresh/access token, assertion, credential raw data, signature, or challenge is logged.
- No authentication token is sent in a URL.
- No Firebase ID token is accepted as POP authorization.
- No client-supplied POP user ID is trusted.
- No browser ticket is accepted or returned by mobile passkey auth.
- Web and mobile challenges are purpose-bound and single-use.
- RP/origin validation fails closed and is not weakened.
- OTP issuance/verification is unchanged.
- Refresh rotation and reuse detection are unchanged.
- Logout/logout-all revocation is unchanged.
- Mobile options and verification have privacy-safe request-context throttling; it is process-local defense-in-depth, while single-use challenges remain the durable replay boundary.

# 27. Files Changed

C.2 adds the shared passkey authentication service, mobile passkey contract/issuer, rate limiter, two mobile auth routes, focused web tests, one additive migration, Android auth API/session integration, passkey-first UI/error policy, Digital Asset Links manifest declaration, localized strings, and Android tests. It also refactors the existing web passkey authenticate routes and Android registration origin selection.

# 28. Git Status

The pre-existing worktree remains broadly dirty with preserved Phase A–C.1 and Firebase work. C.2 files are unstaged and uncommitted. Nothing was added, committed, pushed, reset, cleaned, checked out, deployed, or applied to a database.

# 29. Complete Phase C Exit Status

The C.2 code contract and automated criteria pass locally: Android uses Credential Manager, the server verifies through a shared core, standard POP mobile tokens are issued, browser tickets are excluded, OTP remains fallback, replay/purpose/counter checks exist, and Firebase/FCM are non-fatal.

Complete operational Phase C sign-off is still pending: apply the additive migration through the approved process, configure approved release/debug Android origins, publish the matching Digital Asset Links declarations, and validate enrollment/authentication on an authorized physical device.

# 30. Readiness For Phase D

Phase D local engineering can start on the existing server-driven foundation without changing this auth model. Production/readiness sign-off should keep the Phase C operational prerequisites above as explicit gates. Recommended model/reasoning: GPT-5.6 with High reasoning.
