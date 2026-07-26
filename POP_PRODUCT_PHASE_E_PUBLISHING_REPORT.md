# 1. Executive Summary

Phase E is implemented locally. Canonical profiles now use an explicit draft/readiness/publish flow backed by immutable normalized revisions and an atomic publication pointer. Web and Android use the same authenticated preview, visibility, lifecycle, and draft-media APIs. Public readers consume the last published revision and never the working Profile rows. No deployment, commit, migration application, production database access, Railway change, Firebase Console change, Meta change, emulator, AVD, or QEMU operation occurred.

# 2. Existing Publication Audit

Before Phase E, `/p/[slug]`, `/p/id/[profileId]`, Card/Tag profile resolution, metadata, and vCard delivery read the mutable `Profile`, `ProfileField`, `Destination`, `ProfileService`, `ProfileBranch`, and `UploadedFile` rows directly. Legacy `Profile.isPublic` could therefore make identity/contact/link/service/branch/file edits public immediately. Avatar/cover and Android media uploads wrote directly to the public R2 delivery path. `show*`, item `isVisible`, and public module checks filtered rendering, but there was no immutable last-known-good public version. Phase D did leave new canonical profiles in `DRAFT`; this reduced exposure but did not provide publication revisions.

# 3. Profile Lifecycle

The approved `DRAFT`, `PUBLISHED`, `PAUSED`, and `ARCHIVED` lifecycle is retained. Publish revalidates and moves a draft/paused profile to `PUBLISHED`. Pause is valid only from `PUBLISHED`; resume is valid only from `PAUSED`. Archive is allowed from `DRAFT` or `PAUSED`, retains all data/history, and refuses to archive a current primary profile. Normal unpublish/archive never deletes a Profile, slug, Card, destination, or analytics history.

# 4. Draft Architecture

The canonical `Profile` and its typed child rows are the working draft. `draftRevision` provides optimistic concurrency for Phase E mutations, while a deterministic SHA-256 draft fingerprint covers scalar presentation state and normalized child collections, including deletions that do not increment the version. `draftSlug` separates an unpublished slug choice from the currently shared canonical slug.

# 5. Revision Architecture

`ProfileRevision` stores fixed typed profile presentation columns rather than an arbitrary profile JSON blob. Normalized revision children cover modules, fields, destinations, legacy files, services, branches, and public media references. Template configuration remains narrowly scoped configuration JSON, consistent with the existing controlled template model. Every revision has a monotonic per-profile number, source draft revision, draft fingerprint, publication status, access policy, and publication time.

# 6. Public Publication Pointer

`ProfilePublication` is the one-row atomic pointer from a Profile to its current immutable revision. Public readers resolve this pointer. A failed transaction cannot replace it, so the previous public version remains intact. Superseded revisions remain retained.

# 7. Readiness Engine

The server returns `ready`, the current draft revision/lifecycle/access, and controlled issues containing `code`, `path`, optional `module`, `severity`, `messageKey`, and `blocking`. It validates lifecycle, identity, kind, category/template compatibility, access, slug, media policy, and required module state/content. Clients display the result but do not decide readiness.

# 8. Required Module Rules

`ProfileTemplateModule.required`, `ProfileModuleDefinition`, and `ProfileModule` remain authoritative. Missing, disabled, or non-public required modules block publication. Identity is a minimum public requirement for all canonical profiles. Controlled content checks exist for required CONTACT, LINKS, SERVICES, BRANCHES, and GALLERY modules. Optional modules do not block publication.

# 9. Personal Publish Policy

All new canonical personal profiles use explicit publish. Identity, about, contact, links, field visibility, media, and presentation changes remain draft-only until a successful publish. Pre-canonical rows with no `profileKind` retain a deliberately narrow legacy live fallback until migration.

# 10. Business Publish Policy

Business identity, contact, services, branches, links, gallery, and template presentation are snapshotted into a single immutable revision. Public readers switch atomically through `ProfilePublication`. Menu and booking placeholders are not required unless a future controlled template rule explicitly makes them required.

# 11. Visibility

Profile access supports `PUBLIC`, `UNLISTED`, and `PRIVATE`. Module/media visibility uses controlled `PUBLIC`, `FRIENDS`, `ONLY_ME`, and existing `UNLISTED` values. First-party review UIs expose simple profile, module, media, and supported field visibility. New media defaults to `ONLY_ME`; Phase D-created rows keep conservative visibility. `FRIENDS` and `ONLY_ME` modules/items never enter a public revision.

# 12. First Publish Review

Web and Android require an explicit first-publish review acknowledgement in addition to server readiness. Double taps are disabled while a request is running. The server revalidates regardless of client state.

# 13. Publish Transaction

Publish authorizes the owner or an organization OWNER/ORG_ADMIN, rejects a stale `draftRevision`, re-evaluates readiness, checks slug/history ownership, compares the draft fingerprint for idempotency, creates normalized revision rows, marks referenced public media published, swaps `ProfilePublication`, updates lifecycle/canonical slug, and writes AuditLog entries in a serializable transaction.

# 14. Pause / Unpublish

Pause changes a published Profile to `PAUSED` without deleting the publication pointer or history. Public profile and current-revision media delivery return unavailable while paused. Resume restores the same last published revision. Cards and permanent URLs remain unchanged.

# 15. Archive

Archive retains the Profile and all revisions, prevents public delivery, and records `archivedAt`. A current primary Profile cannot be archived through this endpoint, preserving the Phase B primary invariant. A published profile must be paused before archive.

# 16. Public Projection

One canonical projection now serves slug, ID, Card, Tag, metadata, and vCard readers. Canonical mode reads only the current published revision. It strips hidden/private scalar fields, filters children by public module/item state, treats absent canonical modules as non-public, excludes draft/FRIENDS/ONLY_ME media, and blocks paused/archived profiles. The only fallback reads existing live rows when `profileKind` is null and legacy `isPublic` is true.

# 17. Public Route Compatibility

`/p/[slug]`, `/p/id/[profileId]`, `/[shortCode]`, and `/t/[token]` remain. Public metadata and vCard now use the hardened projection. Card/Tag analytics and destination resolution remain in their existing resolver. UNLISTED profiles receive no-index/no-follow metadata.

# 18. Slug Policy

Slugs use NFKC normalization, lowercase ASCII, dash collapsing, a 3-63 character bound, reserved-word rejection, and no path/special-character acceptance. Collision checks cover current and historical slugs. Draft slug edits do not affect the current shared URL before publish.

# 19. Slug History

`ProfileSlugHistory` permanently binds old slugs to their owning Profile. The old canonical slug is inserted transactionally when a changed draft slug publishes. `/p/[slug]` resolves history and redirects to the current canonical slug. Another profile cannot claim a historical slug.

# 20. Card / Tag Compatibility

Publishing never rewrites Card, Tag, NFC, active destination, or permanent URL records. Profile-target resolution uses the publication state; specific destination redirects retain existing behavior. Paused profile targets are unavailable. The Android virtual-card profile URL was aligned to the existing `/p/[slug]` route.

# 21. Owner Draft Preview

`GET /api/profiles/[profileId]/publishing` is owner/team authenticated through the shared POP current-user resolver. It returns the server readiness result and a controlled `OWNER_DRAFT`-equivalent projection. There is no public draft URL, preview token, bearer token in a URL, or Firebase authorization.

# 22. Web Preview

`/dashboard/profile/publish` provides an authenticated native React preview with draft lifecycle badge, identity/link presentation, profile/module/media/field visibility review, safe draft slug editing, structured readiness issues, first-publish acknowledgement, publish, pause, resume, loading, retry, and disabled in-flight actions. The existing profile editor links into it and no longer presents the public page iframe as a draft preview.

# 23. Android Preview

Android has a native Compose preview using the same API DTO and POP bearer authority. It shows draft state, native identity/link cards, readiness, profile/module/media/field visibility, slug editing, first-publish acknowledgement, publish, pause, and resume. No WebView, emulator, Firebase authorization, or device-specific duplicate business rules were introduced.

# 24. Draft Media Architecture

`ProfileMediaAsset` records user, profile, purpose, MIME, byte size, private storage key, state, visibility, ordering, dimensions placeholders, expiry/orphan/deletion timestamps, and optional legacy/public-delivery metadata. States are `TEMPORARY`, `DRAFT_ATTACHED`, `PUBLISHED`, `ORPHANED`, and `DELETED`. R2 stores bytes; PostgreSQL remains authorization authority.

# 25. Upload Contract

Web and Android use `POST /api/profiles/[profileId]/media` with an authenticated multipart file and controlled purpose. The server generates the private object key; clients cannot supply bucket keys or credentials. Owner preview bytes are available only from an authenticated media route. `R2_PRIVATE_BUCKET_NAME` is required and the contract fails closed when private storage is not configured.

# 26. Image Security

Only JPEG, PNG, and WebP are accepted. Filename extension, declared MIME, maximum size, and magic-byte signature must agree. The owner/media routes use `nosniff`; public revision delivery adds a restrictive CSP and reauthorizes the current published revision on every request. Web crop processing emits a fresh WebP and strips original metadata. Android uploads are signature-validated server-side; a dedicated server-side decode/re-encode pipeline for all Android images remains a future defense-in-depth improvement.

# 27. Media Cleanup

`profile-media-cleanup.ts` is dry-run by default and requires `--execute` for mutation. It classifies expired temporary and grace-expired orphan assets, excludes media referenced by the current publication, deletes private/public objects only in execute mode, and marks records deleted. No scheduler was created or deployed.

# 28. Media Publication

Only explicitly `PUBLIC` media attached to a `PUBLIC` IDENTITY or GALLERY module enters a revision. Publication changes its authority state to `PUBLISHED` inside the same database transaction. Bytes remain in the private bucket and `/api/public-profile-media/[mediaId]?revision=...` delivers them only when that exact revision is the current publication and the Profile is published. Existence in R2 alone never grants public delivery.

# 29. IMAGE Onboarding Readiness

Optional Personal photo and Business logo IMAGE questions are enabled in the controlled seed. Web and Android both upload through the new private draft-media contract and save only the owned media ID in onboarding answers. Completion validates user/profile ownership, MIME, size, state, and count. No image is required and uploaded onboarding media remains `ONLY_ME` until visibility review.

# 30. Legacy Media Compatibility

Existing `UploadedFile.publicUrl`, avatar, cover, and logo content remains intact. Canonical publication can snapshot explicitly visible legacy files/media where the corresponding module is public. No bulk media migration or deletion was attempted.

# 31. Concurrency

Phase E mutations require `expectedDraftRevision`; stale updates/publishes return 409. Serializable publication plus a content fingerprint handles double submission, multi-device edits, child deletion, and retry idempotency without creating a duplicate public state.

# 32. Multi-device Behavior

Web and Android operate on the same server draft and revision. A publish from one device updates the single publication pointer. Other devices refetch status/readiness and receive stale conflicts instead of silently overwriting.

# 33. Legacy Profile Compatibility

Existing public profiles with null `profileKind` remain readable through explicit legacy compatibility. Canonical new profiles default to `DRAFT`, `PRIVATE`, and `isPublic=false`. Ambiguous canonical-looking rows without a publication are fail-closed rather than silently republished or rewritten.

# 34. Backfill Dry Run

`profile-publication-backfill-report.ts` is read-only and reports IDs/counts as `LEGACY_PUBLIC`, `LEGACY_PRIVATE`, `NEW_DRAFT`, `ALREADY_CANONICAL`, or `AMBIGUOUS`, with no personal content. It was not executed because the additive Phase E migration was intentionally not applied and no database access was required for this local implementation.

# 35. Analytics

The existing privacy-safe Firebase analytics wrappers emit preview, readiness, publish-started, published, paused, visibility-changed, and draft-media-uploaded events on Web/Android. Allowed metadata is limited to platform, outcome, profile kind/category where already available, module type, and visibility. No profile ID, slug, name, bio, phone, email, URL, filename, media URL, or address is emitted. Analytics failure is non-fatal.

# 36. Audit

PostgreSQL AuditLog records publish, pause, resume, archive, draft/canonical slug change, visibility change, draft media upload, media promotion, and media removal. Metadata contains only controlled policy values and revision numbers, never bytes or profile content.

# 37. Security Review

Phase E protects against cross-owner/team publication, stale publication, public draft URLs, private module/item leakage, client readiness claims, arbitrary slugs/redirects, historical slug takeover, cross-profile media access, client-selected R2 keys, declared-MIME spoofing, public media without a current public revision, and Card resolver bypass of pause. Shared APIs accept NextAuth or POP mobile bearer only; Firebase ID tokens are not POP authorization.

# 38. Privacy Review

Canonical projection nulls hidden contact/identity/social values, excludes draft rows and non-public modules/items, and does not expose owner account email or audit/provider metadata. vCard and metadata now obey the same projection. Draft media requires owner/team authentication. Public media delivery is revision-bound and unavailable during pause. No profile content is stored in Firebase.

# 39. APIs

- `GET|POST /api/profiles/[profileId]/publishing`
- `PATCH /api/profiles/[profileId]/visibility`
- `GET|POST /api/profiles/[profileId]/media`
- `GET|DELETE /api/profiles/[profileId]/media/[mediaId]`
- `GET /api/public-profile-media/[mediaId]?revision=...`

The first four shared management contracts use NextAuth or POP mobile bearer through `getCurrentPopUser`. The public-media route authorizes through the current publication relation, not Firebase.

# 40. Prisma Changes

Added `ProfileAccess`, `ProfileRevisionStatus`, `ProfileMediaState`, and `ProfileMediaPurpose`; `Profile.access`, `draftRevision`, and `draftSlug`; normalized revision/publication child models; `ProfileSlugHistory`; and `ProfileMediaAsset`. Changes are additive. Existing Phase B Profile/Card/VirtualCard identity roles remain unchanged.

# 41. Migration

Created `packages/db/prisma/migrations/20260725233000_profile_publishing_foundation/migration.sql`.

MIGRATION APPLIED: NO.

No destructive DROP or RENAME is present.

# 42. Automated Tests

Web: 47 suites, 222 tests passed, including 10 Phase E publication/media policy tests. Android: 17 suites, 61 tests passed, including first-publish review, republish, and double-tap publication policy. No live Firebase or emulator was required.

# 43. Builds / Lint

- `pnpm db:generate`: PASS
- `pnpm --filter @popwam/db lint`: PASS
- `pnpm --filter ./apps/web lint`: PASS
- `pnpm --filter ./apps/web test`: PASS (47/47 suites, 222/222 tests)
- `pnpm --filter ./apps/web build`: PASS (129 static pages generated; Phase E routes included)
- `pnpm i18n:audit`: PASS (239 Web keys, 350 Android keys, 0 hardcoded candidates, 0 unused candidates)
- Android `testDebugUnitTest`: PASS (17 suites, 61 tests)
- Android `assembleDebug`: PASS
- Android `lintDebug`: PASS
- `git diff --check`: PASS; only Windows LF-to-CRLF warnings were emitted.

# 44. Runtime Device

`adb devices` returned no devices.

ANDROID RUNTIME DEVICE TESTS: NOT RUN.

No emulator, AVD, or QEMU was created, started, or used.

# 45. Remaining Gaps

No code-level Phase E blocker remains. Operational enablement still requires controlled review/application of the additive migration and configuration of a private R2 bucket; neither was performed under this task's safety boundary. The read-only backfill classification and cleanup entrypoint were created but not run. A universal server decode/re-encode pipeline for Android-origin images is recommended as defense in depth before high-volume media use.

# 46. Phase E Exit Criteria

PASS at implementation/build/test level. The canonical draft/public lifecycle, last-known-good revision, readiness, explicit visibility, first-publish review, transactional/idempotent publication, safe pause, route/slug/Card compatibility, shared Web/Android preview, private draft media, revision-bound public media, optional IMAGE onboarding, legacy fallback, Firebase supplementation, and safety constraints are all represented and validated locally.

# 47. Recommended Phase F

Proceed with **POP PRODUCT REDESIGN — PHASE F: HOME / PROFILE EDITOR / MODULE MANAGEMENT UX**. Build the unified server-driven Home editor on top of Phase E's draft projection: section navigation, typed module edit surfaces, per-field visibility actions, save/retry/conflict UX, media management, readiness fix deep-links, and publish review entry points on Web and Android. Do not alter the publication authority or introduce booking/order/payment engines. Recommended execution model: `gpt-5.6-sol` with `high` reasoning for the cross-platform state, accessibility, and regression surface.
