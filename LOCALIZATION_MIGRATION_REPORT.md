# Localization Migration Report

Prepared before locale-resource deletion, as required.

## 1. Current language architecture

- Web/backend localization is stored as JSON in `SystemSetting` under `localization.runtime`.
- The runtime object contains `defaultLocale`, a global `translationVersion`, and locale records with code, display name, native name, RTL flag, enabled/published state, display order, and key/value translations.
- `/api/localization/bootstrap` and `/api/platform/bootstrap` currently expose every enabled locale together with its complete translation map.
- Android has `LocalizationAuthorityStore`, but it currently:
  - filters database locales to a hardcoded `en`/`ar`/`fr` set;
  - injects English and Arabic even when the database did not enable them;
  - caches the bootstrap JSON but does not use its translations to render UI;
  - relies on Android resource selection through `AppCompatDelegate`;
  - overwrites an unavailable selected language instead of retaining the preference;
  - has no active startup call to `refresh()`.
- Android UI uses approximately 687 `stringResource(...)` calls across 21 Kotlin files. The selected Android locale chooses hardcoded `values-ar`/`values-fr` resources.
- The first-launch language screen and Settings language picker contain explicit English/Arabic/French filtering and labels.

## 2. Database language/translation source

- Authority: `SystemSetting.key = "localization.runtime"`.
- Policy/parser: `apps/web/src/lib/localization-policy.ts`.
- Runtime reader: `apps/web/src/lib/localization-runtime.ts`.
- Owner actions: `apps/web/src/app/localization-actions.ts`.
- Owner UI: `apps/web/src/app/admin/translations/page.tsx` and `/admin/localization`.
- Existing public API: `apps/web/src/app/api/localization/bootstrap/route.ts`.
- Existing global cache revision: `translationVersion`.

The database model is sufficient; no duplicate localization table or Prisma model is proposed.

## 3. Current Android locale resource folders

English/base fallback resources:

- `apps/android/app/src/main/res/values/strings.xml`
- `apps/android/app/src/main/res/values/whatsapp_auth.xml`
- `apps/android/app/src/main/res/values/pass6.xml`
- `apps/android/app/src/main/res/values/pass7.xml`
- `apps/android/app/src/main/res/values/pop_menu_figma.xml`
- `apps/android/app/src/main/res/values/pop_share_figma.xml`
- `apps/android/app/src/main/res/values/pop_back_behavior.xml`
- `apps/android/app/src/main/res/values/pop_appearance_typography.xml`

Duplicated fixed-locale translations currently exist in:

- `apps/android/app/src/main/res/values-ar/`
- `apps/android/app/src/main/res/values-fr/`

The locale-specific folders contain string resources only; no colors, dimensions, styles, drawables, fonts, or visual assets were found in them.

The Android build also includes the shared onboarding module's fixed translated resources at `apps/mobile/onboarding/src/commonMain/composeResources/values-ar/` and `values-fr/`. Production language/theme copy from that module will be supplied by the Android dynamic resolver before those duplicates are removed; its base `values/strings.xml` remains as the module's English fallback for previews/tests and other targets.

`apps/android/app/src/main/res/xml/locales_config.xml` statically advertises only `en`, `ar`, and `fr`, which conflicts with database-controlled language availability.

## 4. Files proposed for removal

Only after the dynamic resolver, local English fallback, cache, language-list API, and RTL metadata behavior compile and pass checks:

- every XML file under `apps/android/app/src/main/res/values-ar/`;
- every XML file under `apps/android/app/src/main/res/values-fr/`;
- shared onboarding translation XML under `apps/mobile/onboarding/src/commonMain/composeResources/values-ar/` and `values-fr/` after its production call sites receive dynamic copy;
- `apps/android/app/src/main/res/xml/locales_config.xml` and the manifest reference to it, because Android's compile-time locale list cannot represent the owner's dynamic database list.

No base `values/` resource is proposed for deletion.

## 5. English fallback files that will remain

All files under `apps/android/app/src/main/res/values/` remain. They are the complete built-in English/failsafe baseline, including accessibility descriptions, system-required labels, formatted strings, and Figma-screen string identifiers.

`apps/mobile/onboarding/src/commonMain/composeResources/values/strings.xml` also remains as the shared module's English fallback.

The resolver will derive a stable database key from the Android resource identifier, never from displayed text. Example: `R.string.settings_language_help` maps to `android.settings.language.help`.

Resolution order:

1. selected-language cached/downloaded value;
2. built-in English Android resource;
3. stable translation key only if the English resource cannot be read.

A missing remote key falls back individually; it does not switch the whole UI language.

## 6. Translation resolver architecture

- Add one Android resolver used by Compose and non-Compose call sites.
- Replace Android Compose `stringResource(...)` lookups mechanically with the resolver while preserving every modifier, layout, style, and component.
- Keep resource IDs as the English/accessibility fallback contract.
- Use stable `android.<resource-name-with-dots>` keys.
- Apply remote formatting defensively; malformed remote format strings fall back to the English resource.
- Install cached localization state synchronously during `Application.onCreate` before UI composition.
- Refresh in a background coroutine after UI startup; never gate the splash or navigation on localization network work.

## 7. Cache architecture

- Continue using the existing app-private `SharedPreferences` localization store.
- Persist:
  - currently enabled locale metadata;
  - cached packs by locale code;
  - translations per pack;
  - revision/version;
  - successful update timestamp.
- Preserve cached packs when a language is disabled or omitted by a later bootstrap.
- Do not redownload on screen navigation.
- Fetch only when a selected pack is absent/stale or when the user explicitly selects that language.
- Retain the selected-language preference if download fails or the owner disables the language; remove disabled languages from the selectable list and render safely from retained cache/English fallback.

## 8. Backend/API changes required

Minimal changes to the existing architecture:

- Make `/api/localization/bootstrap` return enabled language metadata and revision, without embedding all packs.
- Add a single locale-pack route under the same localization API namespace.
- Keep `SystemSetting.localization.runtime` and the existing admin actions as the only authority.
- Stop forcing Arabic/French metadata and stop forcing English into the selectable language list. English remains the application fallback even if it is not owner-enabled as a selectable remote language.
- Make the admin translation screen iterate the configured locale set rather than constructing a fixed Arabic/English/French set.
- Keep the existing global `translationVersion` as the cache invalidation revision; no Prisma migration is required.

## 9. RTL/LTR behavior

- Direction comes from each database locale's `rtl` metadata.
- The Compose root will provide `LayoutDirection.Rtl` or `LayoutDirection.Ltr` from cached/current metadata.
- No hardcoded RTL language-code list will be used.
- English local fallback uses LTR only when there is no selected locale metadata.
- Existing explicit LTR islands for phone numbers, URLs, email, codes, and serial numbers remain unchanged.

## 10. Visual files that will remain untouched

No PNG, SVG/vector drawable, logo, icon, theme token, typography asset, spacing token, navigation structure, or Figma-derived asset will be deleted or redesigned.

In particular, these asset groups remain untouched:

- every `pop_figma_*` asset;
- every `pop_approved_*` asset;
- `apps/android/app/src/main/res/drawable*/`;
- `apps/android/app/src/main/res/mipmap*/`;
- `apps/android/app/src/main/res/font/` if present;
- Home, My Profile, Share, Menu, Bottom Navigation, and Splash/Loading layout and styling;
- theme colors, typography sizing/weight, icons, padding, cards, hierarchy, and navigation destinations.

Kotlin UI files may receive string-resolver imports/call substitutions and language metadata wiring only. Those edits must not alter visual parameters or component structure.

## 11. Risks

- Remote format placeholders can be invalid or incompatible with the English resource arguments; the resolver must catch this per key and use English.
- Locale codes and translation maps from older cached JSON need tolerant migration/sanitization.
- An empty database language configuration must leave the app usable in English while presenting no invented selectable language list.
- A selected language disabled by the owner must disappear from selection without deleting its cache or resetting the saved preference.
- The current first-launch language screen was visually authored around a small list; arbitrary owner-enabled languages must reuse the same controls and responsive behavior without changing the approved visual language.
- Existing database translations may not yet contain Android `android.*` keys. Until the owner publishes them, each missing key safely displays its built-in English value.
- The worktree already contains protected Android visual changes. Localization edits must be limited to text resolution and must not overwrite or normalize unrelated changes.
