# 1. Executive Summary

Phase D adds a local-only, server-owned dynamic onboarding engine on top of the approved Phase B/C/C.1/C.2 foundations. Definitions are relational, localized, versioned, lifecycle-controlled, and resolved from the authenticated user's canonical primary `Profile`. Progress is server-owned, revisioned, pinned to one definition/version, and stores only temporary draft/initial answers. Completion validates the full visible flow and maps through code-owned handlers inside one serializable transaction.

Web and Android consume the same four authenticated APIs and the same definition contract. The old fixed Web wizard is no longer the active onboarding path. No auth authority, Card identity, Firebase authority, Meta integration, booking, ordering, payment, or ERP behavior was introduced.

The implementation, unit tests, Web build, Android build/lint, and localization audit pass locally. Runtime activation remains pending the approved application of the additive migration, execution of the controlled definition seed, and real-device testing.

# 2. Existing Onboarding Audit

The previous `/onboarding` page was a fixed 15-step Web-only wizard. It hardcoded questions/category behavior in JSX and wrote public profile/card data incrementally. Android had only the Phase C legal/bootstrap/passkey flow. `OnboardingProgress.data` mixed fixed-wizard answers with Phase C compatibility markers.

Reusable foundations were retained: Phase C bootstrap, `ProfileCategory`, `ProfileTemplate`, `ProfileTemplateModule`, `ProfileModuleDefinition`, `ProfileModule`, `ProfileService`, `ProfileBranch`, `Destination`, `UploadedFile`, AuditLog, the shared POP current-user resolver, Android bearer session handling, Compose design primitives, and privacy-safe analytics wrappers.

# 3. Definition Architecture

Added relational `OnboardingDefinition`, `OnboardingStep`, `OnboardingQuestion`, `OnboardingQuestionOption`, and `OnboardingQuestionCondition` models. Definitions target a profile kind plus optional category/template. They contain no HTML, scripts, executable expressions, remote widgets, table names, or column names.

The controlled seed is `packages/db/prisma/onboarding-definitions.seed.ts`. It is production-guarded and never edits an existing key/version.

# 4. Versioning

Each definition has a stable key and integer version with `@@unique([key, version])`. Lifecycle is `DRAFT`, `PUBLISHED`, or `RETIRED`. Only `PUBLISHED` definitions can be newly assigned. Progress pins both `definitionId` and `definitionVersion`; a pinned `RETIRED` version remains resumable, while a `DRAFT` version is rejected. The repository has no definition mutation/editor API, and the seed skips existing published versions.

# 5. Definition Resolution

The server derives the primary Profile from the authenticated POP user and resolves:

1. newest published template-specific definition;
2. newest published category-specific definition;
3. newest published profile-kind fallback.

The client cannot request restaurant, clinic, salon, a profile ID, definition ID, mapping key, category, or template. BUSINESS categories without a specific definition resolve to Business Basic.

# 6. Steps

Steps have stable keys, sort order, localized English/Arabic title and description, bounded `FORM`/`REVIEW` type, required/active flags, and an optional relation to a controlled `ProfileModuleDefinition`. Visible step count is recalculated from current branch answers.

# 7. Questions

Questions have stable keys, a database enum type, localized labels/help, required/sort/active flags, bounded validation columns, controlled options, declarative conditions, and an enum mapping key. Request answers accept only bounded scalar values or flat string arrays; nested arbitrary JSON is rejected.

# 8. Approved Question Types

The schema registry recognizes `TEXT`, `TEXTAREA`, `PHONE`, `EMAIL`, `URL`, `NUMBER`, `CURRENCY`, `BOOLEAN`, `SINGLE_SELECT`, `MULTI_SELECT`, `IMAGE`, `LOCATION`, `TIME`, and `DAY_HOURS`. Web and Android use fixed code-owned render policies and fail closed for unknown types.

The initial seed uses the text/contact/select/boolean/location subset. `IMAGE` is deliberately not present in an initial published definition; both clients expose a safe set-up-later state until a dedicated draft-media upload contract is approved.

# 9. Branching Rules

Conditions support only `EQUALS`, `NOT_EQUALS`, `IN`, `NOT_IN`, `IS_TRUE`, `IS_FALSE`, `ANSWERED`, and `NOT_ANSWERED`. Conditions reference stable question keys in the same seeded definition. There is no expression evaluator or JavaScript execution.

# 10. Validation

The server validates payload size, key shape, known question keys, required visible questions, scalar/array shape, length/count/number bounds, email, phone, HTTP(S) URL, and option allowlists. Field-safe errors return with HTTP 422. Clients mirror required/typed controls only for UX; the server remains authoritative.

# 11. Mapping Handlers

Definitions select only enum handlers:

- `PROFILE_DISPLAY_NAME`
- `ABOUT_BIO`
- `CONTACT_PHONE`
- `CONTACT_EMAIL`
- `CONTACT_LOCATION`
- `JOB_TITLE`
- `ORGANIZATION_NAME`
- `SOCIAL_LINK`
- `SERVICE_CREATE`
- `BRANCH_CREATE`
- `GALLERY_ATTACH`
- `SETUP_LATER`

Handlers are code-owned and cannot be supplied or changed in client requests.

# 12. Progress / Resume

`OnboardingProgress` now carries profile ID, definition ID/version, current step key, optimistic revision, draft answers, initial/prefill answers, update time, and completion time. Browser refresh, Android process death, app restart, and another authenticated device all resume from the server. Completed draft/initial answers are cleared after typed mapping.

The pre-existing `data` field remains only for Phase C compatibility markers; it is not Phase D product-data authority.

# 13. Concurrency

Every progress mutation includes the current revision. `updateMany` performs compare-and-increment semantics, and stale writes return 409. Completion locks the progress row, rechecks revision/pinning/ownership/profile targeting, and completes in a serializable transaction.

# 14. Personal Basic

The Personal Basic profile-kind fallback contains About, Contact, and Links. It collects a display name, optional bio, optional conservative contact details/location, and an optional HTTP(S) website/portfolio link.

# 15. Freelancer / Professional

Separate category-specific v1 definitions reuse the same professional flow: title/profession, bio, bounded services allowlist, portfolio/website, and contact. Services map to the existing `ProfileService`; no catalog, payment, order, or booking model was added.

# 16. Business Basic

The BUSINESS fallback collects business identity, description, conservative contact/location, and an optional website. It works for active BUSINESS categories with no category-specific definition.

# 17. Restaurant

Restaurant v1 contains business identity, a bounded branch question, conditional manual branch address, menu set-up-later policy, contact, and links. Branch data maps to `ProfileBranch` only when explicitly supplied. No catalog/order/delivery/payment engine was introduced.

# 18. Clinic

Clinic v1 reuses business identity/contact/branch steps, adds a small controlled specialties/service option set mapped to `ProfileService`, and keeps booking as set up later.

# 19. Salon

Salon v1 reuses the business components, adds a small controlled service option set, supports an optional branch/contact, and keeps booking as set up later.

# 20. Generic Business Fallback

Business Basic is the profile-kind fallback and is selected whenever no published template/category definition matches. Category/module/profile-kind checks still run before completion.

# 21. Module Mapping

Step module targets use `ProfileModuleDefinition` relations, never raw names supplied by clients. Existing enabled modules are reused. Missing core modules may be initialized privately. A non-core module requires either an existing module or an explicit allowed template rule; otherwise completion fails with `ONBOARDING_MODULE_INCOMPATIBLE`.

# 22. Existing Data Preservation

Safe prefill comes from existing typed Profile values. Progress stores the initial prefill only while onboarding is active. An unchanged prefill is not rewritten; an intentional edit is applied only when the current server value still matches that initial value. Concurrent or unrelated legacy values win. Existing services/branches/destinations are deduplicated.

# 23. Web Renderer

`/onboarding` now renders server steps/questions with a fixed React component registry, calculated progress, Back, Continue, Save/resume, loading/error/stale states, field errors, and completion routing. Category-specific UI logic is absent. Passkey enrollment/skip routes new accounts into dynamic onboarding before Dashboard.

# 24. Android Renderer

Android adds the same DTO/API contract, repository calls, `DYNAMIC_ONBOARDING` setup state, ViewModel orchestration, bounded native rendering policy, and Compose renderer. It uses no WebView. Startup checks server progress before exposing Home, and process restart re-enters through the authenticated setup resolver.

# 25. Media

The server `GALLERY_ATTACH` handler accepts only owned JPEG/PNG/WebP uploads up to 10 MB and attaches them non-publicly. The initial definitions do not publish IMAGE questions. A dedicated cross-client draft-media upload/removal contract is still required before enabling IMAGE in a published definition; the existing profile media editor remains the post-setup path.

# 26. Location

Initial flows use explicit manual address/location entry. No background location permission, Nearby behavior, or automatic exact-location publication was added. Branch/location mappings default to non-public visibility.

# 27. Social Links

Onboarding accepts only validated HTTP(S) links and creates a canonical `Destination` scoped to the authenticated user's profile. New destinations are inactive from public presentation through `isVisible=false`. ConnectedAccount imports remain separate; Meta was not changed.

# 28. Localization / RTL

Definition content stores English/Arabic side by side without duplicating full definitions. Web uses locale direction; Android follows system locale/layout direction and applies LTR only to typed phone/email/URL/number/time controls. `pnpm i18n:audit` passed: 239 Web keys, 334 Android keys, 0 hardcoded candidates, 0 unused candidates.

# 29. Accessibility

Both renderers use step-sized screens, labeled inputs, full-width/touch-sized actions, semantic progress indicators, visible required/optional state, keyboard-safe layouts, error roles/text, and scrollable content. Android uses safe drawing and IME padding.

# 30. Analytics

The existing wrappers allow `onboarding_started`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_resumed`, `onboarding_completed`, and `onboarding_skipped_optional`. Allowed context is restricted to platform, profile kind, category key, generic step key, outcome, and definition version. No answer, name, phone, email, bio, URL, address, media URL, user/profile ID, Firebase UID, token, OTP, or passkey payload is sent.

# 31. Audit

The server records start and completion with only profile target, definition key, and version. Completion/profile/module writes share the transaction. Keystrokes and answer content are not audited.

# 32. Security Review

The shared POP resolver accepts Web NextAuth or Android POP bearer only. Firebase tokens are not authorization. APIs reject client identity/definition/mapping targets, nested JSON, unknown keys/options, unsafe URLs, stale revisions, draft definitions, wrong profile owner/kind/category/template, incompatible modules, replayed completion, and oversized draft payloads. No executable schema exists.

# 33. Privacy Review

Profile lifecycle remains `DRAFT`; Phase D does not auto-publish. New contact fields disable their public visibility flags. New destinations, services, branches, gallery attachments, and missing modules default non-public. Draft answers are cleared after completion and never sent to Firebase Analytics.

# 34. API Changes

Added shared endpoints:

- `GET /api/onboarding/current`
- `POST /api/onboarding/start`
- `POST /api/onboarding/progress`
- `POST /api/onboarding/complete`

All use the existing POP current-user/CSRF-or-bearer policy. No Android-specific business endpoint was created.

# 35. Prisma Changes

Added definition/step/question/option/condition models and bounded enums. Extended `OnboardingProgress` with profile/definition/version/current-step/revision/draft/initial fields and relations. Added inverse relations on Profile, ProfileCategory, ProfileTemplate, and ProfileModuleDefinition. No Card or VirtualCard identity relation was added.

# 36. Migration

Created:

`packages/db/prisma/migrations/20260725200000_dynamic_onboarding_engine/migration.sql`

It is additive only. It creates enums/tables/indexes/foreign keys and extends `OnboardingProgress`.

MIGRATION APPLIED: NO.

The controlled definition seed was also not run.

# 37. Automated Tests

Web: PASS — 46 suites, 212 tests, 0 failures. New coverage includes resolution precedence/fallback, published-only selection, retired version resume, branching, required/optional validation, unknown keys/options, URL/payload bounds, renderer registry/navigation/resume/RTL contract, ownership, kind/category/template mismatch, module compatibility, stale revisions, exact pinning, idempotent completion, legacy preservation, conservative visibility, and transaction ordering.

Android: PASS — 16 suites, 58 tests, 0 failures/errors/skips. New tests cover native type policy, unknown-type failure, branching, required/optional behavior, visible progress, step answer scoping, retry/resume state, Arabic RTL policy, and Firebase-independent onboarding.

# 38. Builds / Lint

- `pnpm db:generate`: PASS.
- `pnpm --filter @popwam/db lint`: PASS.
- `pnpm --filter ./apps/web lint`: PASS.
- `pnpm --filter ./apps/web test`: PASS.
- `pnpm --filter ./apps/web build`: PASS.
- `pnpm i18n:audit`: PASS.
- Android `testDebugUnitTest`: PASS.
- Android `assembleDebug`: PASS.
- Android `lintDebug`: PASS.

The equivalent Gradle `--project-prop popwam.firebase.android.enabled=true` syntax was used because the short `-P` form is parsed incorrectly by this PowerShell/Gradle wrapper.

# 39. Android Runtime

`adb devices` returned no attached authorized device.

ANDROID RUNTIME DEVICE TESTS: NOT RUN.

No emulator, AVD, QEMU, or virtual device was created, started, or used.

# 40. Backward Compatibility

Phase C legal/bootstrap/passkey behavior remains authoritative. New accounts route bootstrap → optional passkey → Phase D onboarding → Home. Existing users without pinned Phase D progress return `BYPASSED`. Existing pinned progress resumes. Legacy ambiguity remains in the Phase C compatibility state and is not auto-rewritten. Dashboard/public/profile/card routes remain intact.

# 41. Remaining Gaps

1. Apply the new additive migration through the approved database process; it was not applied here.
2. Run the guarded onboarding definition seed after migration through the approved process; it was not run here.
3. Validate the full Web/Android shared resume and completion flow against a migrated non-production database.
4. Validate Android on an authorized physical device.
5. Before publishing an IMAGE question, add a dedicated draft-media upload/remove/orphan-cleanup contract shared by Web and Android.
6. The current one-progress-per-user compatibility model covers the primary Phase D flow; future additional-profile onboarding should receive a separately keyed per-profile progress model or an approved additive evolution.
7. Phase C.2 operational passkey prerequisites remain as previously reported and were not changed by Phase D.

# 42. Phase D Exit Criteria

LOCAL ENGINEERING EXIT: PASS.

Definitions are server-owned/versioned, assignment is published-only, resolution is Profile-derived with fallback, branching/validation/mappings are bounded, progress is resumable and pinned, both clients use one contract, finalization is transactional/idempotent, existing values and privacy are preserved, analytics is answer-free, builds/tests/lint pass, and no prohibited external action occurred.

PRODUCTION/RUNTIME ACTIVATION: NOT COMPLETE until the migration/seed and non-production/real-device validation in section 41 are approved and completed.

# 43. Recommended Phase E

Phase E should implement the profile draft/preview/publish lifecycle: explicit publish readiness rules per profile kind/category, a Web/Android preview surface, field/module visibility review, explicit publish/unpublish actions, public projection tests, and safe slug/share behavior. It should also introduce the dedicated draft-media lifecycle required before enabling IMAGE onboarding questions. It must not add booking, order, payment, inventory, or arbitrary module schemas.

Recommended model/reasoning: GPT-5.6 with High reasoning.
