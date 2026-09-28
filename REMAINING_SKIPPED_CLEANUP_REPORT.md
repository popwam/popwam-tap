# Remaining Skipped Cleanup Report

Date: 2026-09-15

## Scope and method

This report rechecks only the 15 items retained in `CLEANUP_AFTER_DELETE_REPORT.md`: `DELETE-08`, `DELETE-11`, `DELETE-13`, `DELETE-14`, `DELETE-17`, `DELETE-18`, `DELETE-23`, `DELETE-26`, `DELETE-27`, `DELETE-28`, `DELETE-29`, `DELETE-33`, `DELETE-44`, `DELETE-45`, and `DELETE-46`.

The current post-cleanup tree was searched for direct property access, static imports, dynamic imports, route registration/filesystem routes, component composition, server actions, callbacks, API serialization, Prisma reads/writes and relations, tests, scripts/jobs, Android consumers, and string-based references. Generated Prisma availability and a whole-record query were not treated as proof that a particular field is used. No code, Prisma schema, migration, Android/visual file, test, or existing report was modified; the pending destructive migration was not applied.

## Executive conclusion

- Twelve IDs are removable after a small, targeted dependency cleanup or a definition-only removal: `DELETE-11`, `DELETE-13`, `DELETE-14`, `DELETE-17`, `DELETE-26`, `DELETE-27`, `DELETE-28`, `DELETE-29`, `DELETE-33`, `DELETE-44`, `DELETE-45`, and `DELETE-46`.
- Three IDs require an owner/security decision before removal: `DELETE-08`, `DELETE-18`, and `DELETE-23`.
- No reviewed item is proven to be an unavoidable framework requirement. `DELETE-08` has real current UI reads, but it is a read-only residual architecture rather than a complete current supplier workflow. `DELETE-18` and `DELETE-23` sit in active security records, but their individual fields are not enforced or consumed by current code.
- The strongest remaining sources of architectural ambiguity are the read-only `Supplier` domain, the unused profile-domain mutation alternatives in `DELETE-27`, the duplicate server actions in `DELETE-44` through `DELETE-46`, and placeholder/legacy fields beside current OAuth, OTP, and step-up implementations.

## Supplier finding

`Supplier` is **not** kept alive only by the unnecessary include in `apps/web/src/app/admin/inventory/page.tsx`. That include is accidental because the page never renders `item.supplier`. However, three active filesystem-routed admin pages deliberately render supplier names:

- `apps/web/src/app/admin/inventory/low-stock/page.tsx`
- `apps/web/src/app/admin/cards/batches/page.tsx`
- `apps/web/src/app/admin/cards/batches/[id]/page.tsx`

At the same time, the repository has no current application writer for `Supplier`, `InventoryItem.supplierId`, or `CardBatch.supplierId`. The supplier creation action was deleted, `/admin/suppliers` only redirects to `/admin/inventory`, the active inventory-item form does not accept a supplier, and the active production-batch endpoint does not assign one. New inventory and batch records therefore cannot acquire supplier metadata through the current application.

The resulting architecture is read-only and historical: existing supplier names can still be shown, but the current product cannot manage or attach them. This is more than one stray include, but it is not a coherent current inventory subsystem. Keeping it indefinitely can mislead future Codex work into assuming purchasing/supplier management is active. Removal requires an owner decision about the value and retention of existing supplier data, followed by removal of the three visible UI reads, the one unused include, both optional relations/FKs/indexes, and the model.

## DELETE-08

- **Exact object:** Prisma model/table `Supplier`, including its remaining `InventoryItem` and `CardBatch` relations.
- **Exact object path:** `packages/db/prisma/schema.prisma:2228`; relation endpoints at `packages/db/prisma/schema.prisma:1979`, `packages/db/prisma/schema.prisma:1991`, `packages/db/prisma/schema.prisma:1999`, `packages/db/prisma/schema.prisma:2249`, `packages/db/prisma/schema.prisma:2259`, and `packages/db/prisma/schema.prisma:2266`.
- **Why deletion was skipped:** The final cleanup check found active Next.js pages that include and render `supplier.name`, plus live optional FKs from current inventory and card-batch models.
- **Exact active dependency:** `apps/web/src/app/admin/inventory/low-stock/page.tsx` displays the supplier for low-stock items; `apps/web/src/app/admin/cards/batches/page.tsx` and `apps/web/src/app/admin/cards/batches/[id]/page.tsx` display the batch supplier. `apps/web/src/app/admin/inventory/page.tsx:9` also includes `supplier`, but does not consume it.
- **Who reads it:** The three admin pages above read `Supplier.name`. The inventory landing page fetches it without reading it.
- **Who writes it:** No current application code writes `Supplier` or either `supplierId`. `apps/web/src/app/business-actions.ts:30` creates inventory items without `supplierId`; `apps/web/src/app/api/admin/card-batches/route.ts:37` creates card batches without `supplierId`. `/admin/suppliers` is a redirect-only route.
- **Dependency type:** **Real current product functionality** for the three visible labels, mixed with one **accidental/unused reference preventing deletion**. The overall domain is read-only legacy/compatibility architecture, not an end-to-end current supplier workflow.
- **Can it be removed after a small cleanup?** Not safely as a purely mechanical cleanup. It is technically compact, but requires an owner decision and a data/value audit before removing visible historical metadata and two FKs.
- **Risk if removed:** Medium-high. The current admin UI would lose displayed supplier provenance, existing supplier associations/data would be destructively removed, and any out-of-repository reporting against those FKs would break.
- **Recommendation:** **REVIEW LATER**. Decide whether historical supplier provenance is a product/finance requirement. If not, clean the three UI reads and unused include, audit/export retained data if necessary, then delete the relations and model in an owner-approved migration.

## DELETE-11

- **Exact object:** `Destination.customIconStorageKey` and `Destination.customIconType`.
- **Exact object path:** `packages/db/prisma/schema.prisma:1903` and `packages/db/prisma/schema.prisma:1904`.
- **Why deletion was skipped:** `apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts` returns unselected whole `Destination` records from both GET and POST, so the fields currently leak into an Android-facing JSON shape.
- **Exact active dependency:** The dependency is the whole-record serialization at `apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts:10-11` and `apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts:27-29`, not a property read.
- **Who reads it:** No TypeScript/TSX or Android/Kotlin code in the repository reads either property. The mobile endpoint serializes them incidentally. The other inspected mobile card endpoint uses an explicit destination select that excludes them.
- **Who writes it:** No current application writer was found. The fields are nullable and current destination creation paths omit them.
- **Dependency type:** **Compatibility-only** API-shape leakage and an **accidental/unused reference preventing deletion**; not active visual behavior.
- **Can it be removed after a small cleanup?** Yes. Give the mobile destinations endpoint an explicit response DTO/select that excludes the fields, verify deployed-client compatibility and stored object-key retention, then drop the columns.
- **Risk if removed:** Medium. An undocumented external client could expect the keys, and populated storage keys may require an object-retention decision even though the app does not consume them.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-13

- **Exact object:** `ActivationClaimSession.attemptCount`.
- **Exact object path:** `packages/db/prisma/schema.prisma:2109`.
- **Why deletion was skipped:** The containing activation-claim model is active and protected; the earlier cleanup conservatively treated that as a reason to retain the field.
- **Exact active dependency:** None for `attemptCount`. Active activation routes use `ActivationClaimSession` status/timestamps and use separate `ActivationAttempt` rows for rate limits and attempt history. `apps/web/src/lib/activation-session.ts:9` fetches the whole claim, but no repository code accesses `.attemptCount`.
- **Who reads it:** No current application, test, script, or Android reader was found.
- **Who writes it:** No explicit writer was found; only the database default writes `0` on claim creation.
- **Dependency type:** **Accidental/unused reference preventing deletion** inside a real current security model. The field itself is not a security requirement.
- **Can it be removed after a small cleanup?** Yes. Confirm historical values/reporting, then remove the field in a pending owner-approved migration; no runtime replacement is required.
- **Risk if removed:** Low-medium. Runtime behavior is unaffected by repository code, but historical telemetry or out-of-repository SQL may use it.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-14

- **Exact object:** `OtpChallenge.claimSessionId`, relation `OtpChallenge.claimSession`, inverse relation `ActivationClaimSession.otpChallenges`, and the `claimSessionId` index/FK.
- **Exact object path:** `packages/db/prisma/schema.prisma:2117`, `packages/db/prisma/schema.prisma:2145`, `packages/db/prisma/schema.prisma:2161`, and `packages/db/prisma/schema.prisma:2165`.
- **Why deletion was skipped:** Both endpoint models are active, and the schema contains a real FK with cascade behavior, so the cleanup conservatively preserved the association.
- **Exact active dependency:** No current runtime path joins the models through this relation. Activation routes create/read `ActivationClaimSession`; mobile, phone-change, and step-up OTP paths create/read `OtpChallenge`; every current OTP creation omits `claimSessionId`.
- **Who reads it:** No application, test, script, or Android code reads `claimSessionId`, `claimSession`, or `otpChallenges`.
- **Who writes it:** No current application writer assigns it. Existing rows could still contain historical values from an older flow.
- **Dependency type:** **Accidental/unused reference preventing deletion** and legacy compatibility between two independently active security models; the association is not a current security check.
- **Can it be removed after a small cleanup?** Yes. Audit non-null historical rows/older clients, then remove the inverse relation, relation, FK, index, and nullable field together.
- **Risk if removed:** Medium. Historical claim-to-OTP traceability and cascade cleanup would be lost, and an older deployed client/job could still populate the FK.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-17

- **Exact object:** `LinkPlatform.supportsOAuth`.
- **Exact object path:** `packages/db/prisma/schema.prisma:2353`.
- **Why deletion was skipped:** Active admin/dashboard code fetches whole `LinkPlatform` records, and the dashboard spreads each record into client-component props.
- **Exact active dependency:** `apps/web/src/app/dashboard/cards/page.tsx:14` fetches whole active platforms and uses `{...platform}` when constructing `PlatformLinkCapture` props. The component contract in `apps/web/src/components/platform-link-capture.tsx:8` does not declare or read `supportsOAuth`. `apps/web/src/app/admin/link-platforms/page.tsx:26-43` also fetches whole rows but maps an explicit view object that excludes the field.
- **Who reads it:** No explicit property reader exists. The dashboard only transports it as an undeclared extra property.
- **Who writes it:** `apps/web/src/app/catalog-actions.ts:15-60` omits it; updates preserve the old value and creates receive the database default. Its meaningful writes are historical migration seed data.
- **Dependency type:** **Compatibility-only** transport plus an **accidental/unused reference preventing deletion**. It duplicates/overlaps `oauthProvider` and the active provider configuration in `apps/web/src/lib/connected-accounts.ts`.
- **Can it be removed after a small cleanup?** Yes. Replace the whole-record spread with an explicit `PlatformLinkCapture` DTO, verify no external catalog consumer, and then remove the field.
- **Risk if removed:** Medium. An out-of-repository catalog consumer may use the flag; current in-repository OAuth behavior does not.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-18

- **Exact object:** `OAuthConnectionState.returnPath`.
- **Exact object path:** `packages/db/prisma/schema.prisma:2531`.
- **Why deletion was skipped:** `OAuthConnectionState` is a live anti-replay/security record used by the OAuth connect and callback routes, and security-sensitive cleanup was intentionally conservative.
- **Exact active dependency:** `apps/web/src/app/api/integrations/[provider]/connect/route.ts` creates the state row without `returnPath`, causing the database default to populate it. `apps/web/src/app/api/integrations/[provider]/callback/route.ts` fetches the full row but never reads `record.returnPath`; every success/failure redirect is hard-coded to `/dashboard/integrations`.
- **Who reads it:** No current repository code or Android client reads the property. The callback reads other fields on the same record.
- **Who writes it:** The database default writes `/dashboard/integrations`; no application writer sets a custom value.
- **Dependency type:** **Compatibility-only** data in a security-sensitive record. It is not currently a **security requirement**, but removal changes the persisted OAuth-state contract.
- **Can it be removed after a small cleanup?** Mechanically yes, with an explicit callback select and a column drop. Operationally, it should wait for a security/compatibility decision about whether post-OAuth return destinations will remain fixed.
- **Risk if removed:** Medium-high. Current code is unaffected, but older deployments/jobs or a planned safe-return workflow could depend on it; changing OAuth state records without coordinated review can complicate incident analysis and rollback.
- **Recommendation:** **REVIEW LATER**.

## DELETE-23

- **Exact object:** `StepUpGrant.assuranceLevel`.
- **Exact object path:** `packages/db/prisma/schema.prisma:2991`.
- **Why deletion was skipped:** `StepUpGrant` is actively created and consumed by `apps/web/src/lib/security-step-up.ts`, and the containing step-up security architecture was protected.
- **Exact active dependency:** `createGrant` in `apps/web/src/lib/security-step-up.ts` omits the field, so the database default writes `2`. `consumeStepUpGrant` fetches the whole grant but validates user, purpose, session binding, expiration, and consumption state—not assurance level.
- **Who reads it:** No current application, test, script, API response, or Android code reads it.
- **Who writes it:** Only the database default; no current caller requests another level.
- **Dependency type:** A **security-domain compatibility/future-policy field**, but not an enforced current security requirement. Its generated presence in an active model is the only current linkage.
- **Can it be removed after a small cleanup?** Mechanically yes, but not responsibly without a security-owner decision confirming that POP will not distinguish authentication assurance levels and does not require the value for audit/reporting.
- **Risk if removed:** High from a policy/evolution perspective even though immediate runtime risk is low. It removes the persisted place to distinguish stronger/weaker proofs and may conflict with external audit expectations.
- **Recommendation:** **REVIEW LATER**.

## DELETE-26

- **Exact object:** Functions/exports `shareDestinationIsCurrentlyPublished` and `activationAttemptFingerprintForTest`.
- **Exact object path:** `apps/web/src/lib/share-center.ts:464` and `apps/web/src/lib/share-center.ts:468`.
- **Why deletion was skipped:** They live in the active, protected share-security module; the cleanup retained them despite finding no callers.
- **Exact active dependency:** None. Repository-wide symbol searches find only their declarations. No static/dynamic import, registry, route, callback, test, or string lookup references either function.
- **Who reads it:** No inbound caller. `shareDestinationIsCurrentlyPublished` calls the active private helper `publishedShareDestination`; `activationAttemptFingerprintForTest` calls Node `createHash`.
- **Who writes it:** Neither function writes state; both are pure wrappers.
- **Dependency type:** **Accidental/unused reference preventing deletion**. The test-named export is an obsolete seam, and the publication wrapper is a redundant alternate entry point.
- **Can it be removed after a small cleanup?** Yes; remove the two definitions/exports only. The active share center and its security behavior remain intact.
- **Risk if removed:** Low. Only an unknown out-of-repository import could break.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-27

- **Exact object:** Domain services `createPrimaryProfile`, `setPrimaryProfile`, and `addProfileModule`.
- **Exact object path:** `apps/web/src/lib/profile-domain.ts:165`, `apps/web/src/lib/profile-domain.ts:181`, and `apps/web/src/lib/profile-domain.ts:212`.
- **Why deletion was skipped:** The functions mutate protected Profile/ProfileModule data and share a module with active profile operations, so the cleanup retained them despite zero inbound references.
- **Exact active dependency:** None for these three functions. `createAdditionalProfile` remains active through `apps/web/src/app/api/profiles/route.ts`; initial primary creation is handled by `completeInitialProfileBootstrap` in `apps/web/src/lib/profile-bootstrap.ts:135` and other current bootstrap paths; module creation is handled by the `MODULE_ADD` branch in `apps/web/src/lib/profile-editor.ts:833` through the filesystem API route `apps/web/src/app/api/profiles/[profileId]/editor/route.ts`. No current UI/API changes `Profile.isPrimary` through `setPrimaryProfile`; the visible default-card operation is the separate `setDefaultVirtualCard` action.
- **Who reads it:** No application, test, script, dynamic import, registry, or route references these exports.
- **Who writes it:** If called, they would write active Profile/ProfileModule/AuditLog rows. No current caller invokes those writes.
- **Dependency type:** **Accidental/unused reference preventing deletion** and duplicate/legacy architecture. In particular, `addProfileModule` competes conceptually with the current editor mutation, and `setPrimaryProfile` can be mistaken for the separate current default-virtual-card workflow.
- **Can it be removed after a small cleanup?** Yes. Remove only the three functions and any input type/import that becomes orphaned; retain active profile-domain functions and models.
- **Risk if removed:** Low-medium. No current path breaks, but an unpublished external import would; careful import/type cleanup is required in this shared module.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-28

- **Exact object:** Authorization service `canManageProfile`.
- **Exact object path:** `apps/web/src/lib/profile-authorization.ts:17`.
- **Why deletion was skipped:** It performs an owner/organization-role authorization check over protected profile/auth data.
- **Exact active dependency:** None. Symbol search finds only its declaration. Current profile editor authorization is enforced inside `apps/web/src/lib/profile-editor.ts` and exposed through `apps/web/src/app/api/profiles/[profileId]/editor/route.ts`; other routes use their own scoped ownership queries.
- **Who reads it:** No inbound caller, test, route, dynamic import, registry, or script.
- **Who writes it:** It is read-only and would query `Profile`/organization memberships if called.
- **Dependency type:** **Accidental/unused reference preventing deletion**, not a current security requirement. Retaining an unused authorization alternative can itself confuse future implementations about the canonical guard.
- **Can it be removed after a small cleanup?** Yes. Remove the function and its now-unneeded `OrgRole`/`prisma` imports while retaining the active public-readability helpers in the file.
- **Risk if removed:** Low current-runtime risk; medium only if an out-of-repository consumer imports this app-internal module.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-29

- **Exact object:** Authorization query helper `ownerWhere`.
- **Exact object path:** `apps/web/src/lib/permissions.ts:4`.
- **Why deletion was skipped:** It resides in an active permissions module and encodes administrator-versus-owner filtering.
- **Exact active dependency:** None. Its sibling functions `canManageTag` and `canManageDestination` are active and build their own ownership conditions; neither calls `ownerWhere`.
- **Who reads it:** No inbound caller, test, route, dynamic import, registry, or script.
- **Who writes it:** It is pure and writes nothing.
- **Dependency type:** **Accidental/unused reference preventing deletion** and a redundant authorization abstraction.
- **Can it be removed after a small cleanup?** Yes; remove only this function/export.
- **Risk if removed:** Low. Active permissions behavior is not routed through it.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-33

- **Exact object:** Legal-consent service `missingRequiredLegalDocuments`.
- **Exact object path:** `apps/web/src/lib/legal-consent.ts:121`.
- **Why deletion was skipped:** It belongs to the explicitly protected Legal subsystem and queries current required documents/consents.
- **Exact active dependency:** None for this function. `resolvedAccountLegalDocuments` and `acceptActiveRequiredLegalDocuments` are active through `apps/web/src/lib/profile-bootstrap.ts`; other active legal consent paths import `acceptLegalDocument`. Repository-wide search finds no caller of `missingRequiredLegalDocuments`.
- **Who reads it:** No inbound caller. If invoked, it would read `LegalDocument` and `UserLegalConsent` through `resolvedAccountLegalDocuments` and a consent query.
- **Who writes it:** It writes nothing.
- **Dependency type:** **Accidental/unused reference preventing deletion** inside real current legal functionality. Removing this unused wrapper does not remove or weaken the active legal workflow.
- **Can it be removed after a small cleanup?** Yes; remove only the unused function/export, preserving all active legal services, policy, records, and routes.
- **Risk if removed:** Low current-runtime risk; medium compliance caution only for an unknown out-of-repository import.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-44

- **Exact object:** Server action `updateProfileTheme`.
- **Exact object path:** `apps/web/src/app/actions.ts:90`.
- **Why deletion was skipped:** It mutates protected profile presentation data and revalidates public-profile routes.
- **Exact active dependency:** None. The active dashboard profile page imports `updateProfile`, not `updateProfileTheme`; `updateProfile` validates and writes `theme` at `apps/web/src/app/actions.ts:61-74`. The active mobile profile PATCH also validates/writes the theme at `apps/web/src/app/api/mobile/profiles/[id]/route.ts:43-83`. Template selection is separately handled by current template actions/editor mutations.
- **Who reads it:** No form, component, route, static/dynamic import, callback, test, or registry references the action.
- **Who writes it:** No current caller. If invoked, it would duplicate a subset of the active `updateProfile` write.
- **Dependency type:** **Compatibility-only/legacy duplicate** and an **accidental/unused reference preventing deletion**.
- **Can it be removed after a small cleanup?** Yes; delete only this server action. Keep `updateProfile`, mobile profile PATCH, and template selection intact.
- **Risk if removed:** Low. The active theme controls already submit through another action/API.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-45

- **Exact object:** Server action `toggleDestinationVisibility`.
- **Exact object path:** `apps/web/src/app/actions.ts:162`.
- **Why deletion was skipped:** It changes protected profile visibility and revalidates canonical public/tag routes.
- **Exact active dependency:** None for the action. Current profile-home link editing sends `LINK_UPSERT` with a visibility value from `apps/web/src/components/profile-home-editor.tsx:328`; the active editor mutation writes `Destination.isVisible` in `apps/web/src/lib/profile-editor.ts:627-650` through `apps/web/src/app/api/profiles/[profileId]/editor/route.ts`. The older active cards form also uses `updateDestination`, which writes `isVisible` directly.
- **Who reads it:** No form, component, route, static/dynamic import, callback, test, or registry references `toggleDestinationVisibility`.
- **Who writes it:** No current caller. Its dormant body would toggle `Destination.isVisible` and revalidate routes.
- **Dependency type:** **Compatibility-only/legacy duplicate** and an **accidental/unused reference preventing deletion**.
- **Can it be removed after a small cleanup?** Yes; remove this function only. The current visibility mutation paths remain.
- **Risk if removed:** Low current-runtime risk. An old browser tab cannot reliably preserve a Next server-action identifier across deployments in any case; no source-level caller remains.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## DELETE-46

- **Exact object:** Server action `moveDestination`.
- **Exact object path:** `apps/web/src/app/actions.ts:168`.
- **Why deletion was skipped:** It mutates ordering for active destinations and revalidates the public profile, so the earlier cleanup retained it under profile-visibility protection.
- **Exact active dependency:** None. No form/component/API imports or invokes `moveDestination`. `apps/web/src/lib/profile-editor.ts:660` contains a newer exact-list `LINK_REORDER` mutation branch, but repository UI search finds no current sender for `LINK_REORDER`; that separate dormant capability is not an inbound reference to this action.
- **Who reads it:** No static/dynamic import, filesystem route, component, callback, test, registry, or script.
- **Who writes it:** No current caller. If invoked, it would swap two `Destination.sortOrder` values.
- **Dependency type:** **Compatibility-only/legacy duplicate** and an **accidental/unused reference preventing deletion**. The coexistence of the unused pairwise action and the currently unsurfaced exact-list editor branch is itself architectural ambiguity.
- **Can it be removed after a small cleanup?** Yes; remove the old server action. Separately decide whether to expose or remove the uncalled `LINK_REORDER` editor capability; that adjacent decision is outside these 15 DELETE IDs.
- **Risk if removed:** Low current-runtime risk; it removes only dormant reorder behavior. There is currently no visible link-order control using it.
- **Recommendation:** **CLEAN DEPENDENCY THEN DELETE**.

## Duplicate/legacy architecture still capable of confusing future Codex work

- `Supplier` looks like a current purchasing/supplier subsystem because active models and pages expose it, but there is no management or assignment write path. It should be explicitly designated as retained historical metadata or deliberately retired.
- `createPrimaryProfile`, `setPrimaryProfile`, and `addProfileModule` present alternative profile-domain mutations alongside the current bootstrap, editor API, and virtual-card-default workflows.
- `updateProfileTheme` and `toggleDestinationVisibility` duplicate subsets of active broader mutations. `moveDestination` competes conceptually with an uncalled newer `LINK_REORDER` branch.
- `supportsOAuth` duplicates capability concepts already represented by `oauthProvider`/provider configuration while being transported but not read.
- `attemptCount`, `claimSessionId`, `returnPath`, and `assuranceLevel` make current security records appear to enforce behavior that the current implementation does not actually consult. The latter two still deserve owner/security decisions before schema removal.

## Can be deleted after small dependency cleanup

- `DELETE-11` — make the mobile destination API response explicit, verify compatibility/storage values, then remove the two columns.
- `DELETE-13` — audit historical values/reporting, then remove `ActivationClaimSession.attemptCount`.
- `DELETE-14` — audit historical non-null relations/older clients, then remove the relation, FK, index, and field together.
- `DELETE-17` — replace the dashboard whole-record spread with an explicit platform DTO, then remove `supportsOAuth`.
- `DELETE-26` — remove the two unused share-center wrappers/exports.
- `DELETE-27` — remove the three unused profile-domain services and newly orphaned local type/imports only.
- `DELETE-28` — remove the unused authorization function and orphaned imports only.
- `DELETE-29` — remove the unused ownership-predicate helper only.
- `DELETE-33` — remove the unused legal read helper only; retain the current Legal subsystem.
- `DELETE-44` — remove the duplicate theme server action; retain current profile/mobile writers.
- `DELETE-45` — remove the duplicate visibility server action; retain current editor/action writers.
- `DELETE-46` — remove the unused pairwise reorder server action; review the separate dormant `LINK_REORDER` capability later.

## Must remain

None of the 15 individual candidates is proven to be an unavoidable framework, Android, security-enforcement, or current write-path requirement. This does not authorize deleting the three owner-decision items below.

## Needs owner decision

- `DELETE-08` — decide whether displayed historical supplier provenance is part of the intended inventory product. It is genuinely read by current UI, but the supplier architecture has no current writer or management path.
- `DELETE-18` — decide whether OAuth callback destinations will remain fixed and whether the persisted return path has compatibility/audit value.
- `DELETE-23` — obtain security-owner confirmation that assurance levels are not part of current/future step-up policy or audit requirements.
