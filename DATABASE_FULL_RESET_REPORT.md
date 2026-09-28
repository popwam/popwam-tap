# Database Full Reset Report

Reset date: 2026-09-16 (Europe/Chisinau)

## 1. Target database

- Host: `ep-muddy-poetry-atc4qupm-pooler.c-9.us-east-1.aws.neon.tech`
- Database: `neondb`
- Schema: `public`
- Environment: production
- Repository configuration: `packages/db/prisma.config.ts` loads the repository root `.env` and uses `DIRECT_DATABASE_URL`; the configured `DATABASE_URL` and `DIRECT_DATABASE_URL` identify the same host, database, and schema.
- Live identity check before reset: `current_database() = neondb`, `current_schema() = public`.
- Safety conclusion: this is the POP by POPWAM PostgreSQL database configured by this repository. No credentials are included in this report.

## 2. Reset operation

- Mechanism: `pnpm --filter @popwam/db prisma migrate reset --force --skip-seed`
- Result: successful.
- Prisma reset the configured `public` application schema and reapplied the repository migration chain from the beginning.
- `--skip-seed` was intentional: the default `packages/db/prisma/seed.ts` creates admin/demo users, organizations, profiles, destinations, and tags, which are outside the approved reference-data-only baseline.
- No other PostgreSQL database, Firebase resource, Git data, or Android/visual asset was targeted.

## 3. Migrations

All 34 repository migrations were applied successfully in order:

1. `20260713150000_init`
2. `20260713190000_platform_upgrade`
3. `20260713210000_profile_usability`
4. `20260713230000_business_architecture`
5. `20260714010000_activation_profiles_pwa`
6. `20260714030000_android_mobile_security`
7. `20260714040000_activation_hash_unique`
8. `20260714050000_production_hardening_indexes`
9. `20260714120000_smsmisr_otp_observability`
10. `20260714180000_super_admin_role`
11. `20260714200000_inventory_ledger_core`
12. `20260714210000_production_batches`
13. `20260714220000_virtual_cards_wallet_transfers`
14. `20260715180000_product_workflows`
15. `20260718120000_pop_product_content_social`
16. `20260721190000_global_identity_integrations`
17. `20260723153000_firebase_external_identity_foundation`
18. `20260725003000_profile_phase_b_foundation`
19. `20260725143000_mobile_passkey_challenge_purpose`
20. `20260725200000_dynamic_onboarding_engine`
21. `20260725233000_profile_publishing_foundation`
22. `20260726003000_share_activation_scratch_security`
23. `20260726040000_security_settings_step_up`
24. `20260726120000_friends_privacy_abuse_foundation`
25. `20260726210000_nearby_privacy_presence_foundation`
26. `20260726233000_priority_runtime_foundation`
27. `20260727090000_platform_configuration_admin`
28. `20260803120000_mobile_auth_contract_v2`
29. `20260809133000_profile_category_default_templates`
30. `20260809190000_profile_data_trust_foundation`
31. `20260812130000_admin_notification_campaigns`
32. `20260908190000_plan_storefront_entitlements`
33. `20260911190000_retire_firebase_phone_subject`
34. `20260915120000_remove_unused_architecture`

Final `prisma migrate status`: **Database schema is up to date**. The live `_prisma_migrations` table contains 34 completed migrations, the final cleanup migration is complete, and no migration is pending.

## 4. Final schema

- Live PostgreSQL base tables in `public`: **120**, including Prisma's `_prisma_migrations` table.
- Current Prisma models: **119**.
- Confirmed absent from the live database: `Follow`, `ProductMedia`, `PlatformSuggestion`, `Purchase`, `PurchaseItem`, `Expense`, `ExpenseCategory`, and `Supplier`.
- Confirmed absent from the live database: all 24 cleanup-target columns checked across `User`, `Friendship`, `Destination`, `CardBatch`, `InventoryItem`, `ActivationClaimSession`, `OtpChallenge`, `VirtualCard`, `LinkPlatform`, `OAuthConnectionState`, `Product`, `ProductVariant`, `ProductInventory`, `ProductPrice`, and `StepUpGrant`.
- `artifacts/neon-schema.sql` was not used as authority or used to restore data. It is stale relative to the current Prisma schema and migration chain.

## 5. Seed/bootstrap

Executed explicitly:

- `ALLOW_PRODUCTION_ONBOARDING_SEED=true pnpm --filter @popwam/db seed:onboarding`
  - Recreated 7 published onboarding definitions.
  - Final onboarding reference counts: 29 steps, 60 questions, 16 options, and 3 conditions.

Recreated by the authoritative migration chain:

- `Plan`: 4 rows.
- `LinkPlatform`: 33 rows.
- `ProfileCategory`: 10 rows.
- `ProfileModuleDefinition`: 10 rows.
- `ProfileTemplate`: 6 rows.

No generic user/demo seed was executed. No repair or legacy backfill script was executed.

Fresh-install configuration still required:

- `PhoneCountryConfig`: 0 rows. Current OTP code requires an enabled country, so phone OTP is intentionally unavailable until an authenticated administrator configures/enables countries through the current `/admin/countries` workflow. The repository has an authoritative country catalog in application code but no standalone fresh-install seed/bootstrap script; no country records were invented or copied.
- `LegalDocument`: 0 rows. No repository legal-document bootstrap seed exists; legal content must be published through the current admin workflow.
- `SystemSetting`: 0 rows and `BrandSettings`: 0 rows. Their current code paths supply defaults or expect administrator configuration; no standalone canonical seed exists.
- `ProfileTemplateModule`: 0 rows after the authoritative migration chain. No separate repository seed was found or invented.

The only non-empty application tables after reset are the reference/catalog tables listed above and the onboarding tables. All user/auth/profile/social/inventory/order/history tables are empty.

## 6. Data intentionally lost

All previous POP PostgreSQL application data was permanently removed under explicit owner approval. This includes users, profiles, sessions, organizations, social relationships, Nearby state, device/auth state, cards, inventory records, orders, notifications, historical activation records, OAuth state, user-generated content, and all records belonging to the retired purchase/expense/supplier architecture.

No legacy-row count or backup was created, as explicitly requested.

## 7. Firebase state

Firebase was untouched. No Firebase Auth users or Firebase resources were deleted, reset, queried for restoration, or recreated.

Existing Firebase users may no longer have corresponding POP PostgreSQL `User` records. The reset intentionally did not recreate those POP records from Firebase.

## 8. Verification

- `prisma format`: passed.
- `prisma validate`: passed; schema is valid.
- `prisma generate`: passed with Prisma Client 6.19.1.
- `prisma migrate status`: passed; 34 migrations found and database schema is up to date.
- Live schema query: passed; target remained `neondb/public`, all migrations finished, final cleanup migration present, legacy tables absent, and checked legacy columns absent.
- TypeScript checks: `pnpm lint` passed in all 5 packages (`@popwam/auth`, `@popwam/db`, `@popwam/shared`, `@popwam/storage`, `@popwam/web`).
- Production build: `pnpm build` passed; Next.js 15.5.20 compiled and generated 182 routes.
- Built-server startup: passed on local port 3107; server became ready.
- `GET /health`: 200 with `ok: true`.
- `GET /api/mobile`: 200 with `ok: true`.
- `GET /api/platform/bootstrap`: 200 with `ok: true`; returned zero phone countries, matching the unconfigured fresh-install state described above.
- `GET /api/profile-categories?profileKind=PERSONAL`: 200 with `ok: true` and 4 active categories.
- The root `pnpm validate:production-env` check did not pass in this local shell because deployment-only variables are not injected into the process environment. It reported missing database URLs, production secrets, canonical URLs/hosts, and reviewed Android passkey origins. The Next.js production build and direct built-server smoke checks passed using the application's local environment loading. This is a deployment-environment configuration check, not a database schema failure.

## 9. Visual files

No Android/visual files were modified by the database reset.

The Android/visual modifications and untracked assets visible in the worktree pre-existed this reset and were intentionally left untouched.

## 10. Git status

No files were staged or committed. The reset itself changes remote database state; the only new source-tree artifact created by this operation is this report. Existing cleanup and Android/visual worktree changes were preserved.

Final `git status --short`:

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
?? DATABASE_FULL_RESET_REPORT.md
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
