# 1. Executive Summary

Phase B is implemented locally as an additive foundation for canonical profiles, profile modules, visibility, entitlements, and versioned legal consent. Existing profile, card, virtual-card, Firebase, and Meta workflows remain compatible. No deployment, migration application, staging, commit, push, or external-console action was performed.

# 2. Files Changed

Phase B adds the profile domain, authorization, projection, configuration validation, backfill-analysis helpers, dry-run scripts, and focused tests under `apps/web/src/lib` and `packages/db/prisma`. It updates only the Prisma schema, DB package scripts, public-profile projection consumers, and the template preview projection. The migration is `packages/db/prisma/migrations/20260725003000_profile_phase_b_foundation/migration.sql`.

# 3. Prisma Schema Changes

Added enums for profile kind, lifecycle, module visibility, entitlement source/status, legal-document type, and consent source. Added `ProfileCategory`, `ProfileModuleDefinition`, `ProfileModule`, `ProfileTemplateModule`, `ProfileEntitlement`, `LegalDocument`, and `UserLegalConsent`; extended `Profile`, `ProfileTemplate`, and `User` additively.

# 4. Profile Canonical Model

`Profile` remains the canonical identity object. Additive fields support `PERSONAL`/`BUSINESS`, `DRAFT`/`PUBLISHED`/`PAUSED`/`ARCHIVED`, optional category/template links, `isPrimary`, timestamps, and an idempotency `creationKey`. Legacy display, contact, service, branch, and visibility fields are preserved.

# 5. Primary Profile Invariant

The domain service serializes primary-profile changes and the migration adds a partial unique index for one active primary profile per user. Existing records are not altered automatically; ambiguous historical cases are explicitly reported for manual review.

# 6. Profile Categories

`ProfileCategory` is a separate localized category model with personal/business scope, active ordering, and an optional default template. The migration seeds controlled personal and business category records with English and Arabic labels.

# 7. Profile Templates

`ProfileTemplate` keeps its legacy category/configuration fields and gains optional category and profile-kind references. Template validation prevents incompatible personal/business pairings for canonical profiles.

# 8. Profile Module Definitions

`ProfileModuleDefinition` centralizes a controlled module registry, capability flags, schema versioning, and localized labels. The additive seed includes identity, about, contact, social, links, gallery, services, portfolio, branches, and catalog.

# 9. Profile Module Instances

`ProfileModule` attaches enabled, ordered, visibility-controlled module instances to profiles. Its `(profileId, moduleDefinitionId, instanceKey)` uniqueness allows configured multi-instance modules without uncontrolled duplication.

# 10. Template Module Rules

`ProfileTemplateModule` provides additive template defaults, required-module flags, ordering, and safe JSON configuration. Default initialization is idempotent and respects these rules.

# 11. Visibility Foundation

Canonical modules support `PUBLIC`, `FRIENDS`, `ONLY_ME`, and `UNLISTED`. The public projection returns only enabled public modules. Until a module has canonical instances, existing legacy `show*` and `isPublic` behavior is retained for compatibility.

# 12. Profile Entitlements

`ProfileEntitlement` records auditable profile-scoped or user-scoped grants from plans, products, purchases, admin actions, promotions, or legacy sources. Quota validation combines existing plan/override limits with active `profileLimitIncrement` grants.

# 13. Legal Documents

`LegalDocument` stores a version, locale, content hash, effective date, required flag, and active state. It intentionally stores no user consent state and adds no legal text without a separately approved policy source.

# 14. User Legal Consents

`UserLegalConsent` is unique by user, document, version, and locale, records source and acceptance time, and is created only for the authenticated user in the consent service. Duplicate acceptance is idempotent and auditable.

# 15. Profile Domain Services

`profile-domain.ts` provides `createPrimaryProfile`, `createAdditionalProfile`, `setPrimaryProfile`, `validateProfileQuota`, `validateProfileTemplate`, and `initializeDefaultModules`, plus archive and controlled module-add helpers. New profile creation does not create a physical card or virtual card.

# 16. Authorization Rules

Profile management is restricted to the profile owner or an organization owner/admin. Public profile reads require `PUBLISHED` for canonical profiles, with the documented legacy `isPublic` fallback. Public modules must be enabled and `PUBLIC`.

# 17. Legacy VirtualCard Compatibility

`VirtualCard` remains a compatibility and presentation artifact with its existing unique profile relationship and template relation. Existing activation, destination, wallet, and sharing paths were not rewritten.

# 18. Physical Card Compatibility

`Card` and its physical-card lifecycle remain unchanged. Phase B does not create cards, modify assignments, alter activation, or change inventory/product workflows.

# 19. Public Profile Projection

The public slug, ID, tag, and template-preview consumers use a centralized projection. It excludes `User.email` and all friend/private/unlisted module data, while preserving legacy public rendering where canonical module records are absent.

# 20. Module Configuration Validation

Module configuration is allowlisted by module key, accepts only bounded primitive values, rejects unknown/nested/unsafe content, and caps serialized data. It is stored as JSON only after validation.

# 21. Localization

The controlled category and module-definition seeds contain English and Arabic labels. Existing web and Android localization files were not changed; the repository i18n audit remains clean.

# 22. Backfill Dry-Run Tooling

`pnpm --filter @popwam/db backfill:profile-modules:dry-run` is read-only and reports aggregate/mapped/missing/ambiguous counts. It has no write mode and deliberately does not expose profile values.

# 23. Primary Profile Candidate Report

`pnpm --filter @popwam/db backfill:primary-profile:dry-run` is read-only and classifies candidates from explicit primary state, default virtual-card evidence, sharing-reference evidence, singleton profiles, or uniquely oldest profiles. Conflicting evidence is `AMBIGUOUS` and is never selected automatically.

# 24. Migration

`MIGRATION FILE CREATED: YES`  
`MIGRATION APPLIED: NO`

The migration is additive: it creates enums/tables/indexes/foreign keys, adds nullable or defaulted columns, and seeds controlled definitions. It contains no drops, renames, destructive data changes, or automatic profile backfill.

# 25. Automated Tests

`pnpm --filter ./apps/web test` passed: 37 files and 173 tests. New coverage exercises primary/profile quota policy, category/template compatibility, module defaults/rules/config validation, visibility projection, consent decisions, and dry-run candidate classification.

# 26. Build Results

Passed locally: `pnpm db:generate`, `pnpm --filter @popwam/db lint`, `pnpm --filter ./apps/web lint`, `pnpm i18n:audit`, `pnpm --filter ./apps/web test`, and `pnpm --filter ./apps/web build`. Android compilation was not required because Phase B changes no shared mobile API contract or Android source.

# 27. Meta Regression

No Phase B change touches Meta OAuth, Instagram, WhatsApp, pages, permissions, scopes, webhooks, or publishing code. The Phase B-focused Meta diff review found no Meta change.

# 28. Firebase Regression

Firebase source and configuration are unchanged by Phase B. No Firebase console work, Firestore/Realtime Database rule change, App Check change, emulator use, or Firebase package change occurred.

# 29. Git Working Tree

The worktree was already dirty before Phase B, including Firebase-related user work. Those changes were preserved. No files were staged, committed, pushed, reset, or discarded.

# 30. Remaining Risks

The migration and seed data have not been exercised against a non-production database. Existing profiles still need an evidence-reviewed primary selection, and existing legal routes still require approved, versioned document records before consent can be enforced in onboarding.

# 31. Manual Actions Required

Review and apply the migration through the approved database process; create approved legal-document versions and hashes; run both dry-run reports against a non-production database; manually resolve ambiguous primary candidates; then wire the domain services into the future onboarding/profile-management UX.

# 32. Phase B Exit Criteria

Passed for the local code foundation: canonical profile schema, invariant enforcement, module/visibility projection, entitlements, legal-consent foundation, compatibility boundaries, dry-run tooling, tests, lint, i18n audit, and production build. Operational migration/backfill execution remains intentionally manual and unperformed.

# 33. Recommended Phase C

Build the phone-first account/onboarding flow on these services: create or select a primary profile, choose category/template, accept current required legal documents, initialize default modules, then add passkey enrollment and profile-management UI. Recommended model/reasoning: GPT-5.6 with High reasoning.
