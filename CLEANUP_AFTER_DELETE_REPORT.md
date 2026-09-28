# POP by POPWAM — Cleanup After Delete Report

Cleanup date: 2026-09-15  
Approval scope: DELETE-01 through DELETE-69 from `DATABASE_USAGE_AUDIT.md`, with per-item final dependency checks  
Migration state: prepared, not applied

## 1. Deleted database objects

### Models/tables

Removed from `packages/db/prisma/schema.prisma` and scheduled for removal by the unapplied migration:

- DELETE-01 — `Follow`
- DELETE-02 — `ProductMedia`
- DELETE-03 — `PlatformSuggestion`
- DELETE-04 — `Purchase`
- DELETE-05 — `PurchaseItem`
- DELETE-06 — `ExpenseCategory`
- DELETE-07 — `Expense`

### Columns

- DELETE-09 — `User.allowNearbyDiscovery`
- DELETE-10 — `Friendship.favoriteA`, `Friendship.favoriteB`
- DELETE-12 — `CardBatch.unitProgrammingCost`, `CardBatch.unitPackagingCost`
- DELETE-15 — `InventoryItem.imageStorageKey`
- DELETE-16 — `VirtualCard.avatarKind`, `VirtualCard.avatarValue`
- DELETE-19 — `Product.serialPolicy`, `Product.seoTitleAr`, `Product.seoTitleEn`, `Product.seoDescriptionAr`, `Product.seoDescriptionEn`
- DELETE-20 — `ProductVariant.attributes`
- DELETE-21 — `ProductInventory.lowStockAt`
- DELETE-22 — `ProductPrice.activeFrom`, `ProductPrice.activeTo`

### Relations removed

- `User.createdPurchases`, `User.createdExpenses`
- `User.followsCreated`, `User.followsReceived`
- `User.platformSuggestions`
- `UploadedFile.expenseAttachments`
- `Supplier.purchases` — only the dead purchase relation; the active `Supplier` model was retained
- `InventoryItem.purchaseItems`
- `LinkPlatform.suggestions`
- `Product.media`
- All relations/FKs declared inside the seven removed models

### Indexes and enums

Table-owned primary keys and indexes are removed when their owning tables are dropped, including the `Follow`, `ProductMedia`, `PlatformSuggestion`, `Purchase`, `PurchaseItem`, and `Expense` indexes. No `DROP ... CASCADE` is used.

`PurchaseStatus` was removed because no remaining Prisma model or TypeScript code uses it.

### Migration

Created `packages/db/prisma/migrations/20260915120000_remove_unused_architecture/migration.sql`.

The migration drops the approved tables, their table-owned constraints/indexes, the now-unused enum, and the approved columns. It has **not** been applied to any database. Purchase, expense, social, and catalog data must be reviewed before production deployment.

## 2. Deleted code

### Functions, services, actions, exports, constants, and types

| IDs | File | Deleted items |
|---|---|---|
| DELETE-24 | `packages/storage/src/index.ts` | `promoteDraftImage` |
| DELETE-25, DELETE-55 | `packages/auth/src/index.ts` | `canManageOwnedResource`, `SystemRoleValue` |
| DELETE-54 | `packages/shared/src/index.ts` | `APP_NAME`, `PRODUCTION_PUBLIC_URL` |
| DELETE-30 | `apps/web/src/lib/otp-test-mode.ts` | `getOtpTestModeSummary` and its now-unused import |
| DELETE-31 | `apps/web/src/lib/money.ts` | `decimalZero` |
| DELETE-32 | `apps/web/src/lib/localization-policy.ts` | `missingTranslationKeys` |
| DELETE-35 | `apps/web/src/app/social-actions.ts` | `respondFriend`, `updateFriendship`, `updateFriendPrivacy` |
| DELETE-36–43 | `apps/web/src/app/business-actions.ts` | `createSupplier`, `createPurchase`, `receivePurchase`, `createExpenseCategory`, `createExpense`, `createCustomer`, `createOrder`, `setAdminCardDestination`; obsolete enum/helper imports; purchase/expense reassignment calls from the active safe-user-delete transaction |
| DELETE-47–49 | `apps/web/src/app/actions.ts` | `updateTagDetails`, `deleteAdminPlan`, `deleteAdminUser` |
| DELETE-52 | `apps/web/src/components/profile-home-editor.tsx` | unused local `visibilityLabel` helper |
| DELETE-53 | `apps/web/src/components/profile-avatar.tsx` | unused `avatarLetter` alias export |
| DELETE-56 | `apps/web/src/lib/activation-session.ts` | unused `OTP_COOKIE` export |
| DELETE-57 | `apps/web/src/lib/share-center-policy.ts` | unused `SHARE_SOURCE_VALUES` constant |
| DELETE-58 | `apps/web/src/lib/profile-templates.ts` | unused `APPROVED_TEMPLATE_SLUGS` set |
| DELETE-59 | `apps/web/src/lib/profile-editor.ts` | unused `ProfileEditorModuleKey` type |
| DELETE-60 | `apps/web/src/lib/plans.ts` | unused `LimitKey`, `FeatureKey` types |
| DELETE-61 | `apps/web/src/lib/nearby-policy.ts` | unused `NEARBY_HARD_DELETE_AFTER_MS` constant |
| DELETE-62 | `apps/web/src/lib/mobile-enrollment.ts` | unused `mobilePhoneHash` export |

### Source files deleted

- DELETE-34 — `apps/web/src/lib/contact-discovery.ts`
- DELETE-50 — `apps/web/src/components/login-form.tsx`
- DELETE-51 — `apps/web/src/components/google-link-button.tsx`
- DELETE-63 — `apps/web/src/lib/admin-links.ts`
- DELETE-64 — `apps/web/src/lib/card-lifecycle.ts`
- DELETE-65 — `apps/web/src/lib/tag-transfers.ts`
- DELETE-66 — `apps/web/src/lib/profile-fields.ts`
- DELETE-67 — `apps/web/src/lib/product-status.ts`
- DELETE-68 — `apps/web/src/lib/privacy-preferences.ts`
- DELETE-69 — `apps/web/src/lib/platform-recommendations.ts`

No replacement abstraction was introduced.

## 3. Deleted tests

Deleted tests whose sole subject was a deleted test-only module:

- `apps/web/src/lib/admin-links.test.ts`
- `apps/web/src/lib/card-lifecycle.test.ts`
- `apps/web/src/lib/tag-transfers.test.ts`
- `apps/web/src/lib/product-status.test.ts`
- `apps/web/src/lib/privacy-preferences.test.ts`
- `apps/web/src/lib/platform-recommendations.test.ts`

Also removed:

- The two `profile-fields.ts` assertions and import from `apps/web/src/lib/platform.test.ts`; the remaining current platform tests were retained.
- The obsolete source-file assertion for deleted `login-form.tsx` from `apps/web/src/lib/admin-access.test.ts`; the remaining administrator-authentication tests were retained.

## 4. Superseded initial skips

The table below records the first cleanup pass only. Final owner approval subsequently removed every item in this table; see Section 10 for the authoritative final state.

| ID | Retained item | Final dependency found |
|---|---|---|
| DELETE-08 | `Supplier` model/table | Active runtime/UI use: `apps/web/src/app/admin/inventory/low-stock/page.tsx` renders `supplier.name`; card-batch list/detail pages also include and render supplier data. `InventoryItem.supplierId` and `CardBatch.supplierId` remain active FKs. The includes were therefore not removed. |
| DELETE-11 | `Destination.customIconStorageKey`, `Destination.customIconType` | `apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts` returns full `Destination` records. Removing fields would alter a current Android-facing API payload, so the fields were preserved under the API-contract safety rule. |
| DELETE-13 | `ActivationClaimSession.attemptCount` | The containing model is active in web/mobile activation routes. It is retained as part of the protected activation/security architecture. |
| DELETE-14 | `OtpChallenge.claimSessionId` | Active FK/index between `OtpChallenge` and `ActivationClaimSession`; both participate in current activation/security flows. |
| DELETE-17 | `LinkPlatform.supportsOAuth` | Current LinkPlatform records are fetched whole by active admin/dashboard code and passed into the client catalog/capture surface. The current catalog and OAuth capability data are protected. |
| DELETE-18 | `OAuthConnectionState.returnPath` | `OAuthConnectionState` is active in integration connect/callback handling. Retained as OAuth state/security data even though current code uses the default/fixed callback path. |
| DELETE-23 | `StepUpGrant.assuranceLevel` | `StepUpGrant` is actively created and consumed by `apps/web/src/lib/security-step-up.ts`; the field remains part of the protected step-up security record. |
| DELETE-26 | `shareDestinationIsCurrentlyPublished`, `activationAttemptFingerprintForTest` | Both reside in the active share-security service `apps/web/src/lib/share-center.ts`. No inbound caller was found, but the owner explicitly protected share security; retained rather than weakening that boundary during dead-code cleanup. |
| DELETE-27 | `createPrimaryProfile`, `setPrimaryProfile`, `addProfileModule` | These are profile-domain transaction helpers over current Profile/module relations. No inbound caller was found, but Profiles and profile modules were explicitly protected. |
| DELETE-28 | `canManageProfile` | Authorization helper over active Profile/Membership data; retained under the profile/auth protection rule. |
| DELETE-29 | `ownerWhere` | Ownership authorization helper in the active permissions module; retained under the auth/security protection rule. |
| DELETE-33 | `missingRequiredLegalDocuments` | Legal-document/consent service; Legal was explicitly protected. |
| DELETE-44 | `updateProfileTheme` | Profile mutation and revalidation action; retained because Profiles and profile presentation were explicitly protected. |
| DELETE-45 | `toggleDestinationVisibility` | Mutates profile destination visibility and revalidates public/tag routes; retained under profile visibility and canonical/share-route protection. |
| DELETE-46 | `moveDestination` | Mutates current profile destination ordering and revalidates the public profile; retained under profile visibility protection. |

## 5. Visual/UI protection report

### Visual/UI files changed by cleanup

| File | Type | Action | Why | Visual impact |
|---|---|---|---|---|
| `apps/web/src/components/login-form.tsx` | TSX component | Deleted | Whole module had no runtime/framework inbound path | None; active `/login` uses the current login implementation |
| `apps/web/src/components/google-link-button.tsx` | TSX component | Deleted | Whole module had no inbound component reference | None; active Google/NextAuth integration remains |
| `apps/web/src/components/profile-home-editor.tsx` | TSX component | Modified | Removed unused local `visibilityLabel` only | None; render tree unchanged |
| `apps/web/src/components/profile-avatar.tsx` | TSX component | Modified | Removed unused alias export `avatarLetter` only | None; `ProfileAvatar` and `avatarInitials` unchanged |

### Protected Android/Figma work intentionally preserved

The cleanup did not modify or delete any Android file. All pre-existing modified/untracked Android visual work was preserved, including:

- `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeContract.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopPlanThemes.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopFontPreference.kt`
- All current `pop_figma_*` and `pop_approved_*` drawable assets
- All current `pop_appearance_typography.xml`, `pop_back_behavior.xml`, `pop_menu_figma.xml`, and `pop_share_figma.xml` localization resources
- `POP_ANDROID_VISUAL_BATCH/`, `POP_ANDROID_VISUAL_BATCH.zip`, and `docs/POP_VISUAL_SURFACE_MAP.md`

## 6. Remaining dead-code references

The post-cleanup search found no dangling imports or application references to the deleted modules, models, enum, fields, or exports.

Items intentionally left for a future approval/review:

- `requestFriend` in `apps/web/src/app/social-actions.ts` is another zero-inbound `FRIENDS_API_REQUIRED` placeholder, but it was not included in DELETE-35 or another approved ID.
- `apps/web/src/lib/backup-providers.ts` remains an unreachable but intentionally retained backup-integration scaffold (Class C).
- `apps/web/src/lib/session-assurance-policy.ts` remains test-only but encodes protected planned security behavior (Class C).
- The skipped DELETE IDs in Section 4 remain in the tree for their stated safety dependencies.
- Redirect-only compatibility pages and the externally reachable `/api/admin/nearby/status` handler remain pending owner/access-log review; no route deletion was approved.
- Historical migrations and the untracked `artifacts/neon-schema.sql` still contain historical names by design and were not rewritten.

## 7. Verification results

| Check | Result |
|---|---|
| Prisma format | Passed: `pnpm --filter @popwam/db prisma format` |
| Prisma validation | Passed: schema valid |
| Prisma generation | Passed: Prisma Client 6.19.1 generated |
| TypeScript — auth/shared/storage/db/web | Passed: all package `tsc --noEmit`/lint commands exited successfully |
| Route compilation | Passed: `pnpm --filter @popwam/web build`; optimized production build compiled and generated 183 routes |
| Focused current tests | Passed: `admin-access.test.ts` and `platform.test.ts`, 43 tests total |
| Unresolved imports/reference scan | Passed: no dangling deleted-module imports or application references to removed Prisma identifiers |
| Android API contract check | No backend route file or Android contract was changed; Kotlin reference scan found none of the removed schema/code identifiers |
| Destructive migration deployment | Not run; migration remains pending owner deployment/data-retention approval |

Non-failing warnings: Prisma reports the deprecated `package.json#prisma` configuration property; Next.js reports that edge runtime disables static generation for one page. Neither was introduced by this cleanup.

## 8. Git diff summary

### Files deleted

Sixteen tracked files were deleted: the ten source/component files in Section 2 and the six dedicated test files in Section 3.

### Files modified by cleanup

- `apps/web/src/app/actions.ts`
- `apps/web/src/app/business-actions.ts`
- `apps/web/src/app/social-actions.ts`
- `apps/web/src/components/profile-avatar.tsx`
- `apps/web/src/components/profile-home-editor.tsx`
- `apps/web/src/lib/activation-session.ts`
- `apps/web/src/lib/admin-access.test.ts`
- `apps/web/src/lib/localization-policy.ts`
- `apps/web/src/lib/mobile-enrollment.ts`
- `apps/web/src/lib/money.ts`
- `apps/web/src/lib/nearby-policy.ts`
- `apps/web/src/lib/otp-test-mode.ts`
- `apps/web/src/lib/plans.ts`
- `apps/web/src/lib/platform.test.ts`
- `apps/web/src/lib/profile-editor.ts`
- `apps/web/src/lib/profile-templates.ts`
- `apps/web/src/lib/share-center-policy.ts`
- `packages/auth/src/index.ts`
- `packages/db/prisma/schema.prisma`
- `packages/shared/src/index.ts`
- `packages/storage/src/index.ts`

### Files created

- `CLEANUP_AFTER_DELETE_REPORT.md`
- `packages/db/prisma/migrations/20260915120000_remove_unused_architecture/migration.sql`

`DATABASE_USAGE_AUDIT.md` remains the untracked Phase 1 report. No file was staged or committed.

## 9. Final git status

```text
 M apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeContract.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopPlanThemes.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt
 M apps/android/app/src/main/res/drawable-nodpi/pop_approved_section_verification.png
 M apps/web/src/app/actions.ts
 M apps/web/src/app/business-actions.ts
 M apps/web/src/app/social-actions.ts
 D apps/web/src/components/google-link-button.tsx
 D apps/web/src/components/login-form.tsx
 M apps/web/src/components/profile-avatar.tsx
 M apps/web/src/components/profile-home-editor.tsx
 M apps/web/src/lib/activation-session.ts
 M apps/web/src/lib/admin-access.test.ts
 D apps/web/src/lib/admin-links.test.ts
 D apps/web/src/lib/admin-links.ts
 D apps/web/src/lib/card-lifecycle.test.ts
 D apps/web/src/lib/card-lifecycle.ts
 D apps/web/src/lib/contact-discovery.ts
 M apps/web/src/lib/localization-policy.ts
 M apps/web/src/lib/mobile-enrollment.ts
 M apps/web/src/lib/money.ts
 M apps/web/src/lib/nearby-policy.ts
 M apps/web/src/lib/otp-test-mode.ts
 M apps/web/src/lib/plans.ts
 D apps/web/src/lib/platform-recommendations.test.ts
 D apps/web/src/lib/platform-recommendations.ts
 M apps/web/src/lib/platform.test.ts
 D apps/web/src/lib/privacy-preferences.test.ts
 D apps/web/src/lib/privacy-preferences.ts
 D apps/web/src/lib/product-status.test.ts
 D apps/web/src/lib/product-status.ts
 M apps/web/src/lib/profile-editor.ts
 D apps/web/src/lib/profile-fields.ts
 M apps/web/src/lib/profile-templates.ts
 M apps/web/src/lib/share-center-policy.ts
 D apps/web/src/lib/tag-transfers.test.ts
 D apps/web/src/lib/tag-transfers.ts
 M packages/auth/src/index.ts
 M packages/db/prisma/schema.prisma
 M packages/shared/src/index.ts
 M packages/storage/src/index.ts
?? CLEANUP_AFTER_DELETE_REPORT.md
?? DATABASE_USAGE_AUDIT.md
?? POP_ANDROID_VISUAL_BATCH.zip
?? POP_ANDROID_VISUAL_BATCH/
?? apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopFontPreference.kt
?? apps/android/app/src/main/res/drawable-nodpi/pop_approved_verification_badge.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_home_avatar_placeholder.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_home_search.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_account_info.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_account_setup.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_avatar_person.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_copy.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_full_settings.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_language_region.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_location.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_login_security.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_logout.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_passcode_fingerprint.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_saved_devices.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_close.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_download_qr.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_hce.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_link.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_messages.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_nfc.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_privacy.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_privacy_chevron.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_qr_mark.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_whatsapp.png
?? apps/android/app/src/main/res/values-ar/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values-ar/pop_back_behavior.xml
?? apps/android/app/src/main/res/values-ar/pop_menu_figma.xml
?? apps/android/app/src/main/res/values-ar/pop_share_figma.xml
?? apps/android/app/src/main/res/values-fr/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values-fr/pop_back_behavior.xml
?? apps/android/app/src/main/res/values-fr/pop_menu_figma.xml
?? apps/android/app/src/main/res/values-fr/pop_share_figma.xml
?? apps/android/app/src/main/res/values/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values/pop_back_behavior.xml
?? apps/android/app/src/main/res/values/pop_menu_figma.xml
?? apps/android/app/src/main/res/values/pop_share_figma.xml
?? artifacts/neon-schema.sql
?? docs/POP_VISUAL_SURFACE_MAP.md
?? packages/db/prisma/migrations/20260915120000_remove_unused_architecture/
```

## 10. Final remaining cleanup addendum

This addendum supersedes the retained/skipped conclusions in Section 4 and the earlier verification/status snapshot. The repository owner subsequently approved removal of all 15 previously skipped IDs.

### 10.1 Additional deleted IDs

The final cleanup deleted: `DELETE-08`, `DELETE-11`, `DELETE-13`, `DELETE-14`, `DELETE-17`, `DELETE-18`, `DELETE-23`, `DELETE-26`, `DELETE-27`, `DELETE-28`, `DELETE-29`, `DELETE-33`, `DELETE-44`, `DELETE-45`, and `DELETE-46`.

### 10.2 Exact schema changes

Removed from `packages/db/prisma/schema.prisma` and added to the pending migration:

- `Supplier` model/table.
- `InventoryItem.supplierId`, `InventoryItem.supplier`, and `@@index([supplierId])`.
- `CardBatch.supplierId`, `CardBatch.supplier`, and `@@index([supplierId])`.
- `Destination.customIconStorageKey` and `Destination.customIconType`.
- `ActivationClaimSession.attemptCount` and `ActivationClaimSession.otpChallenges`.
- `OtpChallenge.claimSessionId`, `OtpChallenge.claimSession`, and `@@index([claimSessionId])`.
- `LinkPlatform.supportsOAuth`.
- `OAuthConnectionState.returnPath`.
- `StepUpGrant.assuranceLevel`.

The migration explicitly drops `OtpChallenge_claimSessionId_fkey`, `CardBatch_supplierId_fkey`, and `InventoryItem_supplierId_fkey`, plus their three indexes, before dropping the associated columns/table. It contains no `DROP ... CASCADE`.

### 10.3 Exact source files changed in the final cleanup

Modified:

- `apps/web/src/app/actions.ts`
- `apps/web/src/app/admin/cards/batches/[id]/page.tsx`
- `apps/web/src/app/admin/cards/batches/page.tsx`
- `apps/web/src/app/admin/inventory/low-stock/page.tsx`
- `apps/web/src/app/admin/inventory/page.tsx`
- `apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts`
- `apps/web/src/app/dashboard/cards/page.tsx`
- `apps/web/src/components/platform-link-capture.tsx`
- `apps/web/src/lib/legal-consent.ts`
- `apps/web/src/lib/permissions.ts`
- `apps/web/src/lib/profile-authorization.ts`
- `apps/web/src/lib/profile-domain.ts`
- `apps/web/src/lib/share-center.ts`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260915120000_remove_unused_architecture/migration.sql`
- `CLEANUP_AFTER_DELETE_REPORT.md`

Deleted:

- `apps/web/src/app/admin/suppliers/page.tsx`

### 10.4 Supplier UI references removed

- Removed supplier lookup/rendering from `apps/web/src/app/admin/inventory/low-stock/page.tsx`.
- Removed supplier lookup/rendering from `apps/web/src/app/admin/cards/batches/page.tsx`.
- Removed supplier lookup/rendering and the Supplier summary tile from `apps/web/src/app/admin/cards/batches/[id]/page.tsx`.
- Removed the unused supplier include from `apps/web/src/app/admin/inventory/page.tsx`.
- Deleted the redirect-only `/admin/suppliers` filesystem route.
- No replacement supplier abstraction was created.

### 10.5 Duplicate Profile actions removed

Removed `createPrimaryProfile`, `setPrimaryProfile`, `addProfileModule`, and the newly orphaned `AddProfileModuleInput` from `apps/web/src/lib/profile-domain.ts`. The active initial bootstrap, additional-profile API, archive flow, and Profile Editor module mutation remain authoritative.

Removed `canManageProfile` from `apps/web/src/lib/profile-authorization.ts` and `ownerWhere` from `apps/web/src/lib/permissions.ts`; current route/editor authorization and active permission functions were not changed.

### 10.6 Duplicate server actions and helpers removed

- `updateProfileTheme`; active `updateProfile`, mobile profile PATCH, and template-selection paths remain.
- `toggleDestinationVisibility`; active Profile Editor/link mutation paths remain.
- `moveDestination`; no replacement was introduced.
- `missingRequiredLegalDocuments`; active Legal document resolution, consent, acceptance, and routes remain.
- `shareDestinationIsCurrentlyPublished` and `activationAttemptFingerprintForTest`; active Share security behavior remains.

### 10.7 Security fields removed without behavior changes

- `ActivationClaimSession.attemptCount` was removed; `ActivationAttempt` remains the rate-limit/history authority.
- The unused OTP-to-activation-claim association was removed; active OTP and activation flows were not changed.
- `OAuthConnectionState.returnPath` was removed; the callback still uses the fixed integrations destination.
- `StepUpGrant.assuranceLevel` was removed; user, session binding, purpose, expiry, and consumption validation are unchanged.

### 10.8 Current DTO changes

`apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts` now uses an explicit Prisma select for both GET and POST responses containing only the current Android `DestinationDto` fields: `id`, `profileId`, `title`, `titleAr`, `titleEn`, `type`, `url`, `iconKey`, and `isActive`. Current icon behavior is unchanged.

`apps/web/src/app/dashboard/cards/page.tsx` now selects the explicit exported `PlatformLinkCapturePlatform` DTO instead of fetching and spreading whole `LinkPlatform` rows into the client component. `oauthProvider` and connected-account provider configuration remain authoritative.

### 10.9 Migration status

`packages/db/prisma/migrations/20260915120000_remove_unused_architecture/migration.sql` was extended in place. It is destructive and remains pending. It was not applied to Production or any other database by this cleanup.

### 10.10 Verification results

| Check | Final result |
|---|---|
| Prisma format | Passed: `pnpm --filter @popwam/db prisma format` |
| Prisma validate | Passed: current schema is valid |
| Prisma generate | Passed: Prisma Client 6.19.1 regenerated |
| TypeScript checks | Passed: `pnpm lint` for auth/shared/storage/db plus a clean `pnpm --filter @popwam/web lint` after regenerating route types |
| Production web build | Passed: `pnpm --filter @popwam/web build`; 182 routes generated and `/admin/suppliers` is absent |
| Unresolved import/reference check | Passed: no source/schema references remain for the 15 deleted IDs; historical migrations/reports are intentionally excluded |
| Migration safety check | Passed: explicit FK/index removal; no `DROP ... CASCADE`; migration not applied |

The first aggregate TypeScript run encountered a stale `.next/types/app/admin/suppliers/page.ts` artifact after the route deletion. Next route types were regenerated, the stale generated page type was removed from the local build cache, and the clean web TypeScript check and production build then passed. This was generated cache, not a source failure.

Non-failing warnings remain unchanged: Prisma warns about the deprecated `package.json#prisma` configuration property, and Next reports that edge runtime disables static generation for one page.

### 10.11 Newly discovered dead-code candidates (report only)

No additional code was deleted during this follow-up pass.

- **`LINK_REORDER` dormant capability:** `apps/web/src/lib/profile-editor.ts:63` declares the action and `apps/web/src/lib/profile-editor.ts:660` implements it. No current UI/API client sender was found. It was retained because the generic authenticated `apps/web/src/app/api/profiles/[profileId]/editor/route.ts` can still receive that action, so it is not strictly definition-only. Recommendation: owner-review the API contract, then either add the intended UI sender or remove the union member/handler together.
- **Stale supplier/purchase/expense localization contract:** `apps/web/locales/en.json`, `apps/web/locales/ar.json`, and the `NavLabels` type in `apps/web/src/components/dashboard-shell.tsx` still contain unused supplier/purchase/expense labels, including `noSupplier`. These strings do not keep schema/runtime architecture alive. They were not deleted because the instruction for this final pass was to report newly found candidates rather than start another cleanup wave.
- The focused exported-server-action scan found no new definition-only server-action candidate beyond previously documented items. No newly obsolete Prisma field, Android DTO field, or test-only production module was identified.

### 10.12 Android and visual protection confirmation

No Android source, Android visual component, `pop_figma_*`/`pop_approved_*` asset, theme/typography file, localization XML file, Bottom Navigation, Home, My Profile, Share, Menu, or Loading/Splash file was modified or deleted by this final cleanup. All Android changes shown by Git remain pre-existing protected work.

### 10.13 Final diff and status

`git diff --stat` (includes the pre-existing protected Android visual work and the earlier approved cleanup in this same working tree):

```text
 .../main/java/com/popwam/pop/ui/AppViewModels.kt   |   8 -
 .../main/java/com/popwam/pop/ui/FigmaNavigation.kt | 187 +++--
 .../src/main/java/com/popwam/pop/ui/MenuScreens.kt | 544 ++++++++++++---
 .../src/main/java/com/popwam/pop/ui/PopwamApp.kt   |  14 +-
 .../com/popwam/pop/ui/SecuritySettingsScreen.kt    | 118 ++--
 .../ui/components/PopApprovedProfileComponents.kt  |  77 ++-
 .../popwam/pop/ui/components/PopBrandedLoading.kt  | 176 ++---
 .../java/com/popwam/pop/ui/home/HomeContract.kt    |   3 +-
 .../main/java/com/popwam/pop/ui/home/HomeScreen.kt | 610 +++++++++++++++--
 .../java/com/popwam/pop/ui/home/HomeViewModel.kt   |  11 +-
 .../com/popwam/pop/ui/profile/ProfileScreens.kt    | 394 ++++++++++-
 .../java/com/popwam/pop/ui/share/ShareScreens.kt   | 752 +++++++++++---------
 .../java/com/popwam/pop/ui/theme/PopPlanThemes.kt  |  35 +-
 .../src/main/java/com/popwam/pop/ui/theme/Theme.kt | 187 ++++-
 .../pop_approved_section_verification.png          | Bin 4494 -> 3447 bytes
 apps/web/src/app/actions.ts                        |  34 -
 apps/web/src/app/admin/cards/batches/[id]/page.tsx |   4 +-
 apps/web/src/app/admin/cards/batches/page.tsx      |   6 +-
 .../web/src/app/admin/inventory/low-stock/page.tsx |   2 +-
 apps/web/src/app/admin/inventory/page.tsx          |   2 +-
 apps/web/src/app/admin/suppliers/page.tsx          |   2 -
 .../api/mobile/profiles/[id]/destinations/route.ts |  16 +-
 apps/web/src/app/business-actions.ts               |  50 +-
 apps/web/src/app/dashboard/cards/page.tsx          |  23 +-
 apps/web/src/app/social-actions.ts                 |   6 -
 apps/web/src/components/google-link-button.tsx     |   3 -
 apps/web/src/components/login-form.tsx             |  18 -
 apps/web/src/components/platform-link-capture.tsx  |   4 +-
 apps/web/src/components/profile-avatar.tsx         |   2 -
 apps/web/src/components/profile-home-editor.tsx    |   4 -
 apps/web/src/lib/activation-session.ts             |   1 -
 apps/web/src/lib/admin-access.test.ts              |   5 -
 apps/web/src/lib/admin-links.test.ts               |  10 -
 apps/web/src/lib/admin-links.ts                    |   7 -
 apps/web/src/lib/card-lifecycle.test.ts            |   7 -
 apps/web/src/lib/card-lifecycle.ts                 |   6 -
 apps/web/src/lib/contact-discovery.ts              |   3 -
 apps/web/src/lib/legal-consent.ts                  |  19 -
 apps/web/src/lib/localization-policy.ts            |   4 -
 apps/web/src/lib/mobile-enrollment.ts              |   1 -
 apps/web/src/lib/money.ts                          |   4 -
 apps/web/src/lib/nearby-policy.ts                  |   1 -
 apps/web/src/lib/otp-test-mode.ts                  |  12 +-
 apps/web/src/lib/permissions.ts                    |   4 -
 apps/web/src/lib/plans.ts                          |   2 -
 apps/web/src/lib/platform-recommendations.test.ts  |   3 -
 apps/web/src/lib/platform-recommendations.ts       |   4 -
 apps/web/src/lib/platform.test.ts                  |   3 -
 apps/web/src/lib/privacy-preferences.test.ts       |   2 -
 apps/web/src/lib/privacy-preferences.ts            |   2 -
 apps/web/src/lib/product-status.test.ts            |   2 -
 apps/web/src/lib/product-status.ts                 |   3 -
 apps/web/src/lib/profile-authorization.ts          |  16 +-
 apps/web/src/lib/profile-domain.ts                 |  57 +-
 apps/web/src/lib/profile-editor.ts                 |   1 -
 apps/web/src/lib/profile-fields.ts                 |   4 -
 apps/web/src/lib/profile-templates.ts              |   1 -
 apps/web/src/lib/share-center-policy.ts            |   1 -
 apps/web/src/lib/share-center.ts                   |  10 +-
 apps/web/src/lib/tag-transfers.test.ts             |  16 -
 apps/web/src/lib/tag-transfers.ts                  |   9 -
 packages/auth/src/index.ts                         |   6 -
 packages/db/prisma/schema.prisma                   | 756 ++++++++-------------
 packages/shared/src/index.ts                       |   2 -
 packages/storage/src/index.ts                      |   4 -
 65 files changed, 2689 insertions(+), 1591 deletions(-)
```

`git status --short`:

```text
 M apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeContract.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopPlanThemes.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt
 M apps/android/app/src/main/res/drawable-nodpi/pop_approved_section_verification.png
 M apps/web/src/app/actions.ts
 M apps/web/src/app/admin/cards/batches/[id]/page.tsx
 M apps/web/src/app/admin/cards/batches/page.tsx
 M apps/web/src/app/admin/inventory/low-stock/page.tsx
 M apps/web/src/app/admin/inventory/page.tsx
 D apps/web/src/app/admin/suppliers/page.tsx
 M apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts
 M apps/web/src/app/business-actions.ts
 M apps/web/src/app/dashboard/cards/page.tsx
 M apps/web/src/app/social-actions.ts
 D apps/web/src/components/google-link-button.tsx
 D apps/web/src/components/login-form.tsx
 M apps/web/src/components/platform-link-capture.tsx
 M apps/web/src/components/profile-avatar.tsx
 M apps/web/src/components/profile-home-editor.tsx
 M apps/web/src/lib/activation-session.ts
 M apps/web/src/lib/admin-access.test.ts
 D apps/web/src/lib/admin-links.test.ts
 D apps/web/src/lib/admin-links.ts
 D apps/web/src/lib/card-lifecycle.test.ts
 D apps/web/src/lib/card-lifecycle.ts
 D apps/web/src/lib/contact-discovery.ts
 M apps/web/src/lib/legal-consent.ts
 M apps/web/src/lib/localization-policy.ts
 M apps/web/src/lib/mobile-enrollment.ts
 M apps/web/src/lib/money.ts
 M apps/web/src/lib/nearby-policy.ts
 M apps/web/src/lib/otp-test-mode.ts
 M apps/web/src/lib/permissions.ts
 M apps/web/src/lib/plans.ts
 D apps/web/src/lib/platform-recommendations.test.ts
 D apps/web/src/lib/platform-recommendations.ts
 M apps/web/src/lib/platform.test.ts
 D apps/web/src/lib/privacy-preferences.test.ts
 D apps/web/src/lib/privacy-preferences.ts
 D apps/web/src/lib/product-status.test.ts
 D apps/web/src/lib/product-status.ts
 M apps/web/src/lib/profile-authorization.ts
 M apps/web/src/lib/profile-domain.ts
 M apps/web/src/lib/profile-editor.ts
 D apps/web/src/lib/profile-fields.ts
 M apps/web/src/lib/profile-templates.ts
 M apps/web/src/lib/share-center-policy.ts
 M apps/web/src/lib/share-center.ts
 D apps/web/src/lib/tag-transfers.test.ts
 D apps/web/src/lib/tag-transfers.ts
 M packages/auth/src/index.ts
 M packages/db/prisma/schema.prisma
 M packages/shared/src/index.ts
 M packages/storage/src/index.ts
?? CLEANUP_AFTER_DELETE_REPORT.md
?? DATABASE_USAGE_AUDIT.md
?? POP_ANDROID_VISUAL_BATCH.zip
?? POP_ANDROID_VISUAL_BATCH/
?? REMAINING_SKIPPED_CLEANUP_REPORT.md
?? apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopFontPreference.kt
?? apps/android/app/src/main/res/drawable-nodpi/pop_approved_verification_badge.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_home_avatar_placeholder.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_home_search.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_account_info.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_account_setup.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_avatar_person.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_copy.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_full_settings.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_language_region.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_location.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_login_security.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_logout.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_passcode_fingerprint.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_menu_saved_devices.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_close.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_download_qr.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_hce.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_link.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_messages.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_nfc.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_privacy.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_privacy_chevron.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_qr_mark.png
?? apps/android/app/src/main/res/drawable-nodpi/pop_figma_share_whatsapp.png
?? apps/android/app/src/main/res/values-ar/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values-ar/pop_back_behavior.xml
?? apps/android/app/src/main/res/values-ar/pop_menu_figma.xml
?? apps/android/app/src/main/res/values-ar/pop_share_figma.xml
?? apps/android/app/src/main/res/values-fr/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values-fr/pop_back_behavior.xml
?? apps/android/app/src/main/res/values-fr/pop_menu_figma.xml
?? apps/android/app/src/main/res/values-fr/pop_share_figma.xml
?? apps/android/app/src/main/res/values/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values/pop_back_behavior.xml
?? apps/android/app/src/main/res/values/pop_menu_figma.xml
?? apps/android/app/src/main/res/values/pop_share_figma.xml
?? artifacts/neon-schema.sql
?? docs/POP_VISUAL_SURFACE_MAP.md
?? packages/db/prisma/migrations/20260915120000_remove_unused_architecture/
```
