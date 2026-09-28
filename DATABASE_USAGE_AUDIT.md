# POP by POPWAM — Database and TypeScript/TSX Usage Audit

Audit date: 2026-09-15  
Scope: repository `E:\saas\popwam-tap`  
Phase: 1 — report only

## 1. Executive summary

This audit used repository evidence only: Prisma schema and migrations, the untracked `artifacts/neon-schema.sql` snapshot, static and dynamic TypeScript/TSX imports, Next.js App Router conventions, route registrations, React composition, server actions, tests, scripts/jobs, Android API calls, configuration registries, and Prisma reads/writes. No live database was queried.

Inventory observed:

- 127 Prisma models, 97 Prisma enums, 247 declared Prisma indexes/unique constraints, and 33 migration directories.
- 600 TypeScript/TSX files (403 `.ts`, 197 `.tsx`).
- 121 Next.js App Router `page.tsx` files, 133 `route.ts` handlers, and 97 test files.
- Approximately 1,897 top-level TypeScript/TSX declarations were considered by the declaration/reference scan.
- 483 modules were reachable through the runtime import graph; four source modules were wholly unreachable and eight source modules were reachable only from tests.
- No application-created PostgreSQL functions, triggers, views, materialized views, or standalone sequences were found in checked migrations or the schema snapshot.

Database model classification:

| Class | Meaning | Count |
|---|---|---:|
| A | Actively used | 96 |
| B | Indirect/system dependency | 22 |
| C | Legacy but intentionally retained | 1 |
| D | Suspected unused / deletion candidate | 8 |
| E | Unknown / insufficient evidence | 0 |

The strongest database deletion candidates are `Follow`, `ProductMedia`, and `PlatformSuggestion`. The strongest dead feature clusters are purchase/expense administration and test-only platform-recommendation code. `Supplier` is not low risk: an active inventory query still joins it, even though the returned relation is not rendered.

## 2. Classification method and limits

- **A — Actively used:** reached from an active page, route handler, Android client call, job/script, or active service/action; or directly read/written by such code.
- **B — Indirect/system dependency:** used by framework convention, adapter behavior, nested Prisma reads/writes, a dynamic registry, or another non-obvious runtime path.
- **C — Legacy but intentionally retained:** compatibility redirect, historical identity/security foundation, or planned/stub architecture with a credible retention reason.
- **D — Suspected unused / deletion candidate:** no active inbound path found, or all paths end in redirect-only/test-only/dead code.
- **E — Unknown:** evidence is insufficient to classify safely.

Confidence expresses confidence in the usage classification, not certainty that production has no historical data. Database deletion always requires a fresh reference check, a data-retention decision, and a reviewed migration. Export status alone was never treated as evidence of use.

## 3. Database object inventory

### A — actively used models (96)

`User`, `Plan`, `UserPlan`, `UserLimitOverride`, `Session`, `Organization`, `Membership`, `Profile`, `ProfilePublication`, `ProfileRevision`, `ProfileRevisionMedia`, `ProfileSlugHistory`, `ProfileMediaAsset`, `ProfileCategory`, `ProfileModuleDefinition`, `ProfileSectionEntry`, `ProfileModule`, `ProfileTemplateModule`, `ProfileEntitlement`, `LegalDocument`, `PhoneCountryConfig`, `UserLegalConsent`, `ProfileField`, `UploadedFile`, `Friendship`, `FriendRequest`, `FriendPreference`, `FriendsPreference`, `FriendPrivacyRule`, `Chat`, `ChatMember`, `Message`, `MessageReport`, `FeatureRequest`, `FeatureVote`, `FeatureComment`, `QuotaIncreaseRequest`, `Destination`, `Tag`, `TagAlias`, `TagEvent`, `CardBatch`, `Card`, `ProfileService`, `ProfileBranch`, `ActivationClaimSession`, `ActivationAttempt`, `OtpChallenge`, `OtpSendLog`, `AuthTicket`, `MobileRefreshToken`, `CardOpenDaily`, `InventoryItem`, `ProductionBatch`, `ProducedTag`, `VirtualCard`, `LinkPlatform`, `PasskeyCredential`, `PasskeyChallenge`, `MobileAuthChallenge`, `MobileEnrollmentSession`, `MobileDeviceCredential`, `ConnectedAccount`, `OAuthConnectionState`, `CardImportedField`, `DevicePushToken`, `ProductCategory`, `Product`, `ContentEntry`, `ContentPublication`, `UserBlock`, `UserReport`, `NearbyPreference`, `NearbyPresence`, `NearbyRateLimitBucket`, `DeviceSession`, `UserPreference`, `NotificationPreference`, `AdminNotificationCampaign`, `AdminNotificationDelivery`, `FriendNotificationEvent`, `StepUpGrant`, `AccountDeletionRequest`, `ProductStatusHistory`, `WalletPass`, `TagTransfer`, `ProfileTemplate`, `OnboardingProgress`, `OnboardingDefinition`, `InventoryBatch`, `InventoryMovement`, `Customer`, `Order`, `SystemSetting`, `BrandSettings`, `AuditLog`.

### B — indirect/system models (22)

| Models | Hidden dependency |
|---|---|
| `Account`, `VerificationToken` | NextAuth Prisma adapter persistence; direct app calls are not required for runtime use. |
| `ProfileRevisionModule`, `ProfileRevisionField`, `ProfileRevisionDestination`, `ProfileRevisionFile`, `ProfileRevisionService`, `ProfileRevisionBranch`, `ProfileRevisionSectionEntry` | Nested revision snapshot reads/writes. |
| `ProfileVerificationCase` | Nested publication/readiness reads. |
| `ProductVariant`, `ProductImage`, `ProductInventory`, `ProductPrice`, `ProductFeature`, `ProductSlug` | Nested product detail reads from `/product/[slug]` and associated product workflows. |
| `ContentAttachment` | Nested content reads. |
| `OnboardingStep`, `OnboardingQuestion`, `OnboardingQuestionOption`, `OnboardingQuestionCondition` | Nested onboarding definition seed/read paths. |
| `OrderItem` | Nested order creation/read paths. |

### C — legacy but intentionally retained (1)

| Object | Exact path | Evidence and recommendation |
|---|---|---|
| `ExternalIdentity` model/table | `packages/db/prisma/schema.prisma`; introduced by `packages/db/prisma/migrations/20260723153000_firebase_external_identity_foundation/migration.sql` | No current TS caller was found, but it is the retained external/Firebase identity foundation. The later migration `20260911190000_retire_firebase_phone_subject` retires `MobileAuthChallenge.firebaseSubjectHash`, not this identity table. High deletion risk; do not touch without an identity-data migration plan. |

### D — suspected unused database models (8)

| Approval ID | Object and exact path | Current readers | Current writers | Inbound references | Outbound dependencies | Route reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|---|---|
| DELETE-01 | `Follow` — `packages/db/prisma/schema.prisma`; migration `20260718120000_pop_product_content_social/migration.sql` | None found | None found | Prisma relations/FKs and migration only | `User` twice; unique/index constraints | None; active social code uses `Friendship`/`FriendRequest` instead | High | Low-to-medium (historical rows possible) | Verify row count/retention, then prepare a non-CASCADE migration if approved. |
| DELETE-02 | `ProductMedia` — same schema and migration | None found | None found | Prisma relations/FKs and migration only | `Product` FK/index | None; active `/product/[slug]` reads `images`, `features`, `prices`, `variants`, not `media` | High | Low-to-medium | Verify data, then remove model/relation/FK/index in a reviewed migration if approved. |
| DELETE-03 | `PlatformSuggestion` — schema; `20260721190000_global_identity_integrations/migration.sql` | None found | None found | Prisma relations/FKs and migration only | `User`, `LinkPlatform` FKs/indexes | None; the recommendation helper is test-only | High | Low-to-medium | Treat with the test-only recommendation module as one feature cluster; verify data before migration. |
| DELETE-04 | `Purchase` — schema; `20260713230000_business_architecture/migration.sql` | Only `receivePurchase` and `deleteAdminUser`, both with no active inbound caller | Only `createPurchase`, with no inbound caller | Dead server actions and relations | `Supplier`, `PurchaseItem`, `InventoryItem`, `User`, `AuditLog` side effects | `/admin/purchases`, `/new`, `/[id]` redirect to `/admin/inventory` | High | Medium | Recheck forms/external callers and historical finance data; delete only as an approved cluster. |
| DELETE-05 | `PurchaseItem` — same schema/migration | Only nested under dead purchase actions | Only nested `createPurchase` | `Purchase` relation and dead action code | `Purchase`, `InventoryItem`; FKs/indexes | Same redirect-only purchase route cluster | High | Medium | Couple any removal to `Purchase`; never remove independently while the parent remains. |
| DELETE-06 | `ExpenseCategory` — same schema/migration | Only dead expense action path | Only `createExpense`, no inbound caller | Dead actions and `Expense` relation | `Expense`, `AuditLog` side effects | `/admin/expense-categories` redirects to inventory | High | Medium | Verify finance retention/data before a paired expense migration. |
| DELETE-07 | `Expense` — same schema/migration | Only dead user-cleanup/action code | Only `createExpense`, no inbound caller | Dead actions and schema relations | `ExpenseCategory`, `User`, optional `UploadedFile`, `AuditLog` | `/admin/expenses` and `/new` redirect to inventory | High | Medium | Verify records/legal retention; remove only with category/actions/routes if approved. |
| DELETE-08 | `Supplier` — same schema/migration | Active `apps/web/src/app/(admin)/admin/inventory/page.tsx` includes `supplier`, but does not render it | Only `createSupplier`, no inbound caller | Active unused nested include; `InventoryItem.supplierId`; purchase cluster | `InventoryItem`, `Purchase`, FKs/indexes | Inventory route is active; supplier route redirects | Medium | Medium-to-high | Do not delete first. Remove or justify the active include, inspect data/FKs, and reassess after purchase cleanup. |

## 4. Suspected unused columns

All fields below are declared in `packages/db/prisma/schema.prisma`; migration history remains evidence, not runtime usage. “No app reference” excludes generated Prisma artifacts. Readers/writers are “none found” unless noted.

| Approval ID | Model.field | Current readers/writers and inbound references | Outbound/database dependencies | Route reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| DELETE-09 | `User.allowNearbyDiscovery` | No app read/write; schema/migration only | `User`; active nearby behavior uses `NearbyPreference` | No active route uses this field | High | Low-to-medium | Confirm not read by external clients, then remove by migration. |
| DELETE-10 | `Friendship.favoriteA`, `Friendship.favoriteB` | No app read/write | `Friendship`; active friendship APIs use other state fields | Active friendship routes exist, fields do not participate | High | Medium | Check mobile/API contract history before removal. |
| DELETE-11 | `Destination.customIconStorageKey`, `Destination.customIconType` | No app read/write | `Destination`; possible stored asset semantics | Destination UI/routes active, these fields are not | High | Medium | Confirm no externally uploaded custom icons and no planned renderer. |
| DELETE-12 | `CardBatch.unitProgrammingCost`, `CardBatch.unitPackagingCost` | No app read/write | `CardBatch`; financial/history semantics | Batch admin routes active, fields not used | High | Medium | Check historical reporting needs before removal. |
| DELETE-13 | `ActivationClaimSession.attemptCount` | No app read/write | Active `ActivationClaimSession`; attempts are represented by `ActivationAttempt` | Activation routes active, field not used | High | Medium | Validate rate-limit/audit requirements; prefer data-preserving migration review. |
| DELETE-14 | `OtpChallenge.claimSessionId` | No current app read/write | FK/index to active `ActivationClaimSession`/`OtpChallenge` | OTP/activation routes active | High | Medium | Confirm no deployed older client depends on association before dropping FK/column. |
| DELETE-15 | `InventoryItem.imageStorageKey` | No app read/write; active code uses `imageUrl` | Active `InventoryItem` | Inventory routes active, field not used | High | Medium | Check object-storage cleanup and existing values before removal. |
| DELETE-16 | `VirtualCard.avatarKind`, `VirtualCard.avatarValue` | No app read/write | Active `VirtualCard` | Wallet/card routes active, fields not used | High | Medium | Confirm mobile contract and stored values. |
| DELETE-17 | `LinkPlatform.supportsOAuth` | No app read/write; live code uses provider/config data | Active `LinkPlatform` | Link platform/admin routes active | High | Medium | Verify feature-config consumers outside this repo. |
| DELETE-18 | `OAuthConnectionState.returnPath` | No app read/write; callback uses a fixed path | Active OAuth state/security workflow | OAuth callback route active | High | High | Security-sensitive; retain unless callback design is deliberately simplified and data checked. |
| DELETE-19 | `Product.serialPolicy`, `seoTitleAr`, `seoTitleEn`, `seoDescriptionAr`, `seoDescriptionEn` | No app read/write | Active `Product`; SEO/product metadata | Product routes active, fields not used | High | Medium | Owner/product decision required; confirm future storefront/SEO plans. |
| DELETE-20 | `ProductVariant.attributes` | No app read/write | Indirectly active `ProductVariant` | Product route reads variants, not this field | High | Medium | Confirm no API consumer expects variant attributes. |
| DELETE-21 | `ProductInventory.lowStockAt` | No app read/write; physical inventory uses `InventoryItem.reorderLevel` | Indirectly active `ProductInventory` | Product route active | High | Medium | Resolve which inventory domain is canonical before deletion. |
| DELETE-22 | `ProductPrice.activeFrom`, `ProductPrice.activeTo` | No filtering/read found; page checks `isActive` | Indirectly active `ProductPrice` | Product route active | High | Medium | Confirm scheduled pricing is not planned or externally consumed. |
| DELETE-23 | `StepUpGrant.assuranceLevel` | No app read/write | Active security grant model | Security routes active | High | High | Do not remove without explicit security review. |

Fields that looked unused but should be retained/reviewed separately:

- B: `User.emailVerified` and NextAuth `Account.expires_at`, `token_type`, `id_token`, `session_state` — adapter/system fields.
- B: `ContentAttachment.uploadedFileId` and onboarding FK fields — nested relation usage.
- C: `ProfileVerificationCase.submittedAt`, `MobileDeviceCredential.invalidatedAt`, `FriendNotificationEvent.availableAt` — workflow/security/queue semantics and indexes make absence of current direct reads insufficient.
- C: `ExternalIdentity.providerSubject`, `ExternalIdentity.linkedAt` — identity-history fields; high risk.

## 5. Enums, indexes, relations, migrations, and raw SQL

- All 97 enums participate in active/indirect models, migrations, or generated client contracts. No enum is an independent low-risk deletion candidate. Any enum cleanup must follow deletion of its last model/field and a full textual/database value search.
- No standalone index was classified D. Indexes attached only to a D model/field become conditional candidates when that exact object is approved. Active-query performance indexes remain A/B even if their names have no TS reference.
- Relations/FKs are indirect database dependencies. They are not dead merely because application code does not name them.
- The 33 migration directories are immutable history and are not deletion candidates. New cleanup must be expressed as a new migration; historical migrations must not be rewritten.
- Raw SQL reviewed consisted of migration SQL and `artifacts/neon-schema.sql`. No application-defined PostgreSQL function, trigger, view, or materialized view was found.
- `artifacts/neon-schema.sql` is untracked evidence and may differ from production. It was not modified.

## 6. Legacy feature clusters

| Cluster | Chain | Classification | Risk/recommendation |
|---|---|---|---|
| Purchases | redirect-only `/admin/purchases*` pages → zero-inbound `createPurchase`/`receivePurchase` in `apps/web/src/app/business-actions.ts` → `Purchase`/`PurchaseItem` → related supplier/inventory/audit relations | D | Medium; finance/history data may exist. Approve and remove as a coordinated cluster only. |
| Expenses | redirect-only `/admin/expenses*` and `/admin/expense-categories` → zero-inbound actions → `Expense`/`ExpenseCategory` | D | Medium; confirm legal/accounting retention first. |
| Platform recommendations | `apps/web/src/lib/platform-recommendations.test.ts` → test-only `platform-recommendations.ts` → no runtime caller; `PlatformSuggestion` itself has no runtime reader/writer | D | Low for TS helper, low-to-medium for DB after row check. |
| Supplier administration | `/admin/suppliers` redirect → zero-inbound `createSupplier` → `Supplier`; but active inventory query still includes supplier | D with active edge | Medium-to-high; resolve active include/FK/data first. |
| External identity/Firebase foundation | no current TS caller → `ExternalIdentity` migration/schema; later Firebase phone-subject retirement did not remove it | C | High; intentionally retain pending explicit identity architecture decision. |
| Backup providers | unreachable `backup-providers.ts` with POP Cloud stub and Google Drive “not configured” provider | C | Medium; architecture appears planned, so not in low-risk approval list. |

## 7. Indirect and hidden dependencies

These items can look dead in a naive symbol count but are not deletion candidates:

- Every Next.js `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and manifest handler is framework-entered through filesystem routing.
- `Account` and `VerificationToken` are used by the NextAuth Prisma adapter.
- `PersonalFrame`, `ProfessionalFrame`, `BusinessFrame`, `AgencyFrame`, `BrandFrame`, `TechFrame`, and `StorefrontFrame` are dynamically imported by the literal registry in `apps/web/src/components/profile-template-renderer.tsx`.
- Revision, product child, content attachment, onboarding child, and order item models are reached by nested Prisma selections/writes.
- `/t/[token]` remains a legacy but live token route; `/p/id/[profileId]` is a manifest/fallback route.
- Android-facing handlers under `/api/mobile/**` have inbound use from `apps/android/app/src/main/java/com/popwam/pop/data/remote/PopwamApi.kt`, even when no web TS caller exists.
- `apps/web/src/app/api/admin/sms/test/route.ts` is a documented diagnostic route (C), not proof of dead code.
- `apps/web/src/app/api/admin/nearby/status/route.ts` has no repo caller, but filesystem routing makes it externally reachable; classification E, medium risk, owner/API-consumer review.
- Translation keys and currently modified/untracked Android/Figma assets were not treated as dead merely because a static reference was absent.

## 8. Low-risk cleanup candidates

“Low risk” here means low application reachability risk, not permission to delete. Database items still require a row/data check.

- `Follow`, `ProductMedia`, `PlatformSuggestion` after production data/retention checks.
- Zero-inbound helpers and components in Sections 16–18, excluding security, finance, and intentionally retained architecture.
- Test-only helpers in Section 18 if their tests are also explicitly approved for removal or rewritten.

## 9. Medium-risk cleanup candidates

- Purchase, expense, and supplier clusters because of data retention, relations, and the active supplier include.
- Unused fields on otherwise active models.
- Redirect-only legacy pages if product/SEO/bookmark compatibility is intentionally dropped; they are not included in the current deletion approval list.
- Backup/provider architecture and test-only policy modules; retain unless their roadmap status is resolved.

## 10. High-risk / do-not-touch objects

Unless an exact item receives separate owner approval after a new dependency check, do not remove Auth, sessions, profiles, profile revisions, publishing/readiness, visibility/share security, canonical URLs, NFC/NDEF, HCE, legal consent, notifications, device management, identity linkage, or security assurance objects. In particular, retain `ExternalIdentity`, NextAuth adapter fields/models, `StepUpGrant.assuranceLevel`, OAuth state data, revision child models, canonical/legacy token routes, and Android mobile API contracts.

## 11. Route/page audit summary

The following pages are reachable through Next.js filesystem routing but only redirect. They are C, not D, because they preserve old URLs/bookmarks and may receive external traffic:

`/profile/[slug]`, `/activate`, `/login/phone`, `/dashboard/nfc`, `/dashboard/appearance`, `/dashboard/security/passkeys`, `/admin/phone-countries`, `/admin/links`, `/admin/feature-requests`, `/admin/localization`, `/admin/orders/new`, `/admin/expenses`, `/admin/expenses/new`, `/admin/quota-requests`, `/admin/security`, `/admin/expense-categories`, `/admin/customers`, `/admin/purchases`, `/admin/purchases/new`, `/admin/purchases/[id]`, `/admin/profiles`, `/admin/suppliers`, `/admin/subscriptions`, `/admin/cards/new`, `/admin/batches`.

No page/route is proposed for deletion in Phase 1. The redirect-only purchase/expense/supplier routes are evidence that their old forms are gone, but redirects themselves may still be useful compatibility surfaces.

## 12. Services and API integration summary

- No obsolete remotely-called API route was proven dead. Externally reachable endpoints cannot be cleared solely by absence of an in-repo caller.
- Android calls make the mobile backend surface active/indirect.
- The unreachable backup provider module is C because it represents explicit POP Cloud/Google Drive integration scaffolding.
- Google sign-in/linking remains active elsewhere even though `GoogleLinkButton` itself has no inbound component reference.
- Social placeholder actions that always throw `FRIENDS_API_REQUIRED` have no callers and are D; current friendship functionality is API-based.

## 13. Approval protocol

Every `DELETE-*` ID below is only a proposal. Approval of one ID does not approve adjacent imports, migrations, tests, tables, fields, routes, assets, or visual files. Before Phase 2, each approved item must be rechecked against the then-current tree and database dependencies. A newly discovered dependency causes the item to be skipped and reported.

## 14. Code reachability inventory

| Surface | Evidence/result |
|---|---|
| Static imports | Runtime graph built from `.ts`/`.tsx` source imports. |
| Dynamic imports | Literal dynamic registry checked; template frames are B. |
| Filesystem routing | App Router special files treated as entry points, never as unreferenced modules. |
| React composition | JSX/import references traced at component and local-helper level. |
| Server actions | Declarations traced to form actions/imports; export alone did not count. |
| Prisma | Direct delegates plus nested selects/includes/creates and relations checked. |
| Android | Retrofit/API declarations and backend paths cross-referenced. |
| Tests | Test-only reachability recorded separately from runtime reachability. |
| Scripts/jobs | Repository scripts/jobs included as entry points. |
| String/config registries | Literal route/platform/template registries inspected to avoid false positives. |

## 15. TypeScript / TSX Usage Inventory

- Runtime-reachable source modules: 483.
- Fully unreachable source modules identified: `apps/web/src/components/login-form.tsx`, `apps/web/src/components/google-link-button.tsx`, `apps/web/src/lib/contact-discovery.ts`, `apps/web/src/lib/backup-providers.ts`.
- Test-only source modules identified: `admin-links.ts`, `card-lifecycle.ts`, `tag-transfers.ts`, `profile-fields.ts`, `product-status.ts`, `privacy-preferences.ts`, `platform-recommendations.ts`, `session-assurance-policy.ts`.
- Top-level declaration candidates were additionally checked within imported files, because a used file can contain an unused helper.
- No custom hook met D criteria. React hooks imported from libraries and hooks used within reachable components were treated A/B.

## 16. Suspected Unused Functions

For each row, “writer” is the declaration file. Inbound is the current caller/import result. “None” means no non-declaration reference was found.

| Approval ID | Exact name; type; writer/path | Current readers/inbound | Outbound dependencies | Database dependencies | Route reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|---|
| DELETE-24 | `promoteDraftImage`; utility/service; `packages/storage/src/index.ts` | None | Storage copy/delete primitives | None direct | None | High | Low | Remove export/function after package consumer recheck. |
| DELETE-25 | `canManageOwnedResource`; authorization utility; `packages/auth/src/index.ts` | None | Role/owner comparison only | None | None | High | Low | Remove if no external package consumer exists. |
| DELETE-26 | `shareDestinationIsCurrentlyPublished`, `activationAttemptFingerprintForTest`; helpers; `apps/web/src/lib/share-center.ts` | None | Active share-center projection/hash helpers | Profile/destination/activation domain indirectly | Parent module active, functions not reachable | High | Low-to-medium | Remove only these exports; retain active share center. |
| DELETE-27 | `createPrimaryProfile`, `setPrimaryProfile`, `addProfileModule`; domain services; `apps/web/src/lib/profile-domain.ts` | None | Prisma transactions/profile normalization | `Profile`, `ProfileModule`, related revision/profile records | Parent module active, functions not reachable | High | Medium | Recheck external scripts; remove functions only, not domain module/models. |
| DELETE-28 | `canManageProfile`; authorization service; `apps/web/src/lib/profile-authorization.ts` | None | Prisma membership/profile lookup | `Profile`, `Membership` | None through this function | High | Medium | Retain other auth paths; remove only after security review. |
| DELETE-29 | `ownerWhere`; authorization query helper; `apps/web/src/lib/permissions.ts` | None | Builds Prisma ownership predicate | User-owned resources indirectly | None | High | Medium | Remove only helper after checking external consumers. |
| DELETE-30 | `getOtpTestModeSummary`; diagnostic utility; `apps/web/src/lib/otp-test-mode.ts` | None | Environment/config parsing | None | None | High | Low | Remove function; preserve any independently used OTP logic. |
| DELETE-31 | `decimalZero`; utility; `apps/web/src/lib/money.ts` | None | Prisma Decimal/money helper | Decimal fields indirectly | Parent module may be active; function not reachable | High | Low | Remove function/export. |
| DELETE-32 | `missingTranslationKeys`; utility; `apps/web/src/lib/localization-policy.ts` | None | Locale dictionaries/policy | None | Parent module active, function not reachable | High | Low | Remove function, not translations. |
| DELETE-33 | `missingRequiredLegalDocuments`; service; `apps/web/src/lib/legal-consent.ts` | None | Legal document queries/policy | `LegalDocument`, `UserLegalConsent` | Legal routes active, function not reachable | High | High | Prefer retain unless legal owner confirms replacement; not a blanket legal cleanup approval. |
| DELETE-34 | `normalizedContactHash`; utility/service; `apps/web/src/lib/contact-discovery.ts` | None; entire module unreachable | Phone normalization, HMAC, `CONTACT_MATCH_PEPPER` | None direct | None | High | Low-to-medium | Remove module if contact discovery is abandoned; confirm mobile roadmap. |
| DELETE-35 | `respondFriend`, `updateFriendship`, `updateFriendPrivacy`; server actions; `apps/web/src/app/social-actions.ts` | None | `requireUser`; each then throws `FRIENDS_API_REQUIRED` | None after guard | None; current friendship uses APIs | High | Low | Remove placeholder actions only; keep active friend APIs. |
| DELETE-36 | `createSupplier`; server action; `apps/web/src/app/business-actions.ts` | None | Admin auth, Prisma create/audit/revalidate | `Supplier`, `AuditLog` | Supplier page redirects | High | Medium | Couple decision to DELETE-08. |
| DELETE-37 | `createPurchase`; server action; same path | None | Admin auth, nested create/audit | `Purchase`, `PurchaseItem`, `Supplier`, `InventoryItem`, `AuditLog` | Purchase pages redirect | High | Medium | Couple to DELETE-04/05. |
| DELETE-38 | `receivePurchase`; server action; same path | None | Inventory/purchase transaction/audit | `Purchase`, `PurchaseItem`, `InventoryItem`, `InventoryMovement`, `AuditLog` | Purchase pages redirect | High | Medium | Couple to DELETE-04/05; inspect historical workflow. |
| DELETE-39 | `createExpenseCategory`; server action; same path | None | Admin auth/create/audit/revalidate | `ExpenseCategory`, `AuditLog` | Expense-category page redirects | High | Medium | Couple to DELETE-06. |
| DELETE-40 | `createExpense`; server action; same path | None | Admin auth/create/audit/redirect | `Expense`, `ExpenseCategory`, `UploadedFile`, `AuditLog` | Expense pages redirect | High | Medium | Couple to DELETE-06/07. |
| DELETE-41 | `createCustomer`; server action; same path | None | Admin auth/create/audit | `Customer`, `User`, `AuditLog` | Customer page redirects, but model is otherwise active | High | Medium | Remove action only; do not infer `Customer` is dead. |
| DELETE-42 | `createOrder`; server action; same path | None | Admin auth/nested create/audit/redirect | `Order`, `OrderItem`, `Customer`, `Card`, `InventoryItem`, `AuditLog` | Orders are active, this create action is not | High | Medium | Confirm order creation is intentionally unavailable before removal. |
| DELETE-43 | `setAdminCardDestination`; server action; same path | None | Admin auth/card destination mutation/audit | `Card`, `Destination`, `AuditLog` | Card admin routes active, action not reachable | High | Medium | Confirm no legacy form/client posts to it. |
| DELETE-44 | `updateProfileTheme`; server action; `apps/web/src/app/actions.ts` | None | Profile mutation/revalidation | `Profile` | Profile/dashboard routes active, action not referenced | High | Medium | Confirm replacement theme path, then remove function only. |
| DELETE-45 | `toggleDestinationVisibility`; server action; same path | None | Destination mutation/revalidation | `Destination`, `Profile` | Destination UI active, action not referenced | High | Medium | Confirm API/replacement action. |
| DELETE-46 | `moveDestination`; server action; same path | None | Ordered destination mutation | `Destination`, `Profile` | Destination UI active, action not referenced | High | Medium | Confirm current reorder path. |
| DELETE-47 | `updateTagDetails`; server action; same path | None | Tag mutation/audit | `Tag`, `AuditLog` | Tag UI/API active, action not referenced | High | Medium | Confirm current API replacement. |
| DELETE-48 | `deleteAdminPlan`; server action; same path | None | Assignment count/delete/audit | `Plan`, `UserPlan`, `AuditLog` | Plan admin active, action not referenced | High | High | Destructive admin behavior; retain unless replacement confirmed. |
| DELETE-49 | `deleteAdminUser`; server action; same path | None | Large user-cleanup transaction/audit | Many user-owned models, including D expense/purchase rows | User admin active, action not referenced | High | High | Do not casually delete; first confirm current account-deletion/admin workflow. |

## 17. Suspected Unused React Components

| Approval ID | Exact name; path | Current readers/inbound | Outbound dependencies | Database dependencies | Route reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|---|
| DELETE-50 | `LoginForm`; `apps/web/src/components/login-form.tsx` | None; whole module unreachable | Client sign-in/form UI | Auth indirectly | None; admin login uses `AdminLoginForm`, regular login uses another path | High | Low | Delete component file after final import/string search. |
| DELETE-51 | `GoogleLinkButton`; `apps/web/src/components/google-link-button.tsx` | None; whole module unreachable | NextAuth `signIn("google")` | `Account`/OAuth indirectly | None through this component; Google auth exists elsewhere | High | Low | Delete this component only, not Google integration. |

Dynamic template frame components are B, not D, because `profile-template-renderer.tsx` reaches them through a dynamic import registry.

## 18. Suspected Unused Hooks / Utilities

No custom hook was classified D.

### Local/exported utilities

| Approval ID | Exact name; path | Current readers/inbound | Outbound/database dependencies | Route reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| DELETE-52 | `visibilityLabel`; `apps/web/src/components/profile-home-editor.tsx` | None; local helper only | Copy/visibility formatting; no DB | Parent component may be active, helper is not | High | Low | Remove local helper only. |
| DELETE-53 | `avatarLetter`; `apps/web/src/components/profile-avatar.tsx` | None; alias export only | `avatarInitials`; no DB | Parent component active, alias not | High | Low | Remove alias export only. |
| DELETE-54 | `APP_NAME`, `PRODUCTION_PUBLIC_URL`; `packages/shared/src/index.ts` | None | Constants only; no DB | None | High | Low | Remove exports if package has no external consumer. |
| DELETE-55 | `SystemRoleValue`; `packages/auth/src/index.ts` | None | Type only; mirrors role domain | None | High | Low | Remove type export if no external consumer. |
| DELETE-56 | `OTP_COOKIE`; `apps/web/src/lib/activation-session.ts` | None | Cookie name; no DB direct | Parent activation module active | High | Low-to-medium | Confirm older client/middleware does not import package externally. |
| DELETE-57 | `SHARE_SOURCE_VALUES`; `apps/web/src/lib/share-center-policy.ts` | None | Share-source constants; no DB direct | Share routes active, export not used | High | Low | Remove constant only. |
| DELETE-58 | `APPROVED_TEMPLATE_SLUGS`; `apps/web/src/lib/profile-templates.ts` | None | Derived template registry | `ProfileTemplate` indirectly | Template routes active, set not used | High | Low | Remove derived set only. |
| DELETE-59 | `ProfileEditorModuleKey`; `apps/web/src/lib/profile-editor.ts` | None | Type only | Profile modules indirectly | Editor active, type not used | High | Low | Remove type export only. |
| DELETE-60 | `LimitKey`, `FeatureKey`; `apps/web/src/lib/plans.ts` | None | Type aliases | `Plan`/entitlements indirectly | Plan code active, types not used | High | Low | Remove type aliases only. |
| DELETE-61 | `NEARBY_HARD_DELETE_AFTER_MS`; `apps/web/src/lib/nearby-policy.ts` | None | Policy constant | Nearby models indirectly | Nearby routes active, constant not used | High | Medium | Confirm intended cleanup job is not pending. |
| DELETE-62 | `mobilePhoneHash`; `apps/web/src/lib/mobile-enrollment.ts` | None | Enrollment digest | Mobile enrollment/security records indirectly | Mobile enrollment active, export not used | High | Medium | Security/API review before removal. |

### Test-only modules

| Approval ID | Exact names; path | Current readers/inbound | Outbound/database dependencies | Runtime reachability | Confidence | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| DELETE-63 | `ADMIN_USER_ACCORDIONS_OPEN_BY_DEFAULT`, `userMatchesAdminLinkSearch`; `apps/web/src/lib/admin-links.ts` | Only `admin-links.test.ts` | Pure matching logic; no DB | None | High | Low | Remove module and its dedicated test together if approved. |
| DELETE-64 | `cardDispositionAfterUserDeletion`; `apps/web/src/lib/card-lifecycle.ts` | Only `card-lifecycle.test.ts` | Card lifecycle values; card/tag DB concepts | None | High | Medium | Confirm planned user-deletion flow before removal. |
| DELETE-65 | `canAcceptTransfer`, `transferOwnerAfterAcceptance`, `TransferState`; `apps/web/src/lib/tag-transfers.ts` | Only `tag-transfers.test.ts` | Transfer rules; `TagTransfer` concept | None | High | Medium | Retain if transfer implementation is planned; otherwise remove with test. |
| DELETE-66 | `visibleProfileFields`, `resolveProfileFieldUrl`; `apps/web/src/lib/profile-fields.ts` | Only `platform.test.ts` | URL normalization/profile-field behavior; `ProfileField` concept | None | High | Medium | Confirm equivalent live renderer behavior before removal. |
| DELETE-67 | `CUSTOMER_PRODUCT_STATUSES`, `canSetProductStatus`, `maskedSerial`; `apps/web/src/lib/product-status.ts` | Only `product-status.test.ts` | Product/card status semantics | None | High | Medium | Confirm active API has replacement validation/masking. |
| DELETE-68 | `nearbyEnabled`, `activityIdentityLabel`; `apps/web/src/lib/privacy-preferences.ts` | Only `privacy-preferences.test.ts` | Nearby/privacy rules; nearby models | None | High | Medium | Privacy review before removal. |
| DELETE-69 | `professionRecommendations`, `recommendationsFor` and registry; `apps/web/src/lib/platform-recommendations.ts` | Only `platform-recommendations.test.ts` | Platform metadata; conceptually tied to `PlatformSuggestion` | None | High | Low-to-medium | Remove with dedicated test if recommendation feature is abandoned. |

`sessionAssuranceDecision` and `LONG_INACTIVITY_DAYS` in `apps/web/src/lib/session-assurance-policy.ts` are also test-only, but classified C/high-risk because they encode planned security behavior. They are deliberately excluded from the deletion approval list.

## 19. Suspected Unused Routes / Pages

No route/page is a confirmed low-risk deletion candidate. The redirect-only pages in Section 11 are C because Next.js makes them reachable and external bookmarks/links are unobservable from this repository. The purchase/expense/supplier redirect chains strengthen evidence that the old CRUD implementations are gone, but do not make the redirect files themselves dead.

Review-only item (E): `apps/web/src/app/api/admin/nearby/status/route.ts` is externally reachable with no in-repo caller. Recommendation: inspect access logs/API documentation before considering deletion.

## 20. Suspected Unused Services / API Methods

- D service/action candidates are DELETE-24, DELETE-27 through DELETE-49, and DELETE-69.
- C planned services: `PopCloudBackupProvider` and `GoogleDriveBackupProvider` in `apps/web/src/lib/backup-providers.ts`. Entire module is unreachable; Google Drive backup throws `GOOGLE_DRIVE_BACKUP_NOT_CONFIGURED`. Recommendation: owner roadmap review, not low-risk automatic deletion.
- No externally exposed API method was classified D solely because there was no web caller. Android consumers and unknown third-party clients were considered.
- `DELETE-51` removes only an unused UI entry point; it does not approve removing Google/NextAuth OAuth services.

## 21. Code → Database Cross Reference

Strong dead/suspected-dead chains:

1. `/admin/purchases`, `/admin/purchases/new`, `/admin/purchases/[id]` redirect to `/admin/inventory`  
   → `createPurchase` / `receivePurchase` have zero inbound callers  
   → `Purchase` / `PurchaseItem` are referenced only by those dead actions plus zero-inbound `deleteAdminUser` cleanup  
   → tables/FKs/indexes remain in Prisma/migrations.

2. `/admin/expenses`, `/admin/expenses/new`, `/admin/expense-categories` redirect to inventory  
   → `createExpense` / `createExpenseCategory` have zero inbound callers  
   → `Expense` / `ExpenseCategory` are referenced only by those actions plus zero-inbound user cleanup  
   → tables/FKs/indexes remain.

3. `/admin/suppliers` redirects to inventory  
   → `createSupplier` has zero inbound callers  
   → `Supplier` otherwise survives through purchase relations and an active inventory `include`  
   → rendered inventory does not consume the included supplier  
   → evidence is suggestive but not sufficient for low-risk deletion.

4. `platform-recommendations.test.ts`  
   → test-only `platform-recommendations.ts`  
   → no runtime recommendation feature  
   → `PlatformSuggestion` has no direct reader/writer  
   → table relations/indexes remain.

5. Active social UI/API  
   → `Friendship` / `FriendRequest`  
   → no path to `Follow`  
   → `Follow` table is schema/migration-only.

6. Active `/product/[slug]` route  
   → nested `ProductImage`, `ProductFeature`, `ProductPrice`, `ProductVariant`, `ProductInventory`, `ProductSlug`  
   → no nested/direct `ProductMedia` use  
   → `ProductMedia` table is schema/migration-only.

7. Zero-inbound `deleteAdminUser`  
   → cleanup mentions purchase/expense records  
   → those references do not independently prove the tables are active because the cleanup action itself has no inbound path.

## 22. Numbered deletion approval list

- DELETE-01 — `Follow` table/model.
- DELETE-02 — `ProductMedia` table/model.
- DELETE-03 — `PlatformSuggestion` table/model.
- DELETE-04 — `Purchase` table/model.
- DELETE-05 — `PurchaseItem` table/model.
- DELETE-06 — `ExpenseCategory` table/model.
- DELETE-07 — `Expense` table/model.
- DELETE-08 — `Supplier` table/model (medium-to-high risk; active unused include exists).
- DELETE-09 — `User.allowNearbyDiscovery`.
- DELETE-10 — `Friendship.favoriteA` and `favoriteB`.
- DELETE-11 — `Destination.customIconStorageKey` and `customIconType`.
- DELETE-12 — `CardBatch.unitProgrammingCost` and `unitPackagingCost`.
- DELETE-13 — `ActivationClaimSession.attemptCount`.
- DELETE-14 — `OtpChallenge.claimSessionId`.
- DELETE-15 — `InventoryItem.imageStorageKey`.
- DELETE-16 — `VirtualCard.avatarKind` and `avatarValue`.
- DELETE-17 — `LinkPlatform.supportsOAuth`.
- DELETE-18 — `OAuthConnectionState.returnPath` (high risk).
- DELETE-19 — `Product.serialPolicy` and unused SEO fields.
- DELETE-20 — `ProductVariant.attributes`.
- DELETE-21 — `ProductInventory.lowStockAt`.
- DELETE-22 — `ProductPrice.activeFrom` and `activeTo`.
- DELETE-23 — `StepUpGrant.assuranceLevel` (high risk).
- DELETE-24 — `promoteDraftImage`.
- DELETE-25 — `canManageOwnedResource`.
- DELETE-26 — unused exports in `share-center.ts`.
- DELETE-27 — unused profile-domain functions.
- DELETE-28 — `canManageProfile`.
- DELETE-29 — `ownerWhere`.
- DELETE-30 — `getOtpTestModeSummary`.
- DELETE-31 — `decimalZero`.
- DELETE-32 — `missingTranslationKeys`.
- DELETE-33 — `missingRequiredLegalDocuments` (high risk).
- DELETE-34 — `normalizedContactHash` / unreachable contact-discovery module.
- DELETE-35 — unused social placeholder actions.
- DELETE-36 — `createSupplier`.
- DELETE-37 — `createPurchase`.
- DELETE-38 — `receivePurchase`.
- DELETE-39 — `createExpenseCategory`.
- DELETE-40 — `createExpense`.
- DELETE-41 — `createCustomer`.
- DELETE-42 — `createOrder`.
- DELETE-43 — `setAdminCardDestination`.
- DELETE-44 — `updateProfileTheme`.
- DELETE-45 — `toggleDestinationVisibility`.
- DELETE-46 — `moveDestination`.
- DELETE-47 — `updateTagDetails`.
- DELETE-48 — `deleteAdminPlan` (high risk).
- DELETE-49 — `deleteAdminUser` (high risk).
- DELETE-50 — unused `LoginForm` component.
- DELETE-51 — unused `GoogleLinkButton` component.
- DELETE-52 — local `visibilityLabel` helper.
- DELETE-53 — `avatarLetter` alias export.
- DELETE-54 — unused shared constants.
- DELETE-55 — unused `SystemRoleValue` type.
- DELETE-56 — unused `OTP_COOKIE` export.
- DELETE-57 — unused `SHARE_SOURCE_VALUES` constant.
- DELETE-58 — unused `APPROVED_TEMPLATE_SLUGS` set.
- DELETE-59 — unused `ProfileEditorModuleKey` type.
- DELETE-60 — unused `LimitKey` and `FeatureKey` types.
- DELETE-61 — unused `NEARBY_HARD_DELETE_AFTER_MS` constant.
- DELETE-62 — unused `mobilePhoneHash` export.
- DELETE-63 — test-only `admin-links.ts` module and dedicated test.
- DELETE-64 — test-only `card-lifecycle.ts` module and dedicated test.
- DELETE-65 — test-only `tag-transfers.ts` module and dedicated test.
- DELETE-66 — test-only `profile-fields.ts` module and its assertions in `platform.test.ts`.
- DELETE-67 — test-only `product-status.ts` module and dedicated test.
- DELETE-68 — test-only `privacy-preferences.ts` module and dedicated test.
- DELETE-69 — test-only `platform-recommendations.ts` module and dedicated test.

No item in this list is approved for deletion by the creation of this report.
