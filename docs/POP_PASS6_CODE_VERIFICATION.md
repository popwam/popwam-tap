# PASS 6 — Android templates and storefront code verification

Date: 2026-09-11. Scope: Android My Profile and directly required APIs only. The canonical authority remains [POP_ADMIN_REBUILD_HANDOFF.md](POP_ADMIN_REBUILD_HANDOFF.md).

Status: **IMPLEMENTED / CODE VERIFIED / AWAITING OWNER PHYSICAL ACCEPTANCE**. Android code, 252 JVM tests, debug assembly/lint, 76 focused Web tests, TypeScript and the final local production Web build passed. No physical acceptance or deployment is included.

## 1. Files inspected

All changed existing files listed below were inspected, along with these direct dependencies. No PASS 1–5 re-audit or repository-wide audit was performed.

- `docs/POP_ADMIN_REBUILD_HANDOFF.md`
- `apps/android/settings.gradle.kts`
- `apps/android/app/src/main/java/com/popwam/pop/data/local/EncryptedSnapshotStorage.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/SecureSessionStore.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt (public WebView integration only)`
- `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt`
- `apps/android/app/src/main/res/values/strings.xml`
- `apps/android/app/src/main/res/values-ar/strings.xml`
- `apps/android/app/src/main/res/values-fr/strings.xml`
- `apps/web/package.json`
- `apps/web/src/app/api/mobile/profiles/[id]/route.ts`
- `apps/web/src/app/api/mobile/profiles/[id]/media/route.ts`
- `apps/web/src/app/api/profiles/[profileId]/media/route.ts`
- `apps/web/src/app/api/profiles/[profileId]/media/[mediaId]/route.ts`
- `apps/web/src/app/api/public-profile-media/[mediaId]/route.ts`
- `apps/web/src/app/dashboard/templates/preview/[templateId]/page.tsx`
- `apps/web/src/app/catalog-actions.ts (template selection only)`
- `apps/web/src/app/actions.ts (existing ProfileService fields only)`
- `apps/web/src/app/layout.tsx (preview renderer dependencies only)`
- `apps/web/src/middleware.ts`
- `apps/web/src/lib/mobile-profile-dto.ts`
- `apps/web/src/lib/profile-preview.ts`
- `apps/web/src/lib/figma-templates.ts`
- `apps/web/src/lib/profile-templates.ts`
- `apps/web/src/lib/profile-projection.ts`
- `apps/web/src/lib/plans.ts`
- `apps/web/src/lib/virtual-cards.ts`
- `apps/web/src/lib/storefront-order.ts`
- `apps/web/src/lib/api-auth.ts`
- `apps/web/src/lib/mobile-auth.ts`
- `apps/web/src/lib/domains.ts`
- `apps/web/src/lib/i18n.ts`
- `apps/web/src/components/public-profile.tsx`
- `apps/web/src/lib/profile-editor.test.ts`
- `apps/web/src/lib/profile-publishing.test.ts`
- `apps/web/src/lib/profile-projection.test.ts`
- `apps/web/src/lib/profile-privacy-contract.test.ts`
- `apps/web/src/lib/profile-template-system.test.ts`
- `apps/web/src/lib/profile-templates.test.ts`
- `apps/web/src/lib/storefront-order.test.ts`
- `packages/storage/src/index.ts (existing image upload checks only)`

## 2. Files modified

Existing implementation/test files:

- `apps/android/app/build.gradle.kts`
- `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/AuthNetwork.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/local/LocalFirstStore.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/repository/LocalFirstRepository.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/repository/PopwamRepository.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileContract.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilePolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/LocalFirstStartupPolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/profile/ProfilePolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/profile/ProfilesViewModelTest.kt`
- `apps/web/next.config.ts`
- `apps/web/src/app/api/mobile/templates/route.ts`
- `apps/web/src/app/api/mobile/virtual-cards/[id]/template/route.ts`
- `apps/web/src/app/api/profiles/[profileId]/editor/route.ts`
- `apps/web/src/lib/profile-editor.ts`
- `apps/web/src/lib/profile-publishing.ts`

New implementation/test/resource files:

- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/DraftTemplatePreview.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ShowcasePolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/TemplateStorefrontEditors.kt`
- `apps/android/app/src/main/res/values-ar/pass6.xml`
- `apps/android/app/src/main/res/values-fr/pass6.xml`
- `apps/android/app/src/main/res/values/pass6.xml`
- `apps/android/app/src/test/java/com/popwam/pop/ui/profile/ShowcaseLocalFirstTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/profile/ShowcasePolicyTest.kt`
- `apps/web/src/app/api/mobile/templates/[slug]/thumbnail/route.ts`
- `apps/web/src/app/mobile-preview/[profileId]/page.tsx`
- `apps/web/src/lib/mobile-draft-preview.ts`
- `apps/web/src/lib/mobile-showcase-api.test.ts`
- `apps/web/src/lib/mobile-showcase-policy.test.ts`
- `apps/web/src/lib/mobile-showcase-policy.ts`
- `apps/web/src/lib/mobile-showcase-publication.test.ts`
- `apps/web/vitest.config.ts`

Documentation: this report and `docs/POP_ADMIN_REBUILD_HANDOFF.md`. The three original `strings.xml` files have no content changes; new strings live in `pass6.xml`.

## 3. Template mobile API/data contract

`GET /api/mobile/templates` reuses the existing endpoint. POP mobile authentication is required. It queries only the 17 approved registry slugs and emits an explicit safe DTO: `id`, `slug`, `nameAr`, `nameEn`, `minimumPlan`, `isActive`, `family`, `variant`, `profileKind`, `previewImageUrl`, `allowed`, plus response `planSlug`. No configuration object, source HTML, React, or stylesheet is included.

`GET /api/mobile/templates/[slug]/thumbnail` returns generic schematic SVG artwork from approved safe registry colors, with no customer data. Invalid thumbnail references fall back to this artwork. These are illustrative thumbnails, not screenshots of populated templates.

## 4. Android Template section

A new My Profile editing section uses the existing section destination. Its collapsed summary shows the localized saved template name. The picker uses an adaptive two-column grid, lazy thumbnail loading, localized family labels, saved/selected indicators, and locked Plan states. PERSONAL and BUSINESS filter from server metadata; inactive entries are hidden. Server validation remains authoritative.

Catalog cache belongs to the existing encrypted account snapshot. It is read first and refreshed only on explicit picker entry when absent or at least one day old. Failed refresh retains cached catalog data. No catalog or preview-image startup preload was introduced. Existing template names use the backend Arabic/English content model; French UI falls back to approved English names.

## 5. Draft Template Preview

Route: `/mobile-preview/[profileId]?templateId=...`.

The route requires a POP bearer session and verifies strict ownership, approved active template, profile kind, theme entitlement, Plan rank and storefront availability. It reads the current draft and overrides only the in-memory preview template. It reuses `PublicProfile`; no Admin fixtures are imported and no mutation/publication call occurs. Responses are dynamic, private/no-store, noindex/nofollow/noarchive, with a restrictive CSP.

Android displays the preview in a full-size dialog. The authenticated client fetches only the exact trusted HTTPS preview document and that profile's private media. It refuses redirects and never hands session headers to WebView or external image destinations. File/content access, mixed content, DOM storage, extra windows and navigation are disabled. There is no JavaScript bridge. JavaScript is enabled only to render the trusted Next streamed page; CSP and request filtering constrain its resources. The WebView is stopped and destroyed on dismissal.

The existing My Profile primary Preview action still opens the published public profile.

## 6. Template save behavior

`TEMPLATE_SELECT` uses the existing revision-checked editor mutation. It validates the selected template, updates `Profile.templateId`, mirrors `VirtualCard.themeId`, and increments `draftRevision`. It never changes the current published revision or publishes automatically.

Android requests the updated editor snapshot in the mutation response, persists it into encrypted LocalFirst, and updates the visible section. Normal Publish is still required to change public rendering.

## 7. Products and Services

BUSINESS profiles receive a section with product/service counts, compact cards, image, localized name/type, optional price/currency/category, featured and visibility state, and edit controls.

Add offers PRODUCT/SERVICE selection only when both are permitted. The editor preserves both existing Arabic and English name/description fields and existing optional URL data. It supports image upload/replacement/removal, category, featured and visibility. Deletes require a confirmation dialog, and the local list changes only after success. Move Up/Down uses the existing SERVICE_REORDER action; the server checks the complete scoped ID set.

A hidden/missing SERVICES module is called out, with the existing Add Module/Update Module actions available. Contact module visibility remains managed by the existing editor navigation.

## 8. PRODUCT/SERVICE entitlements

The deployed six Plan fields remain authoritative: `storefrontEnabled`, `storefrontProductsEnabled`, `storefrontServicesEnabled`, `storefrontMaxItems`, `storefrontWhatsappOrder`, `storefrontEmailOrder`.

Disabled storefront or neither item type means no creation. Product-only and service-only plans expose the respective editor. Server-side creation/edit checks reject disallowed item types. Existing owned delete/reorder operations remain available for housekeeping.

## 9. maxItems

NULL remains unlimited. Finite limits count the complete collection, including hidden entries, and the UI shows used/limit. The revision-checked, locked transaction enforces creation limits. Reordering uses the actual collection size; no fake unlimited count is introduced.

## 10. Optional price

Missing price stays NULL/blank. Explicit zero remains zero. Validation accepts non-negative decimals up to DECIMAL(14,2) capacity and rejects negative, excess precision, exponent notation and overflow. Currency uses the existing optional three-letter uppercase representation; it is not a new currency catalogue or commerce price model.

## 11. Image upload

Uploads reuse `POST /api/profiles/[id]/media` with purpose GALLERY, expected revision, existing MIME/signature validation and storage quota/security checks. The editor receives the configured upload byte limit from the backend (default 5 MB).

Upload success immediately adds the returned private media reference and revision to the encrypted editor snapshot without a follow-up bootstrap or media request. Item replacement/removal updates the reference. Unreferenced uploads remain in the existing private media domain.

A selected owner media reference remains private before Publish. Publishing maps it to the existing revision-bound public media endpoint and includes its media reference in that revision. It does not expose raw storage keys or add a public upload backend.

The shared image client's authentication and refresh handling now restrict credentials to the configured API origin, so external item/thumbnail images cannot receive POP tokens.

## 12. WhatsApp/Email summary

The section shows Plan-permitted channels, public contact validity and Contact module visibility. Missing public contact links to the existing Contact editor; a hidden Contact module links to existing visibility management. There is no entitlement override toggle. Only profile public-contact fields and visibility flags are used, never authentication/recovery phone or private account email. Published state still decides the visitor's actual CTAs.

## 13. LocalFirst

The same AES-256-GCM/Android Keystore account snapshot stores the extended editor fields and small catalog metadata. Encryption implementation, schema version and account binding remain unchanged. A small storage interface provides an in-memory seam for JVM repository tests; the production implementation is still the encrypted store.

Mutation responses persist a server editor snapshot; older responses cannot replace a newer cached revision. Account checks prevent saving into a switched account. Conflict recovery refreshes only the affected editor. Share cache/preload paths and startup core loading remain unchanged.

## 14. Offline behavior

Selected template summary, cached showcase list and item details remain readable offline. No write queue was added. IOException maps to a localized connectivity error and leaves the session and cache intact. Failed writes retain form/list content and clear loading state. Genuine HTTP 401 retains the existing session-expiry behavior.

## 15. Cached startup

STATIC / ARCHITECTURAL verification only: normal fresh cached launch still targets 0 requests. JVM tests execute the real LocalFirst core with a fake API that fails on any unexpected request. Explicit stale/daily synchronization remains the accepted exception.

## 16. Backend/API changes

- Extended existing mobile template catalog; added safe generic thumbnail route.
- Added narrow authenticated owner draft-preview page/helper.
- Extended the existing profile editor response with storefront summary and upload size.
- Extended SERVICE_UPSERT with existing showcase fields and validations.
- Extended TEMPLATE_SELECT with approved template/Plan validation and card mirroring.
- Optional `snapshot=true&locale=...` mutation response returns the editor snapshot.
- Legacy mobile card-template selection delegates to the same draft mutation.
- Publishing maps owner item-image references to revision-bound public media.
- API failures do not return arbitrary exception text.

No database model, table or migration was added.

## 17–18. Server validation and privacy

Ownership, active registry membership, account kind, theme/Plan eligibility, item type entitlement, item limits, names (160 chars), optional descriptions (1000 chars), category (120 chars), price/currency, image reference ownership, visibility and complete reorder IDs are checked server-side.

Focused route/transaction tests reject anonymous catalog/preview access, another owner's draft, incompatible/disallowed templates, foreign item/media IDs and invalid item data. Public projection tests demonstrate that edits to draft template/items do not alter the previous public projection; choosing the next published snapshot exposes the new values. No cart, checkout, order, payment, stock, shipping or tax behavior was added.

## 19–21. Verification results

- Android focused ShowcasePolicy JVM run: 8 passed.
- Final `:app:testDebugUnitTest`: 252 passed, 0 failed, 0 errors, 0 skipped.
- `:app:assembleDebug`: passed.
- `:app:lintDebug`: passed, 0 errors; 362 warnings remain. No broad warning cleanup was attempted.
- Focused Web tests: 76 passed across 10 files (policy, route/transaction auth, draft/public isolation, existing editor/publishing/projection/privacy/storefront/template contracts).
- TypeScript/Web lint: `pnpm --filter @popwam/web lint` passed; this repository's lint script is `tsc --noEmit`.
- Final local production Web build: passed, including the mobile catalog, thumbnail and authenticated preview routes.
- `git diff --check`: passed, including final documentation.

No emulator, AVD, physical device, adb, installation, instrumented test or Android UI automation was used. Gradle lint's Android-test source model tasks are static analysis only.

## 22. APK

- Exists: YES.
- Exact path: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`.
- Size: 47,782,724 bytes.
- SHA-256: `BD39DE033E0478B47B3031F66701260DBE873AF98EEA4924F3CF987E0762509C`.
- Package: `com.popwam.pop.debug`.
- versionName: `0.0.12-debug`.
- versionCode: `12`.

Verified from the actual APK using aapt2 and SHA-256 hashing, with matching Gradle output metadata. The APK was not installed.

## 23–24. Static performance/security review

STATIC / ARCHITECTURAL verification only; no measured device latency or profiling is claimed.

No launch-time catalog/entitlement/item request was added, no inactive-profile storefront preload, no Share preload, and no full bootstrap after a PASS 6 item/template mutation. Item upload persists its response locally. Picker thumbnails are lazy. Catalog/cache contain no renderer implementations; the explicit draft-preview WebView renders the authenticated Web page on demand.

Encryption remains AES-256-GCM with a 256-bit Android Keystore key and account-bound authenticated data. No new external-storage writes, token logging, arbitrary WebView credential forwarding or anonymous draft endpoint was introduced. Private item images use the existing authenticated and published-revision media gates.

## 25. Physical acceptance limitations

Not performed by design: real-device layout/RTL, keyboard behavior, image picker, WebView rendering on supported Android versions, connection changes, real publish/contact behavior, and perceived performance remain for owner acceptance.

The 17 catalog thumbnails are schematic references, and exact presentation is provided by draft preview. Arabic/English item content follows the existing domain; French interface labels are supplied without inventing French content columns.

All API changes remain local and undeployed. The APK uses the configured production API base by default; complete end-to-end use of PASS 6 requires the matching API changes to be released in a separately authorized deployment, or a compatible test backend. No deployment is included here.

## 26–27. Handoff and final status

Canonical handoff updated with implementation, final verification results, APK metadata and physical acceptance limitations. PASS 1–5 remain the accepted baseline; PASS 5 remains deployed.

PASS 6 CODE IMPLEMENTATION COMPLETE: YES.

PASS 6 CODE VERIFIED: YES.

PASS 6 PHYSICAL ACCEPTANCE: NOT PERFORMED BY DESIGN.

No emulator started; no physical device used; no adb used; no APK installed; no production deployment; no new migration created or applied; no cart; no checkout; no payments; no commit created. Work stops after code/build verification.
