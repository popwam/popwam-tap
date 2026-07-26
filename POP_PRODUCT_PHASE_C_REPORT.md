# 1. Executive Summary

Phase C adds a phone-first POP entry, verified new-versus-returning routing, consent-gated initial profile bootstrap, passkey enrollment prompt, safe analytics/audit hooks, and a native Android first-entry/OTP-sheet update. POP OTP, POP `User.id`, NextAuth, mobile bearer sessions, and passkeys remain authoritative; Firebase remains supplementary.

# 2. Files Changed

Phase C adds entry/bootstrap/session-policy helpers, authenticated web APIs, onboarding components, tests, Android phone-entry policy tests, and this report. It updates the existing OTP verification, legal consent, passkey audit, analytics taxonomy, login/OTP presentation, Android entry screen, and Android strings.

# 3. Web Entry Screen

`/login` is now a minimal POP phone-first screen: logo treatment, POP name, “Your world. One POP.”, country/phone entry, Continue, local How-it-works disclosure, and internal Privacy/Terms links. `/login/phone` remains as a compatible redirect.

# 4. Android Entry Screen

The Android app now enters the phone-first screen after splash, presents POP branding/slogan, country selector, phone input, Continue, How-it-works, and in-app Privacy/Terms links. Public/deep-link capability remains outside the authenticated dashboard flow.

# 5. Phone-First Flow

The same generic phone/OTP UX is used before verification. Only after a successful OTP can the server return the new-account state; no pre-verification account-existence response was added. Existing E.164, rate limit, hashing, expiry, attempts, cooldown, and provider behavior are unchanged.

# 6. OTP UX

Web retains accessible six-cell OTP entry, paste, autofocus, masked phone, change-phone, resend cooldown, and generic error states. Android moves verified-code entry into a native Material bottom sheet with numeric input and a change-phone action. Android does not request SMS-reading permission; manual/autofill-compatible entry remains the safe path.

# 7. OTP Security Regression

OTP values are not added to analytics, audit metadata, or persisted client state. The pre-existing Android development-code state is no longer rendered by the entry UI. Server OTP validation and generic failure responses remain unchanged.

# 8. Legal Consent Flow

New marked OTP accounts must accept current active required `LegalDocument` versions before bootstrap. `POST /api/legal/required` accepts only the server-selected active documents for the authenticated POP user, is idempotent, and writes server audit events. Missing active required documents fail clearly rather than inventing a version.

# 9. New vs Returning User Handling

Web OTP verification marks only newly created accounts in existing `OnboardingProgress` data and routes them to `/onboarding/start`; returning users continue to dashboard or passkey fallback. Legacy users are not rewritten or forced through the new-account flow.

# 10. Passkey-First Authentication

The existing usernameless WebAuthn sign-in remains first on web entry, with OTP as recovery/fallback. Android retains its Credential Manager bridge; a complete native returning-user passkey UI is a remaining Phase C parity follow-up.

# 11. Passkey Enrollment

After consent/bootstrap, web shows a full-width secure-account passkey prompt with platform-neutral device-security language and a Not-now path. Enrollment writes a POP audit event. Existing passkey management/count/revoke APIs remain available.

# 12. Session / Inactivity Policy

Added a server-owned assurance policy foundation: ordinary sessions may continue when recent, inactivity of 30+ days requires passkey reauthentication, and sensitive actions require step-up. It intentionally does not claim a complete StepUpGrant/device-security subsystem; enforcement expansion is deferred to Phase G.

# 13. Firebase Guest Compatibility

Firebase guest/linking code was not made authoritative or blocking. Existing post-OTP link failures remain contained by the established Firebase coordinator, and the new unit policy confirms POP OTP success is independent of guest-link outcome.

# 14. Primary Profile Bootstrap

`completeInitialProfileBootstrap` is transactional and idempotent. It only upgrades the single placeholder profile created for a marked new OTP account, sets the Phase B canonical fields/primary flag, and initializes default modules. It never creates a physical card or guesses among multiple legacy profiles.

# 15. Personal / Business Selection

The web bootstrap screen collects name and explicit PERSONAL/BUSINESS choice. Server-side Phase B compatibility validation remains authoritative; clients cannot select an incompatible category/template combination.

# 16. Category / Template Selection

Added active-category and compatible-template APIs. Category values are managed records, not a permanent hardcoded client list; default templates resolve from category data where available.

# 17. Default Module Initialization

Bootstrap invokes Phase B `initializeDefaultModules` inside the same transaction after the server validates kind/category/template. Client code never invents module rules or module content.

# 18. Legacy User Compatibility

Returning users with an existing primary profile route to the current dashboard. Users without an unambiguous primary receive a non-destructive compatibility message; existing Profile, VirtualCard, Card, tag, and dashboard routes remain in place.

# 19. Localization / RTL

New web entry/bootstrap copy handles English and Arabic with RTL direction. Android adds localized POP slogan resources. `pnpm i18n:audit` reports 239 web keys, 289 Android keys, and zero hardcoded/unused candidates.

# 20. Accessibility

The web entry preserves labeled controls, keyboard numeric input, OTP autofill/paste, status/alert regions, and focusable internal legal links. Android uses native Material controls, a modal bottom sheet, labels, large full-width action targets, and numeric keyboard input.

# 21. Analytics

The existing privacy-safe Firebase analytics allowlist now includes the Phase C funnel names: `phone_entered`, `otp_verified`, `legal_consent_completed`, profile-bootstrap events, and passkey-enrollment events. Only approved non-identifying context can be sent; phone, OTP, user/profile IDs, tokens, and legal text remain rejected.

# 22. Server Audit Events

Server audit events now cover successful OTP verification, required legal acceptance, canonical profile bootstrap completion, and passkey enrollment. They contain operation/outcome metadata only, not OTPs, tokens, or legal text.

# 23. Error / Loading States

Phone, OTP, legal, bootstrap, passkey, and compatibility paths expose generic/recoverable states without account enumeration or stack traces. Buttons are disabled while mutations are pending; bootstrap and consent operations are transactional/idempotent.

# 24. APIs Added or Changed

Added `GET /api/profile-categories`, `GET /api/profile-templates`, `GET|POST /api/profile-bootstrap`, and `GET|POST /api/legal/required`. Web OTP verification now returns post-verification new-account state only after success. Mobile OTP also marks a newly created account for later bootstrap, without changing its token authority.

# 25. Database Changes

No Phase C schema or migration was required. Phase C reuses Phase B `LegalDocument`, `UserLegalConsent`, `Profile`, profile category/template/module relations, and existing `OnboardingProgress.data` for an additive new-account/bootstrap marker.

# 26. Automated Tests

Web: PASS — 39 test files / 179 tests, including new entry routing and session-assurance policy coverage. Android: PASS — `testDebugUnitTest` including the new phone-first state/OTP/Firebase-independence policy tests.

# 27. Build Results

PASS: `pnpm db:generate`, web lint, web tests, web production build, i18n audit, Android `testDebugUnitTest`, Android `assembleDebug`, and Android `lintDebug` using the explicit Firebase-enabled project property.

# 28. Android Runtime Status

ANDROID RUNTIME DEVICE TESTS: NOT RUN. `adb devices` reported no attached devices. No Android emulator, AVD, or QEMU was created or used.

# 29. Meta Regression

No Phase C change touches Meta OAuth callbacks, scopes, ConnectedAccount token storage, review flow, or Meta routes.

# 30. Firebase Regression

No Firebase console/configuration, authority, Firestore, Realtime Database, or App Check change was made. Firebase guest failure remains non-blocking; no POP business route trusts Firebase ID tokens.

# 31. Git Working Tree

The working tree was already dirty before Phase C and includes preserved user/Phase 1/Phase 2/Phase B work. Nothing was staged, committed, pushed, reset, cleaned, or checked out.

# 32. Remaining Risks

The active required legal document records must exist in an approved database for new-account completion. Android native legal-consent/category/bootstrap/passkey-prompt screens are not yet wired to the new authenticated bootstrap APIs, so full mobile parity remains a follow-up. Step-up enforcement needs the later Phase G device/session design.

# 33. Manual Actions Required

Approve/apply the existing Phase B migration through the normal database process; publish approved active Terms/Privacy versions and hashes; validate consent/bootstrap against a non-production database; complete Android native bootstrap/passkey API wiring; and perform real-device OTP/autofill/passkey/Firebase validation.

# 34. Phase C Exit Criteria

Web and shared server foundations pass locally: phone-first entry, no pre-verification enumeration, consent gating, canonical idempotent bootstrap, compatibility protections, passkey preference, safe analytics/audit, and all required builds/tests. Full Phase C product exit is pending Android native consent/bootstrap/passkey wiring and approved legal-document data.

# 35. Recommended Phase D

Implement the approved dynamic onboarding engine: versioned onboarding definitions, localized typed questions, safe branching, resumable progress, server validation, and module-content mapping. First complete the Android Phase C parity wiring rather than introducing an independent mobile onboarding model. Recommended model/reasoning: GPT-5.6 with High reasoning.
