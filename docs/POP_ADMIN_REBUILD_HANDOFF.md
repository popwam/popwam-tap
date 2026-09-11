# POP by POPWAM — Admin/Web Rebuild Handoff

## 1. Current Status

- PASS 1 — ACCEPTED / CLOSED
- PASS 2 — ACCEPTED / CLOSED
- PASS 3 — ACCEPTED / CLOSED
- PASS 4 — CLOSED
- PASS 5 — CLOSED / DEPLOYED / VERIFIED
- PASS 5A — TEMPLATES 01–06 VISUAL CORRECTION VERIFIED / CLOSED
- PASS 5B — TEMPLATES 07–10 VISUAL CORRECTION VERIFIED / CLOSED
- PASS 5C — TEMPLATES 11–17 VISUAL CORRECTION VERIFIED / CLOSED
- PASS 6 — IMPLEMENTED / CODE VERIFIED / AWAITING OWNER PHYSICAL ACCEPTANCE
- Scope: PASS 1–5 WEB/ADMIN remain the accepted baseline. PASS 6 is Android My Profile templates/storefront and directly required APIs only.
- Android PASS 6: code/static/build verification only; no emulator, physical device, adb, installation, or instrumentation.
- Production deployment: PASS 1–4 remain deployed and verified. PASS 5 was deployed to the existing Railway `popwam-tap` service (`popwam` environment) on 2026-09-10 as deployment `8e74ef4b-2058-458a-aa55-82a57c3a0dfe`.
- Migration state: `20260908190000_plan_storefront_entitlements` was safety-reviewed and applied to Production on 2026-09-10 through `prisma migrate deploy`; all 32 migrations are recorded as applied and there is no failed migration state.
- NO COMMIT CREATED for the accepted rebuild passes. The accepted worktree contains uncommitted work and must be preserved.

## 2. Non-Negotiable Rules

- Do not re-audit completed passes; inspect only the current pass and direct dependencies.
- Do not touch Android unless explicitly requested.
- Do not rebuild working backend/domain systems unnecessarily.
- No destructive deletion without owner approval; no repository-wide cleanup.
- No broad `git reset`, `git restore`, or `git clean`; do not use `git add .`.
- No commit before owner approval.
- No Production deployment unless explicitly requested.

## 3. Accepted Admin Design System

Reuse the existing Dashboard shell and responsive sidebar/navigation, `DashboardPageHeader`, POP cards, semantic `StatusBadge`, `FilterBar`/`SearchField`, responsive `AdminDataTable`, compact selector/action patterns, and the established modal/drawer/sheet presentation. Arabic uses Cairo and RTL; English/French use Montserrat and LTR. Preserve logical direction utilities for icons and keep technical values such as IDs, URLs, ISO codes, and translation keys LTR. Layouts must reflow rather than shrink into unreadable desktop UI, avoid page-level overflow, retain visible focus states, accessible contrast, consistent radii/spacing, and semantic status colors. Do not introduce a second Admin design system.

## 4. PASS 1 — CLOSED

- Overview presents authoritative business KPIs and compact Quick Actions without invented revenue/MRR figures.
- Navigation was simplified; legacy commerce and standalone user-management presentation was removed from primary navigation.
- Users is the canonical user-management list with search, filters, pagination, human identity, role/plan/status, and Manage action.
- `/admin/users/[id]` is the unified User Detail for Overview, Profiles, Links, Devices & Sessions, Subscription & Limits, and Activity.
- Customers, Profiles, User Links, and Devices & Sessions were merged into User Detail; compatibility routes remain redirects/shims rather than destructive domain removal.
- Canonical routes/components: `/admin`, `/admin/users`, `/admin/users/[id]`, `apps/web/src/components/admin-ui.tsx`, and `apps/web/src/components/dashboard-shell.tsx`.

## 5. PASS 2 — CLOSED

- Requests Center at `/admin/requests` consolidates supported subscription, quota, and feature request categories with filters, status summaries, selector-based valid actions, and legacy redirects.
- Link Platforms at `/admin/link-platforms` uses POP catalog cards, platform icons, supported input modes, URL/deep-link builder patterns with fallback, server validation, localization, and focused create/edit presentation.
- Link Platforms is system catalog configuration; `/admin/users/[id]?tab=links` remains user-specific link management. These domains must not be conflated.

## 6. PASS 3 — CLOSED

- Plans at `/admin/plans` use comparative cards, focused grouped editing, real domain limits, explicit Unlimited behavior, feature/analytics flags, efficient subscriber aggregation, and plan-default versus user-override separation.
- Profile-open policy supports Unlimited, daily, or monthly configuration via typed plan-specific settings. It is configuration-only and does not block public visits.
- Notifications at `/admin/notifications` provide paginated campaigns, real targeting, English/Arabic/French content, compact preview/create modal, campaign detail, accurate FCM-acceptance semantics, and grouped failure summaries.
- Known limitations: `Plan` has no authoritative price/billing-period fields; profile-open limit is configuration-only; advanced analytics source/geography/device data is unavailable; there is no true device-delivery/open tracking; scheduling/cancel/duplicate lifecycle is limited by the current notification domain.

## 7. PASS 4 — CLOSED

- Countries: `/admin/countries` presents the authoritative 245-entry `libphonenumber-js` country catalogue, merges persisted `PhoneCountryConfig` overrides, supports localized search/ISO/calling-code and availability filters, per-country editing, and confirmed result-scoped bulk enable/disable. Enabled means exposed through platform bootstrap/phone configuration; this pass does not add a registration/auth block. `/admin/phone-countries` redirects to the canonical route.
- Agreements / Policies: existing `LegalDocument` versions and consent records remain authoritative. Country applicability is stored non-destructively in versioned `SystemSetting` key `legal.country-targeting.v1` as Global, All Supported, or Selected Countries. Resolution is deterministic: requested-locale country match, permitted English country fallback, requested-locale global, then existing English global fallback; single-country beats multi-country and the newest valid published/effective version wins. Managed Terms/Privacy, current-legal API, consent resolution, bootstrap, and readiness use the policy where applicable.
- Account Types: `/admin/account-types` configures the real PERSONAL and BUSINESS `ProfileKind` values over active `ProfileModuleDefinition` rows using `profile.account-types.v1`. Each module is Required, Optional, or Disabled; identity, availability, verification, avatar/logo, cover, and localized names are server-validated. Existing published profiles are not silently unpublished; drafts/future edits remain, and the next publish evaluates current configured requirements.
- Translation Admin: `/admin/translations` reuses the current source dictionary plus runtime localization settings, reports real Arabic/English/French coverage, searches keys and translated text, filters namespace/missing language, paginates 50 keys, and edits one stable key with explicit RTL/LTR fields. Usage classification remains conservative because there is no authoritative cross-Web/Android/backend reference index. `/admin/localization` redirects to the canonical route.
- Verification completed: focused tests, TypeScript/lint, production Web build, authenticated 200 checks for canonical PASS 4 and accepted PASS 1–3 routes, and browser rendering at 1440/1280/1024/768/390 with Arabic RTL/Cairo and English LTR/Montserrat and no page-level horizontal overflow.

## 8. Hidden / Disabled Admin Presentation

Non-primary/hidden presentation includes Catalog, Products, Payments and payment/product child pages tied to the old flow, Integrations, Wallet Settings, standalone Customers, standalone Profiles, standalone User Links, and standalone Devices & Sessions. Compatibility routes may remain. DOMAIN / API / PRISMA / DATABASE CODE WAS NOT DELETED.

## 8A. PASS 5 — CLOSED / DEPLOYED / VERIFIED

- Source authority: the 17 approved HTML designs in `https://github.com/popwam/profile1`, pinned at commit `85e9b34c6eaee209e717e2acbf6f7b41d0f73aa4`. Exact source hashes are recorded in `docs/profile-templates/APPROVED_SOURCE_MANIFEST.md`; sample identities/media are not shipped.
- Architecture: one typed registry plus seven dynamically loaded family frames (`personal`, `professional`, `business`, `agency`, `brand`, `tech`, `storefront`) and 17 CSS variants. Public content continues through the canonical projection; there are no independent template applications or duplicated data loaders.
- Mapping: sources 1/4/5/6 are Personal, 2/3 Professional, 7 Business, 8 Agency, 9 Brand, 10 Tech, and 11–17 Storefront. Each entry has explicit `ProfileKind`, minimum-plan, source, family, safe tokens, and deterministic PERSONAL/BUSINESS fallback.
- Selection is server-persisted to `Profile.templateId` and mirrored to the related `VirtualCard.themeId`; account-kind and plan/theme eligibility are server checked. The selection changes the draft and increments `draftRevision`; the live public page remains pinned to `ProfileRevision.templateSlug/templateConfiguration` until the normal publish flow succeeds.
- Storefront variants are catalogue/showcase layouts only. The existing profile-owned `ProfileService` collection was extended narrowly into a typed PRODUCT/SERVICE showcase item and its immutable published-revision snapshot, with optional public image, price/currency, category, featured state, visibility, and sort order. `Plan` supplies storefront and per-item-type enablement, unlimited/fixed item count, and WhatsApp/Email enquiry-channel flags. Enquiries are user-initiated, localized WhatsApp or mailto links with a stable item anchor; there is no auto-send, cart, checkout, payment, order, or shipping behavior.
- Admin: `/admin/templates` is the canonical 17-card catalogue with family filters, status/eligibility metadata, focused plan/activation management, and `/admin/templates/preview/[slug]` previews.
- Admin visual review now uses the real `PublicProfile` renderer with deterministic, rich, local-only fixture data and an explicit preview entitlement context. It has no Neon, Production-data, or external API dependency. The final-ready marker is emitted only after the family renderer resolves, and the capture harness waits for that marker, the fixture identity, and four showcase items; development UI is excluded by using a local production build.
- Real review assets are in `docs/profile-templates/visual-review/`: 17 populated 390px captures, 17 populated desktop captures, `templates-01-17-source-vs-final-desktop.png`, and `templates-01-17-final-mobile-contact-sheet.png`. The earlier captures were static `TemplatePreviewCard` placeholders, not completed template renders.
- Initial real-render verification showed major structural fidelity differences across all 17 variants. PASS 5A and PASS 5B corrections below supersede that initial classification for templates 01–10; fixture-isolation remains verified and the Admin preview fixture is not imported by public routes.

### PASS 5A — TEMPLATES 01–06 VISUAL CORRECTION / CLOSED

- Corrected only `personal-sunrise`, `professional-noir`, `professional-editorial`, `personal-rose-paper`, `personal-lavender`, and `personal-botanical` against approved source files 1–6 at commit `85e9b34c6eaee209e717e2acbf6f7b41d0f73aa4`.
- The six variants now preserve their distinct approved desktop compositions: Sunrise asymmetric circles, Noir dark editorial/polaroid, Editorial bright split portrait, Rose Paper cover/avatar overlap, Lavender layered glass, and Botanical scrapbook/polaroid.
- Mobile adaptations were verified at 430px and 390px with RTL/LTR direction and no horizontal overflow. Empty sections remain conditional; real public routes continue to consume published projection data only.
- Final source-vs-render and mobile evidence is stored in `docs/profile-templates/visual-review/pass-5a/`. All six are classified MINOR, with no remaining MAJOR structural deviation.
- PASS 5A verification passes: 54 focused template/fixture/URL tests, an additional 80 profile integration tests, TypeScript, `git diff --check`, and the final local production Web build. The final build contains no temporary capture-only route.
- At PASS 5A closure, overall PASS 5 remained pending templates 07–17 and Production closure; those later stages are now closed below.

### PASS 5B — TEMPLATES 07–10 VISUAL CORRECTION / CLOSED

- Corrected only `business-horizon`, `agency-idea-studio`, `brand-bloom`, and `tech-link` against approved source files 7–10 at commit `85e9b34c6eaee209e717e2acbf6f7b41d0f73aa4`; PASS 5A and Storefront templates were not visually modified.
- Restored the distinct approved compositions: Horizon's panoramic corporate hierarchy, Idea Studio's editorial cream/black/orange collage language, Bloom's soft boutique identity/story/catalog rhythm, and Tech Link's deep-blue luminous technical grid.
- No source demo metrics were introduced. Contact CTAs resolve only to an existing published contact method, and secondary CTAs scroll to the rendered services/showcase section. No cart, checkout, payment, quote, CRM, or demo-request backend was added.
- Desktop was visually iterated at 1440px. Mobile was verified at 430px and 390px in Arabic RTL and English LTR with no page-level horizontal overflow; empty services, media, branches, social, and contact sections remain conditional.
- Final comparison and full populated mobile evidence is stored in `docs/profile-templates/visual-review/pass-5b/`. Templates 07–10 are classified MINOR, with no remaining MAJOR structural deviation.
- PASS 5B verification: 15 focused renderer/registry/fixture/projection/URL tests pass, TypeScript/lint passes, `git diff --check` passes, and the final local production Web build passes with 190 routes. The final build contains no temporary capture-only route.
- At PASS 5B closure, overall PASS 5 remained pending Storefront templates and Production closure; both are now closed below.

### PASS 5C — STOREFRONT TEMPLATES 11–17 VISUAL CORRECTION / CLOSED

- Corrected only `store-first`, `store-lume`, `store-glowup`, `store-nobletime`, `store-stylehub`, `store-pawlove`, and `store-techzone` against approved source files 11–17 at commit `85e9b34c6eaee209e717e2acbf6f7b41d0f73aa4`; templates 01–10 were not visually modified.
- Restored seven distinct compositions: Store First's broad natural marketplace, Lume's spacious lifestyle shelf, GlowUp's soft beauty campaign, NobleTime's black/champagne luxury catalogue, StyleHub's image-first fashion editorial, PawLove's organic playful presentation, and TechZone's bright hardware storefront.
- Storefront remains catalogue/contact-only. PRODUCT-only, SERVICE-only, mixed, optional-price, WhatsApp-only, Email-only, both-channel, neither-channel, and empty-catalog behavior continue through the existing shared projection and entitlement system.
- Desktop was iterated at 1440px. English LTR and Arabic RTL were verified, plus 430px and 390px mobile layouts with no page-level overflow. Intentional product shelves use touch/keyboard horizontal scrolling and visible focus states.
- Final populated evidence is stored in `docs/profile-templates/visual-review/pass-5c/`. Templates 11–17 are classified MINOR, with no remaining MAJOR structural deviation.
- PASS 5C verification: 19 focused registry/renderer/fixture/storefront tests pass, TypeScript/lint passes, Prisma validation passes, `git diff --check` passes, and the final local production Web build passes with 190 routes. The capture-only route is absent from the final build.
- PASS 5 technical closure completed on 2026-09-10. The additive storefront migration was applied without row-count changes or failed migrations; the full suite passed 447 tests with 9 explicitly skipped integration tests; focused PASS 5 tests, TypeScript/lint, Prisma validation/generation, production build, and `git diff --check` passed.
- Production deployment `8e74ef4b-2058-458a-aa55-82a57c3a0dfe` passed its build, environment validation, predeploy migration check, startup, and health check. Authenticated Admin routes and all 17 final-ready template previews returned HTTP 200. Real published Personal profiles rendered by slug and ID without fixture leakage; private/draft and missing profiles stayed in unavailable/not-found presentation.
- No safe published Production BUSINESS/STOREFRONT fixture exists, so the live public PRODUCT/SERVICE/contact-mode matrix was not created by mutating customer data. Production Admin previews verify the deployed Storefront renderers with both contact channels, while focused tests cover PRODUCT-only, SERVICE-only, mixed, optional-price, WhatsApp-only, Email-only, both, neither, empty catalogue, unsafe URL rejection, and fixture isolation.

## 9. Preserved Existing Systems

Do not rebuild unnecessarily: Auth/Admin authorization; PostgreSQL/Prisma core; Profiles domain; publishing/readiness/revision logic; subscriptions/entitlements; Legal backend; notification campaigns; Link Platform catalog/domain; user/session/security domain; localization/translation architecture; audit/reporting domain.

## 10. Known Limitations / Deferred Work

- Revenue/MRR authoritative model missing.
- Plan price/billing fields missing.
- Profile-open enforcement deferred.
- Advanced analytics source/geography/device unavailable.
- True notification delivery/open tracking unavailable.
- AccountDeletion admin transition remains read-only.
- PASS 5A, PASS 5B, and PASS 5C corrected templates 01–17; all are at MINOR with no remaining MAJOR structural deviation. PASS 5 is deployed and verified.
- Showcase items intentionally have no inventory, cart state, checkout state, tax, shipping, payment, or order lifecycle. Price is optional and contact enquiry remains the only order intent.
- Production contains no safe published BUSINESS/STOREFRONT test profile for a non-mutating live canonical PRODUCT/SERVICE/contact-mode matrix; this remains covered by deployed authenticated Admin previews and focused tests.
- Production schema comparison retains pre-existing schema debt outside PASS 5: PostgreSQL-truncated long index names, database defaults on two `updatedAt` columns that differ from Prisma's `@updatedAt` representation, and the missing composite performance index `ProfilePublication(profileId, publishedRevisionId)`. PASS 5 did not alter or hide these differences.
- SMS/OTP provider integration awaits provider details.
- Reports/Disputes and Audit redesigns are deferred.
- Country availability remains configuration exposed to bootstrap; it is not a new registration/auth enforcement gate.
- Country-specific legal variants must use distinct legal versions where the existing `(type, version, locale)` uniqueness requires it.
- Account-type Disabled state does not destructively remove existing module content, and availability is not retroactively enforced across every legacy creation path.
- Translation usage cannot be classified authoritatively across Web, Android, and backend until a shared reference index exists; no key was auto-deleted.

## 11. Templates — IMPLEMENTED / DEPLOYED / VERIFIED

The owner-provided 17-template source is implemented. Do not replace it, invent additional templates, or begin another template redesign before owner visual approval.

Storefront templates may display products/services but are not checkout systems. Ordering remains contact-based through plan-allowed channels such as WhatsApp or Email. Do not build a cart, checkout, payment gateway/processing, or shipping workflow for template storefronts.

## 12. Important Routes

- `/admin` — Overview
- `/admin/users`, `/admin/users/[id]` — Users and unified User Detail
- `/admin/requests` — Requests Center
- `/admin/link-platforms` — Link Platform catalog
- `/admin/plans`, `/admin/plans/new`, `/admin/plans/[id]` — Plans
- `/admin/notifications`, `/admin/notifications/[id]` — Campaign center
- `/admin/countries` — Countries (`/admin/phone-countries` redirects here)
- `/admin/legal` — Legal documents and country applicability
- `/admin/account-types`, `/admin/account-types/[kind]` — Account Types
- `/admin/translations` — Translation Admin (`/admin/localization` redirects here)
- `/admin/templates`, `/admin/templates/preview/[slug]` — approved template catalogue and Admin preview
- `/dashboard/templates`, `/dashboard/templates/preview/[templateId]` — eligible user selection and draft preview
- `/p/[slug]`, `/p/id/[profileId]`, and tag destinations — canonical public rendering from the published revision
- Legacy Customers, Profiles, User Links, Devices/Sessions, and request-category paths are compatibility redirects/shims where implemented.

## 13. Important Shared Components

- `DashboardPageHeader`, `MetricCard`, `QuickActionCard`, `StatusBadge`, `UserIdentityCell`, `FilterBar`, `SearchField`, `EmptyState`, `AdminDataTable` in `apps/web/src/components/admin-ui.tsx`.
- Dashboard shell/navigation in `apps/web/src/components/dashboard-shell.tsx`.
- Accepted focused editor patterns in `PlanForm`, `AdminNotificationComposer`, and the Link Platform catalog/editor.
- PASS 4 direct shared policy/components: `LegalCountrySelector`, `country-catalog.ts`, `legal-country-policy.ts`, and `account-type-policy.ts`.
- PASS 5: `profile-templates.ts`, `profile-template-renderer.ts`, `PublicProfile`, `TemplatePreviewCard`, `AdminTemplateRenderPreview`, `template-preview-fixture.ts`, and the family frames in `components/profile-template-families/`.

## 14. Migration / Deployment State

- Local migrations created: `20260908190000_plan_storefront_entitlements` (PASS 5). It adds six Plan fields: `storefrontEnabled`, `storefrontProductsEnabled`, `storefrontServicesEnabled`, `storefrontWhatsappOrder`, and `storefrontEmailOrder` as non-null booleans defaulting to `false`, plus nullable `storefrontMaxItems` where NULL means Unlimited and non-null values must be non-negative. It also creates `ProfileShowcaseItemType` (`PRODUCT`, `SERVICE`) and adds `itemType` defaulting to `SERVICE`, nullable `imageUrl`, nullable non-negative `price` as `DECIMAL(14,2)`, nullable `currency`, nullable `category`, and non-null `featured` defaulting to `false` to both `ProfileService` and `ProfileRevisionService`.
- Production migrations deployed in this deployment: `20260908190000_plan_storefront_entitlements`, applied on 2026-09-10. Predeploy verification then reported no pending migrations.
- Latest relevant Admin/Web deployment: `8e74ef4b-2058-458a-aa55-82a57c3a0dfe` — SUCCESS; image digest `sha256:2b6a90a3499f3584c3102da584e4437e2e5e704deef212e59aa17f3ad6b99bf7`.
- Deployment date: 2026-09-10 10:18:11 UTC.
- Production URLs: `https://pop.popwam.com` (dashboard/admin/auth) and `https://go.popwam.com` (public experience).
- Deployed source state: a reduced deployment archive of base Git revision `3a52a2202f774b3e64f0f912a4f967f017fd3fb5` plus the accepted uncommitted PASS 1–5 worktree. Android source/build artefacts and visual-review evidence were excluded; only the three existing font files required by Web local-font loading were included. No commit was created.
- PASS 1–4: DEPLOYED / VERIFIED. Authenticated canonical Admin routes returned HTTP 200, compatibility routes reached their documented redirects, and public Terms/Privacy/current-legal resolution returned HTTP 200.
- PASS 5: CLOSED / DEPLOYED / VERIFIED. Production health, authenticated canonical Admin routes, all 17 Admin template renderers, representative real public profiles, legal routes, published-revision/privacy behavior, plan defaults, fixture isolation, and no-commerce import boundaries were verified.

## 15. Git / Worktree State

Accepted uncommitted work exists. Preserve it; do not broadly restore/reset/clean and do not commit until owner approval.

## 16. Next Pass

NEXT ACTION: OWNER PHYSICAL ACCEPTANCE OF ANDROID PASS 6

STATUS: READY

REASON: PASS 6 implementation and code/build verification are complete. No physical acceptance was performed. PASS 6 API changes remain local and undeployed; the default production-targeted APK requires a separately authorized matching backend release (or a compatible test backend) for end-to-end acceptance. Do not infer deployment, device testing, or another pass.

## 17. PASS 6 — ANDROID TEMPLATES + STOREFRONT MANAGEMENT

Status: **IMPLEMENTED / CODE VERIFIED / AWAITING OWNER PHYSICAL ACCEPTANCE** (2026-09-11).

- My Profile: added Template and BUSINESS Products & Services editing sections below the accepted header/card/actions. Bottom navigation, Home, public Preview, Share, QR and HCE were preserved. Added 65 Android resource strings in each of Arabic, English and French; item content retains the existing Arabic/English schema.
- Templates: reused `GET /api/mobile/templates` with explicit safe metadata for the 17 approved registry entries, account-kind filtering, Plan/theme availability and selected/locked state. The adaptive grid lazily loads illustrative registry-based thumbnails. There is no Android template authority or implementation asset bundle.
- Draft preview: `/mobile-preview/[profileId]?templateId=...` requires POP mobile authentication, strict ownership and template/account-kind/Plan validation. It renders the actual draft through `PublicProfile`, with no Admin fixtures or publishing mutation, and private/no-store/noindex/CSP protection. The Android dialog authenticates only the exact trusted-origin document and current-profile media; redirects and navigation are refused, file/content/mixed-content/DOM-storage access is disabled, and no credentials are handed to WebView or external destinations. The existing primary Preview remains the published public profile.
- Draft mutations: existing editor `TEMPLATE_SELECT` now validates Plan/registry/account kind, increments `draftRevision` and mirrors `Profile.templateId`/`VirtualCard.themeId`. The legacy mobile card-template route delegates to that domain. Optional `snapshot=true&locale=...` returns the editor projection after success. Publish remains explicit; draft template/item edits do not replace the current published revision.
- Products/Services: reused `ProfileService`/`ProfileRevisionService`, with PRODUCT/SERVICE creation/editing, localized names/descriptions, optional price/currency/category, image upload/replace/remove, featured/visible/hidden state, confirmed deletion, and Move Up/Down. Hidden/missing SERVICES modules use existing module actions. Server checks ownership, item type, Plan flags, exact scoped reorder IDs, field limits, price, visibility and image references. NULL maxItems remains unlimited; finite limits include hidden items.
- Images: existing private profile media upload handles MIME/signature/size/quota validation. Android caches successful upload responses without a follow-up request. Publish maps owned item-image references into existing revision-bound public media, preserving draft privacy. The shared image/auth client only sends or refreshes credentials for the configured API origin.
- Contact summary: displays deployed Plan WhatsApp/Email entitlements and valid public profile-contact/module state, linking to existing Contact/visibility editing. No auth/recovery phone, private account email, Plan-override toggle or order-sending behavior was added.
- LocalFirst: extended the same encrypted account snapshot with selected template, showcase items/entitlements and small catalog metadata. Catalog refresh happens only on explicit picker entry when absent/stale (one day); no startup preload. Server-confirmed mutations persist the active editor without full bootstrap; conflict recovery refreshes only that editor. Cached reads survive offline writes, failures leave session/cache intact, and older/account-switched responses are guarded. AES-256-GCM/Android Keystore encryption and account binding were not changed.
- Verification: focused Android showcase JVM tests passed; final `:app:testDebugUnitTest` passed **252 tests**, with **0 failures/errors/skips**. `:app:assembleDebug` and `:app:lintDebug` passed; lint reports **0 errors / 362 warnings**. Focused Web policy/API/transaction/projection/publishing/privacy/template tests passed **76 tests across 10 files**. TypeScript/Web lint, final local production Web build and `git diff --check` passed. Performance/security statements are **STATIC / ARCHITECTURAL verification only**, with no measured Android latency claimed.
- APK: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`; **47,782,724 bytes**; SHA-256 **BD39DE033E0478B47B3031F66701260DBE873AF98EEA4924F3CF987E0762509C**; package **com.popwam.pop.debug**; versionName **0.0.12-debug**; versionCode **12**. Metadata was read from the actual APK and matches Gradle output metadata. **NOT INSTALLED**.
- Physical limitations: owner must later verify real-device visual/RTL/keyboard/image-picker/WebView behavior, publish/contact scenarios, offline transitions and perceived performance. Thumbnail cards are schematic; full draft preview provides actual template presentation.
- **NO EMULATOR STARTED. NO PHYSICAL DEVICE USED. NO ADB USED. NO APK INSTALLED. NO ANDROID INSTRUMENTATION. NO PRODUCTION DEPLOYMENT. NO NEW MIGRATION CREATED/APPLIED. NO CART. NO CHECKOUT. NO PAYMENTS. NO COMMIT CREATED.** PASS 1–5 remain preserved; PASS 5 remains deployed. PASS 6 is not marked DEPLOYED or PHYSICALLY VERIFIED.
- Detailed inspected/modified-file inventory, API contracts, checks and limitations: [PASS 6 code verification report](POP_PASS6_CODE_VERIFICATION.md).

## Handoff Update Policy

At the start of every future Web/Admin pass, read this file first, treat CLOSED passes as baseline, and inspect only current-pass files/direct dependencies. At the end, update this same file; close a pass only after successful verification; refresh limitations, canonical routes/components, migration/deployment state, and Next Pass. Keep it concise and do not paste command logs.
