# 1. Executive Summary

Phase H is complete locally. POP now has an organized Settings and Security Center on Web and Android, controlled appearance preferences, notification preferences separated from operating-system permission state, privacy-safe device/session inventory, real session revocation, passkey management, and purpose-bound step-up for sensitive operations.

The security authority remains POP:

- `User.id` is the account authority.
- Web authority remains NextAuth, now backed by a revocable server-side `Session` row.
- Android authority remains the POP access-token and rotating refresh-family contract.
- POP passkeys and POP OTP are the only step-up methods.
- Firebase remains supplementary analytics, external-identity, and FCM infrastructure. It is not accepted as POP authentication or step-up.

One additive Phase H migration was created but not applied. No production system was accessed or changed. Full linked-device QR pairing is explicitly deferred to H.1, as permitted by the Phase H brief; the device/session and step-up foundations needed for it are present.

# 2. Existing Security Stack Audit

The pre-change audit found two real authentication authorities:

- Web: NextAuth JWT cookie sessions.
- Android: short-lived POP bearer access JWTs plus rotating, hashed mobile refresh-token families.

Passkey authentication already used POP WebAuthn challenges and credentials. OTP remained POP verification/recovery. `DeviceSession` and FCM relations existed but did not consistently represent the actual authority being revoked. The implementation therefore binds descriptive inventory to the real Web session row or Android refresh family instead of treating FCM, Firebase identity, user-agent data, or a device row as authentication authority.

# 3. Settings Architecture

Web Settings uses an organized sidebar/content structure under `/dashboard/settings` and `/dashboard/settings/[section]`. Android uses native Compose destinations from the existing navigation architecture.

The sections are Appearance, Notifications, Privacy, Permissions, Security, Devices, Sessions, Passkeys, Account, Help, and Legal. Shared server routes own preference validation and security business rules; Android does not duplicate those rules.

# 4. Appearance

System, Light, and Dark are supported on Web and Android.

Web applies controlled theme attributes and theme tokens. Android uses a lifecycle-safe `StateFlow` preference store and the existing Compose theme. Changes are immediately reflected without requiring an application restart.

# 5. Language / Fonts

English and Arabic remain the supported languages. Android respects platform locale and layout direction; Web preserves the existing locale architecture.

Font choices are restricted to `DEFAULT`, `CAIRO`, and `ABEEZEE`. Web loads repository-local font assets rather than a runtime network font. Android uses bundled resources. Arbitrary font names, URLs, or remote font execution are not accepted.

# 6. Notifications

The server stores typed preferences for general, security, product, and marketing notifications. Preference changes do not request an operating-system permission and do not claim that delivery is available.

The API separately reports whether delivery infrastructure is configured and the client separately reports operating-system permission state. Notification preference is therefore not confused with device authority.

# 7. Permissions

Permissions remain browser/operating-system authority. Settings only displays bounded states such as allowed, denied, not requested, or unavailable.

Android links users to the system application settings when they choose to manage permissions. The Phase H screens do not request Camera, NFC, Location, Contacts, or Notification permission merely because Settings was opened. Web reads browser-visible state only where the browser exposes it.

# 8. Privacy

The privacy preference surface includes the controlled activity-identity preference. Security DTOs expose only opaque inventory IDs, bounded device/browser labels, category metadata, timestamps, state, and counts.

They do not expose cookies, access tokens, refresh tokens, hashed token material, raw user agents, FCM tokens, Firebase IDs, passkey credential IDs, passkey challenges/assertions, activation secrets, phone numbers, or OTP values.

# 9. Security Overview

Web and Android load the same authenticated security overview. It reports verified-phone recovery state, configured passkey count, active device/session counts, and whether the current session context supports sensitive actions.

An older session that cannot be safely bound is reported as requiring a session upgrade instead of silently granting high assurance.

# 10. Device Inventory

Logical devices are derived from `DeviceSession` rows and their relationships to Web sessions, mobile refresh families, passkeys, and push tokens.

The inventory includes bounded type, label, platform/application classification, created/last-active/last-authenticated times, authentication method, active-session count, push-enabled state, passkey count, lifecycle status, and current-device state. Hardware fingerprinting was not introduced.

# 11. Device vs Session

A logical device is descriptive continuity and grouping. A session is an actual authentication authority.

- A Web browser device may have one or more real NextAuth-backed `Session` rows.
- An Android device may have one or more rotating refresh-token families.
- Revoking a device revokes the attached real authorities.
- Deleting only a push token or marking only a device row revoked is never presented as a security logout.

# 12. Web Session Mapping

New Web logins and passkey logins receive a server-side `Session` row whose opaque identifier is bound into the NextAuth JWT.

The NextAuth JWT callback validates that row before accepting the cookie. Individual revocation deletes the authoritative row; the next protected request can no longer retain a valid Web session. `createdAt`, `lastSeenAt`, expiry, authentication method, and privacy-safe browser classification are maintained server-side.

# 13. Android Session Mapping

Android continues to use the approved POP mobile contract:

- 15-minute access JWT.
- 30-day rotating refresh family.
- Hashed refresh-token storage.
- Replay-safe refresh rotation.

Each refresh family is associated with a logical device where possible. Individual session/device revocation updates the actual refresh family, preventing further refresh. An already-issued access token can remain usable only until its bounded 15-minute expiry; no token introspection authority or Firebase authorization model was invented.

# 14. Current Device Detection

Web current-session detection uses the validated server-side session identifier bound to the NextAuth JWT. Android current-device detection uses the authenticated mobile session context and refresh-family/device association.

Client-provided inventory IDs are not trusted to establish current authority. Ambiguous legacy contexts are labeled conservatively.

# 15. Last Seen

Web session activity updates the real session/device last-seen metadata through authenticated session validation. Android refresh and authenticated mobile lifecycle paths update refresh-family/device activity.

Last-seen data is display metadata. It is not used as an authentication factor.

# 16. Device UX

Both clients display large, readable rows with current-device indication, bounded labels, last activity, authentication method, and related security counts. Device rename uses validated text and an authenticated, step-up-protected mutation.

Destructive revocation requires explicit confirmation. Empty, loading, retry, and compatibility states are handled.

# 17. Session UX

Sessions are separated from devices and show Web versus Android authority, label, creation/activity/expiry, authentication method, current state, and legacy status.

Users can revoke an individual non-current session, revoke other sessions while preserving the current session, or sign out everywhere. Current-session consequences are explicit.

# 18. Individual Revocation

Individual Web revocation deletes the authoritative NextAuth `Session` row. Individual Android revocation revokes the corresponding mobile refresh family. Associated logical-device state is updated only as a consequence of revoking the real authority.

The operation is idempotent and requires a purpose-bound `REVOKE_SESSION` step-up grant. Repeating a revoke cannot restore or duplicate authority.

# 19. Revoke Other Devices

`REVOKE_OTHER_SESSIONS` preserves the authenticated current Web session or current Android device context and revokes all other actual authorities.

It also updates the legacy cutoff so dormant pre-Phase-H Web cookies cannot later materialize as valid sessions. If the current session cannot be safely identified, the server refuses the sensitive action instead of guessing.

# 20. Logout Everywhere

Logout everywhere revokes all real Web session rows, all active mobile refresh families, and related logical-device authority. The action requires fresh step-up and intentionally includes the current session.

The legacy cutoff is advanced so older unbound Web JWTs cannot bypass the operation.

# 21. FCM Cleanup

Push-token cleanup is best effort and occurs after the authoritative security transaction. FCM failure is returned only as non-authoritative cleanup status and never changes a successful revoke into a security failure.

Conversely, deleting an FCM token does not claim to revoke a POP session. No raw FCM token is returned by inventory or mutation DTOs.

# 22. Passkey Management

Web and Android can list, add, rename, and remove POP passkeys through the shared POP passkey authority. Android uses Credential Manager and does not implement fingerprint-specific authentication.

The first passkey can use the approved recent-authentication path. Adding another passkey prefers/requires fresh `ADD_PASSKEY` step-up. Removal requires `REMOVE_PASSKEY` step-up. The server prevents removal of the final recovery method when the user has no verified phone.

# 23. Step-Up Architecture

Step-up uses a POP-owned `StepUpGrant`, not a new long-lived login session. The server:

- verifies a POP passkey assertion or POP OTP;
- generates an opaque random proof;
- stores only its HMAC-derived hash;
- binds it to user, purpose, and current Web session or Android device context;
- expires it after seven minutes;
- consumes it atomically once.

Purpose, binding, expiry, and `consumedAt` are checked in the same authoritative transaction as the sensitive action. Replay and cross-purpose use fail. Firebase cannot mint or satisfy a grant.

# 24. Step-Up Purposes

The typed purposes are:

- `CHANGE_PHONE`
- `DELETE_ACCOUNT`
- `ADD_PASSKEY`
- `REMOVE_PASSKEY`
- `REVOKE_SESSION`
- `REVOKE_OTHER_SESSIONS`
- `PRODUCT_LOST`
- `PRODUCT_TRANSFER`
- `SECURITY_SETTINGS`
- `LINK_DEVICE_APPROVAL`

The last purpose is foundation for H.1 and is not yet exposed as a QR pairing flow.

# 25. Step-Up Web

Web uses reusable localized step-up dialog/form components. Passkey is preferred when available; OTP remains the recovery method. The proof is submitted only to the intended sensitive operation.

Explicit confirmation is used for session/device revocation, passkey removal, product lost, and account deletion. Error and expired-proof paths can restart verification.

# 26. Step-Up Android

Android uses a native Compose bottom sheet coordinated through the existing ViewModel/repository/API layers. Credential Manager supplies passkey assertions. POP OTP remains available as recovery.

The Android client does not treat a local biometric dialog as server proof and does not trust Firebase identity. Cancellation leaves the current POP account usable.

# 27. Product Lost Integration

Direct unassured Lost transitions were removed from the Web and Android product UI paths in scope.

`POST /api/security/products/[cardId]/lost` consumes a `PRODUCT_LOST` grant, locks and revalidates ownership/state, performs an idempotent state transition, and writes status history/audit metadata. It does not change activation ownership semantics or expose activation secrets.

# 28. Product Transfer Integration

The existing Web transfer initiation and approval actions now consume a `PRODUCT_TRANSFER` grant and revalidate the transfer/card state inside the transaction. The transfer protocol and ownership semantics were not redesigned.

Android did not already expose a native transfer workflow, so no unrelated Android transfer protocol was created. The shared server business rule protects the existing transfer paths.

# 29. Phone Change

Phone change requires a `CHANGE_PHONE` step-up grant before the server creates a purpose-specific challenge for the new phone. The new phone must then pass POP OTP verification before the authoritative phone value changes.

The operation uses normalization, existing OTP controls, bounded attempts/expiry, and audit logging. Firebase linking is not accepted as phone-change authorization.

# 30. Account Deletion

Account deletion uses an explicit, step-up-protected, idempotent soft deletion request. It does not immediately hard-delete relational, legal, product, or audit data and does not invent a retention policy.

Repeated requests return the existing lifecycle state rather than creating duplicate requests.

# 31. Recovery

Security surfaces report only real recovery methods:

- verified POP phone status;
- configured POP passkey count.

OTP remains recovery. No backup codes, Firebase recovery, or other unimplemented method is advertised.

# 32. Linked Device Foundation

Full companion/QR pairing is explicitly deferred to Phase H.1. The current repository did not have a complete secure pairing request/approval contract, and rushing one would have expanded the authentication model.

The foundation is ready: logical device/session inventory, privacy-safe device labels, current-device binding, step-up purpose `LINK_DEVICE_APPROVAL`, shared Web/Android bearer-aware current-user resolution, and authoritative revocation.

H.1 must add a short-lived, opaque, server-owned, single-use pairing request approved from authenticated mobile after step-up. A QR payload must never contain a bearer token, refresh token, cookie, passkey assertion, or Firebase credential.

# 33. Session Assurance

Session assurance records authentication method and last-authenticated time. Sensitive operations require a valid current binding and a fresh purpose-specific grant rather than relying on an old login timestamp alone.

Legacy or ambiguous sessions receive a safe upgrade-required state for sensitive operations.

# 34. Refresh Token Semantics

Mobile refresh tokens remain hashed, rotating, replay-aware families with explicit expiry and revocation. The device inventory never returns token values or hashes.

Revocation immediately prevents subsequent refresh. The bounded access-token window remains 15 minutes, which is the approved Android contract and is documented rather than obscured.

# 35. Legacy Sessions

Pre-Phase-H Web JWTs are upgraded lazily by creating real session/device rows after successful existing authentication. They are not logged out merely because metadata is absent.

For revoke-others/logout-everywhere, `sessionsRevokedBefore` prevents an old dormant cookie from being upgraded after the security event. Ambiguous sessions are never arbitrarily assigned as current.

# 36. Backfill / Classification

`packages/db/prisma/security-session-backfill-report.ts` is a read-only classifier for:

- `LINKED`
- `LEGACY_WEB`
- `LEGACY_MOBILE`
- `ORPHAN_DEVICE`
- `ORPHAN_PUSH_TOKEN`
- `AMBIGUOUS`

It emits only safe counts/identifiers needed for review and no token values. It was not run because this task forbids production database access and the active database target was not proven to be an isolated fixture.

# 37. Menu Reorganization

Web and Android navigation now group preferences, security, social, integrations, and account destinations. The old scattered passkeys/settings/logout-all entry points route into the organized settings architecture.

Legacy Web passkeys navigation redirects safely to the new Passkeys section.

# 38. Localization / RTL

All new user-visible Settings/Security copy was added in English and Arabic through the existing localization systems. Compose does not hardcode layout direction, and Web preserves locale direction.

The i18n audit passed with 589 Web keys, 563 Android keys, zero hardcoded-string candidates, and 14 unused-key warnings.

# 39. Accessibility

The new UI uses full-width/large touch targets, labeled controls, semantic status/error text, explicit confirmation, visible current-session state, keyboard-safe Compose layout, loading indicators, retry states, and no color-only security meaning.

Web controls use native buttons/inputs and status regions. Android settings use native Compose controls and platform settings intents.

# 40. Analytics

The existing privacy-safe Firebase analytics wrappers were extended; no second analytics implementation was created.

Phase H events include settings/security intent and outcomes such as appearance, notification preference, session revoke, passkey management, and step-up completion. Allowed dimensions are bounded categories such as platform, setting category, authentication method, and outcome.

Events do not contain phone, OTP, user/profile/device/session IDs, token/grant values, raw user agent, FCM token, Firebase UID, passkey material, or legal/product secrets.

# 41. Audit

Server audit records cover sensitive successful/failed outcomes, including step-up, session revocation, passkey removal, phone change, deletion request, and product lost. Audit metadata uses operation names, bounded purpose/method/outcome, and internal relational references where required.

Secret proof material is never written to audit metadata.

# 42. Security Review

The final review confirmed:

- Web revoke targets a server-validated NextAuth session row.
- Android revoke targets the actual refresh family.
- current-session preservation is server-derived.
- step-up is user/purpose/session-or-device bound, short-lived, and single-use.
- sensitive mutations require same-origin protection for cookie clients or a valid POP bearer client.
- Firebase ID tokens are not accepted as POP authorization or step-up.
- passkey challenges/assertions and OTP values are not logged.
- no invasive hardware fingerprinting was added.
- lost/transfer ownership and state are revalidated transactionally.

# 43. Privacy Review

Inventory labels are derived into bounded browser/OS/application categories; raw user-agent strings are not exposed. Manufacturer/model data is optional display metadata and not a security factor.

No session/refresh/access token, cookie, push token, Firebase identifier, raw passkey credential identifier, OTP, exact network identifier, or activation secret enters settings/security inventory DTOs or analytics. Phone display is masked where a recovery challenge requires user confirmation.

# 44. APIs

New shared authenticated routes:

- `GET/PATCH /api/settings/preferences`
- `GET/PATCH /api/settings/notifications`
- `GET /api/security/overview`
- `GET /api/security/devices`
- `PATCH /api/security/devices/[deviceId]`
- `GET /api/security/sessions`
- `DELETE /api/security/sessions/[sessionId]`
- `POST /api/security/sessions/revoke-others`
- `POST /api/security/sessions/revoke-all`
- `GET /api/security/passkeys`
- `PATCH/DELETE /api/security/passkeys/[passkeyId]`
- `POST /api/security/step-up/options`
- `POST /api/security/step-up/verify`
- `POST /api/security/account/phone/change/start`
- `POST /api/security/account/phone/change/verify`
- `POST /api/security/account/deletion-request`
- `POST /api/security/products/[cardId]/lost`

Existing passkey registration, authentication, Web logout, Android logout/refresh, push-token, product, and transfer paths were integrated with the shared session/security rules. Routes accept Web NextAuth or Android POP bearer authentication through the shared current-user resolver. Firebase credentials are not accepted.

# 45. Prisma Changes

The Phase H schema additively introduces typed appearance/language/font, logical-device type, session authentication method, step-up purpose/method, and account-deletion status enums.

It extends User, Session, MobileRefreshToken, PasskeyCredential, DeviceSession, DevicePushToken, and relevant challenge records with authority/binding/activity metadata. It adds `UserPreference`, `NotificationPreference`, `StepUpGrant`, and `AccountDeletionRequest`.

No existing table, column, relation, or enum value was dropped or renamed.

# 46. Migration

NEW MIGRATION: **YES**

Migration file:

`packages/db/prisma/migrations/20260726040000_security_settings_step_up/migration.sql`

The migration is additive and reviewable. It was generated/validated locally but was not applied.

MIGRATION APPLIED: **NO**

PRODUCTION MIGRATION: **NO**

# 47. Automated Tests

Web:

- `pnpm --filter ./apps/web test`: PASS
- 57 test files, 292 tests passed.
- New coverage includes settings patch validation, device-owned permission policy, real Web/Android authority classification, current-session preservation, revocation contract, privacy-safe DTO shape, step-up purpose/binding/expiry/replay behavior, and Firebase non-authority.

Android:

- `apps/android/gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true`: PASS
- New `SecuritySettingsPolicyTest` covers settings validation, authority labeling, revocation/current-session policy, step-up usability, passkey recovery safety, and FCM-independence policy.
- Existing Firebase guest, FCM lifecycle, passkey, navigation, and prior-phase regression tests remained passing.

# 48. Build / Lint

- `pnpm db:generate`: PASS
- `pnpm --filter @popwam/db lint`: PASS
- `pnpm --filter ./apps/web lint`: PASS
- `pnpm --filter ./apps/web build`: PASS; 148 pages generated.
- `pnpm i18n:audit`: PASS; zero hardcoded candidates.
- `apps/android/gradlew.bat assembleDebug -Ppopwam.firebase.android.enabled=true`: PASS.
- `apps/android/gradlew.bat lintDebug -Ppopwam.firebase.android.enabled=true`: PASS; 0 errors, 100 warnings.
- `git diff --check`: PASS. Git only reported expected LF-to-CRLF working-copy notices.

The first recorded Android lint pass found two `LocalContextGetResourceValueCall` issues; strings were hoisted through Compose resources and the final lint report has zero errors. A PowerShell invocation once split the dotted Gradle property and reported a nonexistent task; the correctly quoted required command then passed.

# 49. Runtime Device Status

`adb devices` returned no attached devices.

ANDROID RUNTIME DEVICE TESTS: **NOT RUN**

No emulator, AVD, or QEMU was created, started, or used.

# 50. Remaining Gaps

No blocker remains for the Phase H local exit criteria.

Intentional, documented follow-up work:

1. Full Web companion/QR pairing is deferred to H.1.
2. Android refresh-family revocation cannot invalidate a bearer access JWT already issued without changing the approved token contract; exposure is bounded to its 15-minute expiry.
3. Physical-device UX should be checked on a real authorized Android device before release.
4. The additive migration requires review and an isolated/non-production migration rehearsal before any later authorized deployment.
5. Notification delivery orchestration remains separate from the preference foundation; preference storage does not claim delivery.

# 51. Phase H Exit Criteria

**PASS locally.**

All 29 Phase H exit criteria are implemented and validated by static/build/unit checks:

- organized settings, controlled appearance/font, English/Arabic;
- notification preferences separated from OS permission;
- security overview and logical device inventory;
- Web authority mapped to real session rows;
- Android authority mapped to refresh families;
- real individual/revoke-others/logout-everywhere semantics;
- non-authoritative FCM cleanup;
- passkey management and POP-only purpose/session-bound step-up;
- lost/transfer assurance integration;
- privacy-safe DTOs and no hardware fingerprinting;
- safe legacy compatibility;
- shared Web/Android server rules;
- Firebase supplementary and Meta untouched;
- tests/build/lint passing;
- no production mutation, deploy, push, commit, or emulator.

Runtime device testing is explicitly recorded as not run because no real authorized device was attached.

# 52. Recommended Next Phase

The exact next product phase should be:

**Phase I — Friends / Invitations / Privacy / Blocking / Reporting / Abuse Controls**

Scope it before Nearby or messaging:

- versioned Friends/community policy acceptance;
- server-owned invitation/request lifecycle;
- selected profile/share projection with module-level privacy;
- durable block and unblock semantics;
- request/reject/remove/favorite/mute behavior;
- rate limits, spam controls, report categories, and moderation workflow;
- FCM notification preferences and privacy-safe events;
- Web and Android parity;
- authorization, block-first, projection, concurrency, and abuse tests.

Keep Nearby, contact upload, unsolicited messaging, and full linked-device QR pairing out of that phase unless separately approved. If companion pairing is prioritized operationally, perform the narrowly scoped H.1 pairing contract before Phase I.

Recommended model: **GPT-5.6 Sol**, using **max reasoning** for the initial authorization/privacy/threat-model and data-contract pass, then `xhigh` for implementation and regression work. This phase has cross-platform authorization, privacy projection, concurrency, moderation, and abuse-control coupling where the flagship model and deeper verification are justified.

