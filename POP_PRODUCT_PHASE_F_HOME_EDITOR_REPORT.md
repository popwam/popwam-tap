# 1. Executive Summary

Phase F is complete locally. The authenticated Web and Android Home experiences are now profile-first and use one server-owned editor contract for profile selection, quota context, draft content, typed modules, visibility, media, readiness, and optimistic concurrency.

All Phase F edits remain draft-only. Phase E remains the only publishing authority, `Profile` remains canonical, and neither `Card` nor `VirtualCard` is used as profile identity. Firebase remains supplementary and Meta behavior is unchanged.

The Phase F exit criteria pass. Additional-profile onboarding is intentionally gated after quota inspection because the approved Phase D `OnboardingProgress.userId @unique` invariant is not safe for concurrent per-profile onboarding. The UI is actionable and explains the real usage, allowance, and product path; it does not create unsafe progress or a duplicate profile.

# 2. Existing Dashboard Audit

The prior Web dashboard was a generic statistics/quick-actions surface. Profile editing, cards, tags, integrations, templates, publishing, and settings were distributed across separate routes. Android similarly centered navigation around compatibility card/product routes rather than the canonical Profile.

The audit classified the existing surfaces as follows:

- Reuse: Phase E preview/readiness/publishing, private media APIs, current Compose design system, shared POP authentication, integrations, cards/tags/activation, plans, and existing deep routes.
- Move/consolidate: canonical profile editing and preview into Home; cards/tags/activation into Share; secondary working destinations into Menu.
- Deprecate later: the old generic dashboard presentation and fragmented legacy profile-edit entry points.
- Preserve: all existing deep routes. No legacy route was deleted in Phase F.

# 3. New Home Architecture

`/dashboard` and the Android `home` destination now load:

1. Server-backed profile selector and status.
2. Public-style draft preview.
3. Typed module cards and focused editing actions.
4. Draft/published change state.
5. Compact Phase E readiness.
6. Preview and Phase E publish-review entry.

The clients do not decide business eligibility. They render the server projection and send typed mutations.

# 4. Profile Selector

`GET /api/profiles` returns authorized, non-archived profiles plus selection and quota context. Both clients show an internal display label, profile kind, Primary marker, and Draft/Published/Paused state without displaying an internal identifier.

Single-profile users receive a simple current-profile presentation. Multi-profile users receive a dropdown/sheet and explicit server reload when switching. Android retains the selected profile in UI state but revalidates it through the server projection.

# 5. Primary Profile

The Primary marker is read-only in Phase F. It comes from the server and is never inferred or arbitrarily toggled by either client. No new primary-changing path was introduced.

# 6. Additional Profiles

The Add Profile control is clickable rather than a dead disabled button. Its server response includes used and allowed counts, entitlement/plan context, whether onboarding is safe, and a machine-readable blocker.

No additional profile is created until a safe profile-scoped onboarding contract exists. This protects existing primary and additional profiles from duplicate creation or progress collision.

# 7. Profile Quota UX

Quota is calculated on the server from the plan limit plus `ProfileEntitlement.profileLimitIncrement`. Clients render values such as `1 of 1 profiles used` from the response and provide an existing plan/product route when more allowance is needed.

No plan value is hardcoded in Web or Android.

# 8. Editor Projection

`GET /api/profiles/[profileId]/editor` returns one bounded projection containing:

- Profile summary, kind, selector label, lifecycle state, and Primary marker.
- Draft revision and current published revision indicator.
- Template/module definitions and instances.
- Typed identity, about, contact, link, service, branch, and media content.
- Module, field, and media visibility.
- Public-style draft preview.
- Phase E readiness and changed-section summary.
- Permissions and profile quota/onboarding context.

Provider tokens, Firebase UID, authentication secrets, and unrelated internal security data are not projected.

# 9. Preview Reuse

The editor projection reuses the Phase E profile-preview and publication semantics. Web and Android render the same ordered modules, typed content, visibility, media, and readiness meaning used by the public/publishing pipeline instead of maintaining a separate business projection.

# 10. Module Registry

The server and clients use a code-owned editor registry for:

`IDENTITY`, `ABOUT`, `CONTACT`, `SOCIAL`, `LINKS`, `SERVICES`, `PORTFOLIO`, `GALLERY`, and `BRANCHES`.

The server still owns which definitions are required, allowed by the selected template, enabled, visible, and orderable. Unknown or future modules receive a safe unsupported state. No server-provided executable UI or arbitrary JSON form is evaluated.

# 11. Identity Editor

The focused Identity editor supports the canonical public display name, profession/title, business/public name as represented by the existing typed model, and the distinct internal selector label. Inputs are bounded and profile-kind aware.

Canonical draft media remains on the Phase E private media path. No new public upload authority was introduced.

# 12. About Editor

The About editor saves bounded plain text only. It supports bio/about and the existing typed title/description placement without arbitrary HTML or a new rich-text/CMS subsystem.

# 13. Contact Editor

The Contact editor supports the existing typed email, phone, alternate phone, WhatsApp, localized addresses, and related contact fields. It exposes only the existing controlled visibility levels and validates email/field bounds server-side.

Sensitive values are not copied into analytics or generic audit metadata.

# 14. Links / Social Editor

Manual links and social destinations use the canonical typed link/destination compatibility model. Users can add, edit, delete, reorder, and set visibility. URL values and approved destination types are validated by the server.

The implementation does not create an arbitrary destination/category system.

# 15. Connected Account Surface

The editor links to the existing connected-account/integration route as an optional way to add provider data. `ConnectedAccount` remains separate from POP authentication. Meta scopes, callbacks, provider behavior, and authorization were not changed.

# 16. Services Editor

Services use the existing `ProfileService` compatibility model and support name, description, optional display price/URL where represented, visibility, deletion, and ordering.

No catalog, checkout, order, payment, or customer-inventory behavior was added.

# 17. Branch Editor

Branches use the existing `ProfileBranch` model and support name, localized addresses, phone, map URL, visibility, deletion, and ordering. No background location permission, inheritance engine, or catalog assignment was introduced.

# 18. Gallery / Media Editor

Gallery uses the Phase E `ProfileMediaAsset` private draft-media endpoints. Web and Android support document/image selection, upload, preview, visibility, deterministic reorder, and remove.

Uploads pass the expected draft revision. Delete also supports revision comparison. Media referenced by the current publication continues to follow Phase E orphan-retention rules and is not physically removed prematurely.

# 19. Portfolio Handling

Portfolio is implemented as a typed LINKS-based editor surface. Phase F does not create a new CMS or content-entry subsystem.

# 20. Module Add / Disable / Reorder

Add Section lists only modules that are:

- Allowed by the current server template/category policy.
- Not already instantiated.
- Supported by the client registry.

Optional modules may be enabled, disabled, and reordered. Required modules cannot be disabled and carry the explanatory required state. The server validates membership, duplicate prevention, required status, allowed status, supported type, and the exact submitted ordering.

# 21. Visibility

Controlled `PUBLIC`, `FRIENDS`, and `PRIVATE`/Only me semantics are used where Phase E supports them for modules, fields, and media. Invalid values are rejected. No custom ACL was added.

# 22. Draft State

Every Phase F mutation writes only the live draft models and increments `Profile.draftRevision` once. No mutation updates `ProfilePublication`, the current published revision, or its immutable snapshot.

The editor marks changed sections and displays Draft changes while the published public version remains unchanged until the existing Phase E publish transaction succeeds.

# 23. Save / Retry

Focused forms use explicit save; structural changes are explicit actions. Clients distinguish local input from server state with Saving, Saved, Failed to save, Retry, and conflict states.

Double taps are guarded while a mutation is active. After success, clients replace local editor state with the authoritative server response. Network/server failures remain recoverable and do not claim a save.

# 24. Optimistic Concurrency

All Phase F editor mutations carry `expectedDraftRevision`. The server locks/rechecks the profile inside a serializable transaction. A stale revision returns HTTP 409 without overwriting newer state.

Clients show that the profile changed elsewhere and provide refresh/reload behavior. Media upload/delete can now use the same revision contract.

# 25. Readiness Integration

Home displays the Phase E readiness summary, issue count, and issue-to-module mapping. Selecting a readiness issue opens the relevant focused editor where possible. Readiness remains server-owned.

# 26. Publish Review Entry

Preview and Publish changes lead to the existing Phase E publishing surface. The Web route now accepts an explicit selected-profile query and authorizes it through the shared profile management rule, enabling safe multi-profile deep links.

No second publishing implementation was created.

# 27. Paused / Archived Profiles

Paused profiles are clearly labeled and remain editable/previewable; their public unavailability is explained. Resume continues to rely on Phase E lifecycle authority.

Archived profiles are excluded from the normal selector and archived draft mutations are rejected. No destructive archive manager was added.

# 28. Empty States

Links, services, branches, gallery, and other optional sections show specific empty-state copy and the relevant add action instead of inert placeholder cards.

# 29. Web UX

Web provides a responsive profile-first Home with a desktop preview/editor split and a single-column small-screen layout. It includes the selector, public-style preview, module cards, focused dialogs, visibility controls, media actions, readiness links, save states, and publish review.

The existing POP visual language is retained. Legacy routes remain live.

# 30. Android UX

Android provides a native Compose Home with a profile selector bottom sheet, preview, typed module cards, focused editor sheets, Add Section, visibility and reorder actions, gallery document picker, readiness navigation, and Phase E publish entry.

No WebView, emulator, AVD, or QEMU was used. Android continues to use POP mobile bearer authentication; Firebase is not an editor authorization source.

# 31. Navigation

Web and Android primary navigation now use `Home | Share | Menu`.

- Home opens the canonical profile editor.
- Share is a compatibility hub to existing cards, tags, activation, and wallet surfaces. It does not pretend to be the future Share Center.
- Menu organizes existing secondary routes such as friends, messages, passkeys, integrations, templates, plan, products, transfers, settings, and ideas.

All prior deep routes remain reachable.

# 32. Additional Profile Onboarding

Option B from the approved brief was selected. Phase D currently stores one progress row per user through `OnboardingProgress.userId @unique`; therefore it cannot safely represent multiple concurrent Profile-scoped onboarding flows.

Phase F inspects and returns the real quota but sets `onboardingSupported: false` with blocker `ONBOARDING_PROGRESS_USER_SCOPED`. The Add Profile sheet explains the state and provides a plan/product path where relevant. It does not misuse a new-account marker, overwrite primary progress, or create an orphan/duplicate Profile.

A future enabling change should be a separately reviewed additive per-profile progress evolution, with migration created but not applied until explicitly authorized.

# 33. Legacy Editing Compatibility

Legacy profiles remain selectable and editable. Existing profile kind and typed compatibility data are projected conservatively. Existing profile/public/card routes were not removed, and the editor never rewrites ownership, primary selection, or profile identity on load.

# 34. Migration-On-Edit

No automatic migration-on-load occurs. Existing canonical records are preferred. Legacy-only data remains available through the current compatibility paths, and canonical link/service/branch records are created or changed only after an explicit user save.

# 35. Localization / RTL

All new user-visible Web strings are present in English and Arabic locale JSON. All new Android strings are present in `values` and `values-ar`. Layout uses framework directionality rather than hardcoded LTR/RTL.

`pnpm i18n:audit` passed with 340 Web keys, 418 Android keys, zero hardcoded candidates, and 14 non-failing possibly-unused legacy dashboard keys.

# 36. Accessibility

Web uses semantic controls, labels, status messaging, visible focused actions, keyboard-operable native dialogs, and responsive layouts. Android uses Compose headings, labeled controls, minimum-sized actions, TalkBack-friendly ordering, bottom-sheet semantics, and IME-safe padding.

No user-visible profile ID is used as a label or navigation affordance.

# 37. Analytics

The existing privacy-safe Firebase wrappers were extended to allow Phase F events:

`home_viewed`, `profile_switched`, `profile_edit_started`, `profile_section_saved`, `profile_module_added`, `profile_module_reordered`, `profile_visibility_changed`, `profile_preview_opened`, `publish_review_opened`, and `add_profile_started`.

Only controlled metadata such as platform, profile kind, category key, module type, visibility, and outcome is eligible. IDs, names, phone numbers, email, bio, links, slugs, filenames, addresses, and service text are excluded.

# 38. Audit

The server records meaningful structural/product operations such as module add/update/reorder, visibility changes, media changes, and editor saves without copying the edited content into generic audit metadata. It does not audit every keystroke.

Primary switching was not implemented, so no Phase F primary-switch audit path was needed.

# 39. Security Review

Every profile read and mutation resolves the current POP user through the shared resolver and scopes access to:

- The Profile owner; or
- Existing organization membership with `OWNER` or `ORG_ADMIN`.

Profile ID, module ID, media ID, and client user ID are never sufficient authority. Nested records are scoped back to the authorized profile. Firebase ID tokens are not POP authorization. URLs, visibility, lengths, template policy, ordering, lifecycle state, and draft revision are validated server-side.

# 40. Privacy Review

Draft media stays private. Provider tokens and Firebase identifiers are excluded from DTOs. Profile content is not sent to Firebase analytics and is not stored in Firestore or Realtime Database. Published content changes only through Phase E review/publish.

Meta was untouched. No new permission, location, Nearby, contact-book, notification, messaging, booking, order, or payment collection was introduced.

# 41. APIs

Phase F added/reused these shared Web/Android contracts:

- `GET /api/profiles`: authorized selector, status, Primary marker, quota, entitlement, and onboarding capability.
- `GET /api/profiles/[profileId]/editor`: server editor projection.
- `PATCH /api/profiles/[profileId]/editor`: typed action mutations for identity, about, contact, links, services, branches, modules, and media presentation.
- Existing `POST /api/profiles/[profileId]/media`: now optionally accepts `expectedDraftRevision`.
- Existing `DELETE /api/profiles/[profileId]/media/[mediaId]`: now optionally accepts `expectedDraftRevision`.
- Existing Phase E publishing/visibility/readiness APIs remain authoritative.

The shared current-user resolver accepts Web NextAuth or Android POP bearer authentication. Firebase is never accepted as POP authorization.

# 42. Prisma / Migration

Phase F made no Prisma schema change and created no migration.

- NEW PHASE F MIGRATION: NO
- MIGRATION APPLIED: NO
- PRODUCTION DATABASE CHANGE: NO

The existing dirty worktree contains approved prior-phase schema/migration work; Phase F did not apply or destructively alter it.

# 43. Automated Tests

Web:

- 49 test files passed.
- 240 tests passed.
- Phase F adds 18 focused tests across server/editor policy and Web Home behavior.
- Coverage includes authorization policy, cross-owner rejection, selector/Primary/quota, additional-profile gating, typed registry, required/allowed modules, CRUD/order/visibility/media, draft-only publication isolation, stale conflict, archived rejection, legacy behavior, one/multiple profile UX, save/conflict/empty/readiness/publish behavior, shared POP authentication, and privacy rules.

Android:

- 18 test result files passed.
- 68 tests passed, zero failures/errors/skips.
- Phase F adds `ProfileHomePolicyTest` and updates navigation tests for Home/Share/Menu.
- Coverage includes selected-profile fallback, required-module protection, supported editor registry, visibility, readiness navigation, deterministic reorder, and navigation compatibility. Existing session/Firebase independence suites also remain green.

No live Firebase service was required.

# 44. Build / Lint

All requested validation commands passed:

- `pnpm db:generate`
- `pnpm --filter @popwam/db lint`
- `pnpm --filter ./apps/web lint`
- `pnpm --filter ./apps/web test`
- `pnpm --filter ./apps/web build`
- `pnpm i18n:audit`
- `apps/android/gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true`
- `apps/android/gradlew.bat assembleDebug -Ppopwam.firebase.android.enabled=true`
- `apps/android/gradlew.bat lintDebug -Ppopwam.firebase.android.enabled=true`
- `git diff --check`

The Web optimized production build generated 132 static pages and completed its type checks. Android lint wrote its normal local HTML report and completed successfully. Gradle reported existing deprecation warnings for future Gradle 9 compatibility; they are not Phase F lint failures.

# 45. Runtime Device Status

`adb devices` returned no connected devices.

**ANDROID RUNTIME DEVICE TESTS: NOT RUN**

No emulator, AVD, or QEMU was created, started, or used.

# 46. Remaining Gaps

The only Phase F product constraint is additional-profile onboarding: approved Phase D progress is user-scoped rather than Profile-scoped. It is safely gated and does not prevent selecting/editing existing additional profiles.

Enabling Add Profile creation requires a future additive per-profile progress design and an explicitly approved, unapplied migration. Full runtime UI testing also remains pending until a real authorized Android device is connected.

Phase E operational prerequisites, including its previously documented unapplied migrations/private storage configuration, remain separate from this local Phase F implementation.

# 47. Phase F Exit Criteria

**PASS**

All 25 Phase F criteria are satisfied locally:

- Profile-first Home, safe selector, Primary marker, and server quota context.
- Module-driven, code-owned Web/Android editors.
- Safe identity/about/contact/link/service/branch/gallery editing.
- Required/optional module and ordering enforcement.
- Draft-only edits, unchanged public revision, and 409 conflict protection.
- Integrated visibility, private Phase E media, readiness, and Phase E publish review.
- Legacy compatibility and shared contracts.
- Supplementary Firebase and unchanged Meta behavior.
- Tests, builds, lint, i18n, and git diff check pass.
- No deploy, push, commit, production migration/change, or emulator activity occurred.

The allowed Option B gating for unsafe additional-profile onboarding is an implemented safety outcome, not a failed Phase F criterion: Add Profile still respects and explains server quota/entitlement without corrupting Phase D progress.

# 48. Recommended Next Phase

Recommended exact next phase:

**POP PRODUCT REDESIGN — PHASE G: SHARE CENTER / QR / NFC / ACTIVATION UX**

Phase G should replace the temporary Share compatibility hub with the canonical share workflow while preserving `Card` as the physical/digital sharing product and keeping Profile as identity. It should consolidate QR, NFC, activation, card assignment, and safe share destinations without changing auth or publishing authority.

Recommended model/reasoning:

**`gpt-5.6-sol` with `xhigh` reasoning**

The phase crosses Web, native Android, NFC/QR security boundaries, physical product lifecycle, activation invariants, and existing legacy routes; the extra reasoning budget is justified for threat modeling and compatibility validation.
