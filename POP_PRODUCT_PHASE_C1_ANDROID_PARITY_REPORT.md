# 1. Executive Summary

Phase C.1 adds Android’s server-driven legal-consent and primary-profile bootstrap parity. Android preserves the existing POP mobile token session after OTP, then resolves setup from the Phase C server status rather than local preferences. Firebase, FCM, analytics, and passkey enrollment failures remain non-fatal.

Native returning-user passkey sign-in is not enabled: the current server assertion endpoint produces a browser/NextAuth ticket rather than a POP mobile session. No second authentication authority or unsafe exchange was added.

# 2. Android Auth State Machine

`AuthSetupResolver` centrally resolves `PUBLIC`, `OTP_REQUIRED`, `AUTHENTICATED_CHECKING`, `SETUP_UNAVAILABLE`, `LEGAL_REQUIRED`, `PROFILE_BOOTSTRAP_REQUIRED`, `PASSKEY_OFFER`, `LEGACY_COMPATIBILITY`, and `READY`. Composables render the resulting state; they do not make account-routing decisions.

# 3. Post-OTP Routing

`SessionRepository` retains existing access/refresh-token persistence and lifecycle hooks. After successful POP OTP, `AuthViewModel` fetches `GET /api/profile-bootstrap`; the authenticated server response determines routing. Firebase linking and FCM work remain best-effort.

# 4. Legal Consent

Android calls `GET /api/legal/required`, displays only the required server documents, requires acknowledgement, and posts to the existing consent endpoint. Versions, active/required state, and idempotency remain server-owned.

# 5. Legal Document Viewer

Terms and Privacy launch only the trusted POP `terms` and `privacy` paths through Custom Tabs. Android maps known document types rather than loading a server-supplied arbitrary URL. Returning closes the tab back to the preserved consent state.

# 6. Profile Bootstrap UI

The native guided screen has name, kind, category, and conditional template selection steps. It does not implement the Phase D questionnaire.

# 7. Personal / Business Selection

Both `PERSONAL` and `BUSINESS` selections are passed to the categories and bootstrap APIs. The server remains authoritative for entitlement, category/template compatibility, primary-profile promotion, and default module initialization.

# 8. Category Loading

Categories come from `GET /api/profile-categories?profileKind=…`; they are not hardcoded. Empty/unavailable data keeps submission unavailable and exposes retry.

# 9. Template Loading

Compatible templates come from `GET /api/profile-templates`. A server default or a single compatible template is automatically selected; otherwise Android presents a native choice. This is not a template marketplace.

# 10. Bootstrap Submission

Android sends only display name, profile kind, category slug, optional template ID, and locale to the existing authenticated `POST /api/profile-bootstrap`. It never creates a Card or VirtualCard as profile identity and never initializes modules locally.

# 11. Idempotency / Resume

Local in-flight protection prevents duplicate bootstrap taps. After success or an uncertain server error, Android re-fetches status. Process restart starts from the persisted POP session and server status; bootstrap creation remains transactional/idempotent on the existing Phase C endpoint.

# 12. Legacy User Compatibility

Existing non-new users with a canonical primary profile go directly to the app. A user without a safe primary profile enters a compatibility screen; Android neither deletes/overwrites profiles nor selects or creates a primary profile.

# 13. Passkey Enrollment

After successful new-account bootstrap with no registered passkey, Android offers Credential Manager enrollment. It uses POP’s existing registration options/verification endpoints through the POP bearer session. Unsupported, cancelled, unavailable, or failed enrollment leaves the POP account and completed setup intact; “Not now” enters the app.

# 14. Returning Passkey Flow

Blocked by current server contract. `/api/passkeys/authenticate/verify` returns a browser/NextAuth ticket and has no authenticated, replay-safe mobile-token exchange. Adding one would be a new mobile authentication contract, so Android retains phone/OTP as the returning-user path and does not invent an authority.

# 15. Firebase Independence

Firebase remains supplementary. A Firebase guest-link failure is caught by the existing session lifecycle hook and does not invalidate the persisted POP session. No Firebase token is accepted by the shared POP current-user resolver.

# 16. FCM Independence

FCM upload/revoke failures are caught by `FcmTokenBridge`; they do not block OTP login, setup, or protected access.

# 17. Localization / RTL

All C.1 UI strings were added to English and Arabic resources. Compose uses normal layout direction, supports IME padding, and preserves LTR treatment only for phone/OTP fields. `pnpm i18n:audit` passed with 0 hardcoded and 0 unused candidates.

# 18. Accessibility

The screens use full-width Material actions, labeled fields, selectable rows/chips, scrollable bounded lists, touch-sized actions, loading indicators, and keyboard-safe layout.

# 19. Analytics

The existing privacy-safe Firebase wrapper now permits the existing Phase C event names: legal consent completed, bootstrap started/completed, kind/category selected, and passkey enrollment shown/completed. Only platform, profile kind, and category key are accepted properties; no phone, OTP, IDs, legal text, or token is sent.

# 20. APIs Changed

`api-auth.ts` now exposes a shared POP-current-user resolver and trusted mutation helper. Phase C legal/profile-bootstrap and passkey-registration endpoints accept either existing web NextAuth or an existing valid POP mobile bearer token. Firebase is explicitly not authorization. No Android-specific business endpoint was created.

# 21. Database Changes

New migration: NO.

Migration applied: NO.

Phase C.1 uses the existing Phase B models and existing Phase C service behavior.

# 22. Automated Tests

Added Android resolver/policy tests for post-OTP legal routing, accepted-consent routing, profile bootstrap routing, personal/business validation, invalid category/template handling, template unavailability, returning bypass, legacy ambiguity, passkey offer/cancellation continuation, and resume/checking behavior. Existing Firebase-link-failure and FCM lifecycle unit tests cover independence.

`apps/android/gradlew.bat testDebugUnitTest --project-prop popwam.firebase.android.enabled=true`: PASS.

`pnpm --filter ./apps/web test`: PASS (39 files, 179 tests).

# 23. Build / Lint Results

`apps/android/gradlew.bat assembleDebug --project-prop popwam.firebase.android.enabled=true`: PASS.

`apps/android/gradlew.bat lintDebug --project-prop popwam.firebase.android.enabled=true`: PASS.

`pnpm --filter ./apps/web lint`: PASS.

`pnpm --filter ./apps/web build`: PASS.

`pnpm i18n:audit`: PASS.

# 24. Runtime Device Status

`adb devices` returned no attached authorized device. ANDROID RUNTIME DEVICE TESTS: NOT RUN. No emulator, AVD, or QEMU was created or used.

# 25. Blockers

Returning native/usernameless passkey sign-in is blocked by the missing POP mobile-session exchange for a verified passkey assertion. OTP remains the supported Android fallback/recovery path.

# 26. Files Changed

Key C.1 files: Android setup resolver/policy/UI/repository/API models, `AppViewModels.kt`, `PopwamApp.kt`, `TapApplication.kt`, `MainActivity.kt`, localized string resources, and Android unit tests. Shared web changes are `api-auth.ts` and the existing legal, profile-bootstrap, and passkey-registration routes.

# 27. Git Status

The worktree was already broadly dirty from prior Phase A/B/C and Firebase work. C.1 changes remain uncommitted and unstaged. `git diff --check` passed.

# 28. Phase C Final Exit Status

Android legal consent, server-defined bootstrap, category/template loading, retry-safe submission, legacy safety, passkey enrollment, Firebase/FCM independence, localization, unit tests, build, and lint pass. COMPLETE Phase C does not fully pass while native returning passkey sign-in lacks a safe POP mobile-session contract; this is documented rather than bypassed.

# 29. Readiness For Phase D

The server-driven C.1 foundation is ready for Phase D dynamic onboarding once the returning-passkey contract is decided. Phase D should not replace the server bootstrap authority or introduce local profile/module creation.
