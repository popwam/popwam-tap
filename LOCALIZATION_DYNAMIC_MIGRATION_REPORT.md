# Localization Dynamic Migration Report

## Summary

The Android application now obtains the selectable language list, language metadata, and downloaded translation packs from the existing database-backed localization system. Android renders immediately from its built-in English baseline, restores cached packs synchronously, and refreshes metadata and the selected pack in the background.

The database authority remains `SystemSetting.key = "localization.runtime"`. No Prisma schema or migration was added for this localization work.

The required pre-deletion assessment is in `LOCALIZATION_MIGRATION_REPORT.md`.

## Language files removed

The following obsolete fixed-locale resources were removed only after the base-English coverage audit reported zero missing resources:

- `apps/android/app/src/main/res/values-ar/pass6.xml`
- `apps/android/app/src/main/res/values-ar/pass7.xml`
- `apps/android/app/src/main/res/values-ar/strings.xml`
- `apps/android/app/src/main/res/values-ar/whatsapp_auth.xml`
- `apps/android/app/src/main/res/values-fr/pass6.xml`
- `apps/android/app/src/main/res/values-fr/pass7.xml`
- `apps/android/app/src/main/res/values-fr/strings.xml`
- `apps/android/app/src/main/res/values-fr/whatsapp_auth.xml`
- `apps/mobile/onboarding/src/commonMain/composeResources/values-ar/strings.xml`
- `apps/mobile/onboarding/src/commonMain/composeResources/values-fr/strings.xml`
- `apps/android/app/src/main/res/xml/locales_config.xml`

The manifest's fixed `android:localeConfig` reference was removed. No drawable, font, theme, color, dimension, icon, PNG, SVG/vector, or Figma asset was removed.

## English baseline retained

The complete Android base `res/values` resource set remains, including:

- `strings.xml`
- `whatsapp_auth.xml`
- `pass6.xml`
- `pass7.xml`
- `pop_menu_figma.xml`
- `pop_share_figma.xml`
- `pop_back_behavior.xml`
- `pop_appearance_typography.xml`

The shared onboarding module retains `composeResources/values/strings.xml` for its English preview/test and non-Android fallback.

Coverage audit:

- Android string IDs referenced from all Kotlin source sets: 811
- Referenced IDs with a base-English resource: 811
- Missing base-English fallbacks: 0

## Translation keys migrated

Android resource IDs now provide stable remote keys without deriving keys from displayed text:

`R.string.settings_language_help` -> `android.settings.language.help`

All main Android Compose UI resource calls were routed through `popStringResource`; non-Compose biometric/toast-style lookups use `DynamicLocalizationRuntime.resolve`.

Final reference scan:

- `popStringResource` calls: 711 across 22 Android UI files
- remaining main-source `stringResource(...)` calls: 0
- remaining direct `getString(R.string...)` UI calls: 0
- fixed Android `en/ar/fr` selectable-language list: none
- hardcoded non-Compose prompt title/subtitle/cancel strings: none

The translation editor can accept the resulting `android.*` keys. Missing remote keys continue to use the matching base resource independently.

## Database and API used

Existing authority:

- `SystemSetting.localization.runtime`
- `apps/web/src/lib/localization-policy.ts`
- `apps/web/src/lib/localization-runtime.ts`
- `apps/web/src/app/localization-actions.ts`
- `apps/web/src/app/admin/translations/page.tsx`

Public contract:

- `GET /api/localization/bootstrap` returns enabled/published language metadata: code, name, native name, direction, and revision.
- `GET /api/localization/[code]` returns one enabled/published language pack: code, revision, and key/value translations.
- Full packs are no longer embedded in the language-list response.
- The existing global `translationVersion` is used as the pack revision.

The admin translation UI now iterates the configured locale set. It no longer constructs Arabic/English/French as a permanent supported-language set or forces English enabled/published. English remains an internal failsafe even when it is not owner-enabled as a selectable language.

Android Settings now persists arbitrary owner-enabled locale codes through the existing `User.locale` string field. The legacy `UserLanguagePreference` enum is retained for compatibility with the current web settings UI, but it no longer limits Android locale persistence. No Prisma change was needed.

## Cache mechanism

`LocalizationAuthorityStore` persists a versioned JSON snapshot in app-private `SharedPreferences` under `pop_localization_authority/bootstrap_v2`.

The snapshot stores:

- default locale
- global translation version
- current selectable locale metadata
- historical cached locale metadata
- cached packs by locale code
- each pack's revision
- each pack's translations
- pack and snapshot update timestamps

The cache is installed synchronously during `Application.onCreate`. Network refresh runs from a Compose `LaunchedEffect` after content startup. A selected pack is downloaded only when absent or older than its metadata revision; screens do not redownload packs.

When an owner disables a language, it disappears from the selectable list while historical metadata and its cached pack are preserved.

## Fallback mechanism

Per key, resolution is:

1. selected-language cached/current pack value
2. built-in English Android resource
3. stable key string only if the base resource itself cannot be read

A blank/missing remote value falls back only for that key. A malformed remote format string is caught and falls back only for that key.

Bootstrap and pack failures are handled with `runCatching` and do not replace a valid cache, reset the saved language preference, crash the UI, add a network gate, or block startup. A never-downloaded selected language renders English until its pack becomes available.

## RTL/LTR handling

Direction comes from the database locale's `rtl` metadata and retained cached metadata. `PopLocalizationProvider` supplies root Compose direction, and the authentication layout's former Arabic-only direction check now uses the same metadata.

No hardcoded RTL language-code set remains. Existing intentional LTR islands for phone numbers, URLs, email, OTP codes, and serial numbers remain unchanged.

Language metadata and font selection remain separate. The localization migration did not change the current typography implementation.

## Startup and offline cases

1. Fresh install + online: built-in English is renderable immediately; metadata refresh is asynchronous; choosing an owner-enabled language downloads and persists its pack.
2. Cached selected language + offline: cached metadata and pack are installed before composition.
3. Never-downloaded selected language + offline: the saved preference remains and every missing value renders from English.
4. Pack missing one key: only that key resolves to English.
5. localization API error: refresh returns without mutating usable cached/runtime state.
6. owner disables language: it is removed from selection; cached data and preference are retained, with cached/English safe rendering.

A dedicated `DynamicLocalizationPolicyTest` covers cached remote resolution, never-downloaded English fallback, per-key fallback, malformed formatting, and disabled-but-cached behavior. The test now executes after the Android compile blockers were resolved; its current result is recorded under Verification.

No Android device or emulator was connected (`adb devices` was empty), so a physical network-disabled run was not possible in this workspace. Offline behavior was verified by cache/fallback implementation inspection, resource coverage, and test policy source; it is not represented as a completed device test.

## Files modified by this migration

Backend/API/admin:

- `apps/web/src/lib/localization-policy.ts`
- `apps/web/src/lib/localization-policy.test.ts`
- `apps/web/src/app/localization-actions.ts`
- `apps/web/src/app/admin/translations/page.tsx`
- `apps/web/src/app/api/localization/[code]/route.ts`
- `apps/web/src/lib/settings-policy.ts`
- `apps/web/src/lib/settings-policy.test.ts`
- `apps/web/src/app/api/settings/preferences/route.ts`

Android runtime/API/startup:

- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/localization/DynamicLocalization.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/localization/LocalizationAuthorityStore.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/LocalePolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchExperience.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt`
- `apps/android/app/src/main/res/values/strings.xml`

Android UI call-site substitutions (resource resolver only):

- `FigmaNavigation.kt`
- `FriendsScreen.kt`
- `MenuScreens.kt`
- `NearbyScreen.kt`
- `PopVisuals.kt`
- `QrScanner.kt`
- `VirtualCardDetails.kt`
- `auth/AuthStepLayout.kt`
- `auth/BiometricSetupCard.kt`
- `auth/BiometricUnlockScreen.kt`
- `auth/LoginOnboardingScreen.kt`
- `auth/PhoneLoginScreen.kt`
- `components/CompactTemplateCard.kt`
- `home/HomeScreen.kt`
- `profile/DraftTemplatePreview.kt`
- `profile/ProfileScreens.kt`
- `profile/TemplateStorefrontEditors.kt`
- `share/ShareScreens.kt`

Non-Compose prompts:

- `apps/android/app/src/main/java/com/popwam/pop/data/auth/AndroidDeviceBindingProvider.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/BiometricCoordinator.kt`

Shared onboarding and compile adapters:

- `apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/LanguageScreen.kt`
- `apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/ThemeScreen.kt`
- `apps/android/app/src/debug/java/com/popwam/pop/review/DesignReviewActivity.kt`
- `apps/android/app/src/androidTest/java/com/popwam/pop/ui/launch/Phase3ScreenshotTest.kt`

Tests/contracts:

- `apps/android/app/src/test/java/com/popwam/pop/data/localization/DynamicLocalizationPolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/FirstLaunchAndroidContractTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/data/auth/SessionRepositoryPasskeyTest.kt`

Reports:

- `LOCALIZATION_MIGRATION_REPORT.md`
- `LOCALIZATION_DYNAMIC_MIGRATION_REPORT.md`

## Visual/UI protection report

No image, vector, icon, spacing, color, card, navigation, theme, typography, Home, Profile, Share, Menu, Bottom Navigation, or Splash visual implementation was intentionally changed by this migration.

UI source edits were limited to translation resolver substitutions, dynamic language/copy inputs, root layout direction, and the zero-language safety constraint. Existing sizing, offsets, typography, modifiers, colors, assets, and navigation remain in place.

Protected modified/untracked visual assets already present in the dirty worktree were not deleted, rewritten, or normalized by this task.

No intentional visual design changes were made by the localization migration.

### Android compile blocker resolution

| Symbol | Reference and classification | Action taken | Reason and visual effect |
| --- | --- | --- | --- |
| `MenuReviewScreen` | Referenced only by `apps/android/app/src/debug/java/com/popwam/pop/review/DesignReviewActivity.kt`; stale debug/review-only reference (A). | Removed its import, review destination, and review branches. | The review wrapper had been removed and had no production or test caller. No production UI or visual behavior changed. |
| `MenuSettingsReviewScreen` | Referenced only by `DesignReviewActivity.kt`; stale debug/review-only reference (A). | Removed its import and the obsolete account/security/devices/language/appearance/privacy review destinations. | Recreating the removed wrapper would restore obsolete review scaffolding. Current production settings screens and navigation were not changed. |
| `PopBottomNavigationReviewScreen` | Referenced only by `DesignReviewActivity.kt`; stale debug/review-only reference (A). | Removed its import and wrapper-dependent root/focused review branches; the retained Home-loading and personal-profile previews render their current components directly. | The wrapper was not production navigation. `PopPrimaryNavigationBar` and all production bottom-navigation behavior remain untouched. |
| `ShareReviewScreen` | Referenced only by `DesignReviewActivity.kt`; stale debug/review-only reference (A). | Removed its import, obsolete share review destinations, branches, and now-unused review fixture. | Current production `ShareCenterScreen` and Share navigation were not changed. No production Share visual behavior changed. |
| `LegacyPhysicalCardDetails` | Referenced by the active production `card/{id}` route in `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt`; renamed/replaced current implementation (D), not dead route scaffolding. | Renamed the existing unchanged private `CardDetailScreen` implementation to internal `PhysicalCardDetailsScreen` and pointed the existing route to it. | The production route is retained. The composable body, route, callbacks, dimensions, styling, and navigation behavior were not changed. No legacy UI was recreated. |

No intentional visual design changes were made while resolving Android compile blockers.

## Remaining hardcoded UI translations

No directly displayed Android production prompt or Compose resource copy was found bypassing the dynamic resolver.

Intentionally retained:

- built-in English XML resources, required as the complete offline baseline;
- shared onboarding base-English resources used when an Android dynamic copy object is not supplied (previews/tests and other targets);
- brand/clipboard labels such as `POP`/`POPWAM`, which are not displayed translated copy;
- server/user content and technical values such as card status/type, profile content, URLs, country names, and enum identifiers. These are domain/content localization concerns, not static application UI strings.

Known compatibility-only architecture still present outside the Android dynamic path:

- the web settings component and `UserLanguagePreference` enum still expose legacy `SYSTEM/ENGLISH/ARABIC` preferences;
- older profile/template domain models still contain bilingual content fields such as `nameAr/nameEn` and `bioAr/bioEn`.

These do not determine Android's supported-language list or translation pack resolution, but should be migrated separately if owner-managed localization is later extended to web settings and user-authored/catalog content.

## Verification results

Passed:

- Backend localization/settings tests: 8/8
  - `localization-policy.test.ts`
  - `translation-editor.test.ts`
  - `settings-policy.test.ts`
- Backend TypeScript: `pnpm --filter @popwam/web lint`
- Production web build: `pnpm --filter @popwam/web build`
- Shared onboarding compile and Android unit tests: `:mobile:onboarding:testDebugUnitTest`
- Android debug Kotlin compilation: `:app:compileDebugKotlin` (`BUILD SUCCESSFUL`)
- Android resource merge/manifest/resource processing through `:app:processDebugResources`
- Base-English coverage: 811/811 referenced IDs
- No fixed Android language-list/resource-config reference
- No `values-ar` or `values-fr` resource files and no `locales_config.xml`
- All five formerly unresolved symbol names have zero remaining Kotlin references
- No main Android direct `stringResource` or `getString(R.string...)` UI bypass
- `git diff --check`: no whitespace errors (line-ending conversion warnings only)

Relevant Android unit-test results:

- `FirstLaunchAndroidContractTest`: 9/9 passed.
- `DynamicLocalizationPolicyTest`: 4/5 passed. `invalid remote formatting falls back per key` expects the ASCII digit `3`, while locale-aware Arabic formatting returns `٣`; this assertion is unrelated to the five compile blockers and was not changed.
- `LocalFirstStartupPolicyTest`: 4/5 passed. `official loader loops and launch has no fixed delay` expects the source token `while (isActive)` in `PopBrandedLoading.kt`; this unrelated loader contract was not changed.
- Combined isolated relevant run: 17/19 passed. The command exits non-zero because of the two assertions above.

The normal unfiltered `:app:testDebugUnitTest` task still cannot compile every existing test source because unrelated profile tests reference removed/changed profile APIs (including the former `theme` parameter and `Appearance` symbol). A temporary local Gradle test-source filter was used only to execute the three relevant suites and was deleted afterward; no build or test configuration file was retained.

The two failed assertions and the unrelated profile-test compilation errors were not repaired because this task authorized only the five Android compile blockers and explicitly prohibited localization architecture or visual changes.

Not run:

- physical/emulator network-disabled test, because no ADB device was connected.

## Git status --short

```text
 M apps/android/app/src/androidTest/java/com/popwam/pop/ui/launch/Phase3ScreenshotTest.kt
 M apps/android/app/src/debug/java/com/popwam/pop/review/DesignReviewActivity.kt
 M apps/android/app/src/main/AndroidManifest.xml
 M apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt
 M apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt
 M apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt
 M apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt
 M apps/android/app/src/main/java/com/popwam/pop/data/auth/AndroidDeviceBindingProvider.kt
 M apps/android/app/src/main/java/com/popwam/pop/data/auth/BiometricCoordinator.kt
 M apps/android/app/src/main/java/com/popwam/pop/data/localization/LocalizationAuthorityStore.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/FriendsScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/LocalePolicy.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/NearbyScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/PopVisuals.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/QrScanner.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/VirtualCardDetails.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/auth/BiometricSetupCard.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/auth/BiometricUnlockScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/CompactTemplateCard.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeContract.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchExperience.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/profile/DraftTemplatePreview.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/profile/TemplateStorefrontEditors.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopPlanThemes.kt
 M apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt
 M apps/android/app/src/main/res/drawable-nodpi/pop_approved_section_verification.png
 D apps/android/app/src/main/res/values-ar/pass6.xml
 D apps/android/app/src/main/res/values-ar/pass7.xml
 D apps/android/app/src/main/res/values-ar/strings.xml
 D apps/android/app/src/main/res/values-ar/whatsapp_auth.xml
 D apps/android/app/src/main/res/values-fr/pass6.xml
 D apps/android/app/src/main/res/values-fr/pass7.xml
 D apps/android/app/src/main/res/values-fr/strings.xml
 D apps/android/app/src/main/res/values-fr/whatsapp_auth.xml
 M apps/android/app/src/main/res/values/strings.xml
 D apps/android/app/src/main/res/xml/locales_config.xml
 M apps/android/app/src/test/java/com/popwam/pop/data/auth/SessionRepositoryPasskeyTest.kt
 M apps/android/app/src/test/java/com/popwam/pop/ui/FirstLaunchAndroidContractTest.kt
 D apps/mobile/onboarding/src/commonMain/composeResources/values-ar/strings.xml
 D apps/mobile/onboarding/src/commonMain/composeResources/values-fr/strings.xml
 M apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/LanguageScreen.kt
 M apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/ThemeScreen.kt
 M apps/web/src/app/actions.ts
 M apps/web/src/app/admin/cards/batches/[id]/page.tsx
 M apps/web/src/app/admin/cards/batches/page.tsx
 M apps/web/src/app/admin/inventory/low-stock/page.tsx
 M apps/web/src/app/admin/inventory/page.tsx
 D apps/web/src/app/admin/suppliers/page.tsx
 M apps/web/src/app/admin/translations/page.tsx
 M apps/web/src/app/api/mobile/profiles/[id]/destinations/route.ts
 M apps/web/src/app/api/settings/preferences/route.ts
 M apps/web/src/app/business-actions.ts
 M apps/web/src/app/dashboard/cards/page.tsx
 M apps/web/src/app/localization-actions.ts
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
 M apps/web/src/lib/localization-policy.test.ts
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
 M apps/web/src/lib/settings-policy.test.ts
 M apps/web/src/lib/settings-policy.ts
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
?? LOCALIZATION_DYNAMIC_MIGRATION_REPORT.md
?? LOCALIZATION_MIGRATION_REPORT.md
?? POP_ANDROID_VISUAL_BATCH.zip
?? POP_ANDROID_VISUAL_BATCH/
?? REMAINING_SKIPPED_CLEANUP_REPORT.md
?? apps/android/app/src/main/java/com/popwam/pop/data/localization/DynamicLocalization.kt
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
?? apps/android/app/src/main/res/values/pop_appearance_typography.xml
?? apps/android/app/src/main/res/values/pop_back_behavior.xml
?? apps/android/app/src/main/res/values/pop_menu_figma.xml
?? apps/android/app/src/main/res/values/pop_share_figma.xml
?? apps/android/app/src/test/java/com/popwam/pop/data/localization/
?? apps/web/src/app/api/localization/[code]/
?? artifacts/neon-schema.sql
?? docs/POP_VISUAL_SURFACE_MAP.md
?? packages/db/prisma/migrations/20260915120000_remove_unused_architecture/
```
