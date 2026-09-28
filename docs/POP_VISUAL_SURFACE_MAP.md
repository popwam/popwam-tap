# POP Visual Surface Map

This inventory describes the current user-facing repository at the time of inspection. It maps 72 Android destinations or distinct step surfaces, 72 current Web/Admin pages, 24 current public/account Web pages, and the 17 approved profile-template variants. Redirect-only compatibility routes and unreferenced review composables are kept out of the current counts and listed in section 15.

## Reading conventions

- **OWNER VISUAL EDIT TARGET** means the file directly draws a screen or page.
- **SHARED COMPONENT** means editing it changes several surfaces.
- **FUNCTIONAL SUPPORT ONLY** means the file supplies state, models, navigation, or platform behavior without owning the main presentation.
- Every Android surface inherits strings from `apps/android/app/src/main/res/values/strings.xml`, `apps/android/app/src/main/res/values/pass6.xml`, `apps/android/app/src/main/res/values/pass7.xml`, and `apps/android/app/src/main/res/values/whatsapp_auth.xml`, with Arabic and French overrides under `apps/android/app/src/main/res/values-ar/` and `apps/android/app/src/main/res/values-fr/`. It inherits theme behavior from `apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt` and the shared tokens under `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/`.
- Every Web surface inherits `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`, `apps/web/src/lib/i18n.ts`, `apps/web/locales/en.json`, and `apps/web/locales/ar.json`. Admin pages additionally inherit `apps/web/src/app/admin/layout.tsx`; dashboard pages inherit `apps/web/src/app/dashboard/layout.tsx`.
- Web server pages generally hold request/query state in the page function. Their directly displayed persistent records are defined by `packages/db/prisma/schema.prisma`; mutations are in the specifically listed `apps/web/src/app/*actions.ts` files. These are functional support, not visual edit targets.

## 1. Android — Auth & Onboarding

| # | Screen / route | Main UI and component | State, model, repository | Shared visuals / assets | Class and visual control |
|---:|---|---|---|---|---|
| 1 | Launch / splash; app entry | `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchExperience.kt` — `LaunchExperience`; root wiring in `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt`; `apps/android/app/src/main/java/com/popwam/pop/data/launch/AndroidLaunchStatePersistence.kt`; `apps/mobile/foundation/src/commonMain/kotlin/com/popwam/mobile/foundation/launch/LaunchState.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt`; `apps/android/app/src/main/res/drawable/pop_splash_mark.xml`; `apps/android/app/src/main/res/raw/pop_loading.svg` | **OWNER VISUAL EDIT TARGET** — controls launch branding, progress, and launch failure/retry states. |
| 2 | Biometric quick unlock; pre-auth gate | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/BiometricUnlockScreen.kt` — `BiometricUnlockScreen` | `apps/android/app/src/main/java/com/popwam/pop/data/auth/BiometricCoordinator.kt`; session state in `apps/android/app/src/main/java/com/popwam/pop/data/auth/SecureSessionStore.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt`; Material fingerprint icon | **OWNER VISUAL EDIT TARGET** — controls the quick-unlock prompt and cancel/fallback presentation. |
| 3 | Welcome / phone entry | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt` — `PhoneLoginScreen` phone stage | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginViewModel.kt` — `PhoneLoginState`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/PhoneCountryStore.kt`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/PhoneIdentity.kt`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/SessionRepository.kt`; DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt`; `apps/android/app/src/main/res/drawable/pop_logo_official.xml` | **OWNER VISUAL EDIT TARGET** — controls welcome branding, country selector, phone field, and continue action. |
| 4 | WhatsApp OTP verification | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt` — `PhoneLoginScreen` OTP stage | Same `PhoneLoginViewModel`, `PhoneLoginState`, `SessionRepository`, and API DTO paths as phone entry | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt`; WhatsApp copy in the inherited `whatsapp_auth.xml` files | **OWNER VISUAL EDIT TARGET** — controls OTP cells/input, timer, resend, error, and verification feedback. |
| 5 | Legal / consent onboarding step | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — `LoginOnboardingScreen` legal stage | `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt` — `AuthViewModel`, `AuthUiState`, `AuthSetupStage`; `apps/android/app/src/main/java/com/popwam/pop/data/repository/AuthSetupRepository.kt`; DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt`; legal viewer in `apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt` | **OWNER VISUAL EDIT TARGET** — controls consent cards, required-document links, and acceptance action. |
| 6 | Name step | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — name stage | `AuthViewModel` / `AuthUiState` / `AuthSetupRepository` paths above | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt`; `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt` | **OWNER VISUAL EDIT TARGET** — controls name entry, validation, keyboard actions, and step progress. |
| 7 | Account type: PERSONAL / BUSINESS | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — account-type stage | `AuthViewModel` / `AuthUiState`; account/profile DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`; `AuthSetupRepository` | `AuthStepLayout.kt`; Material person/business icons | **OWNER VISUAL EDIT TARGET** — controls the two account-type choices and selected-state styling. |
| 8 | First profile creation | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — first-profile stage | `AuthViewModel` / `AuthUiState`; `apps/android/app/src/main/java/com/popwam/pop/ui/ProfileBootstrapPolicy.kt`; `AuthSetupRepository`; API DTOs | `AuthStepLayout.kt`; `PopFormLayout.kt` | **OWNER VISUAL EDIT TARGET** — controls the first PERSONAL or BUSINESS profile fields and validation. |
| 9 | Onboarding template selection and draft preview | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt`; `apps/android/app/src/main/java/com/popwam/pop/ui/profile/DraftTemplatePreview.kt` | `AuthViewModel` / `AuthUiState`; template DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`; `AuthSetupRepository` | `apps/android/app/src/main/java/com/popwam/pop/ui/components/CompactTemplateCard.kt`; preview images returned by the TEST API | **OWNER VISUAL EDIT TARGET** — controls template cards, selection, skip/default action, and draft preview. |
| 10 | Passkey setup | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — passkey stage | `AuthViewModel` / `AuthUiState`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/PasskeyCoordinator.kt`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/PasskeyCreationOptions.kt` | `AuthStepLayout.kt`; Material key icon | **OWNER VISUAL EDIT TARGET** — controls passkey explanation, create, skip, progress, and error states. |
| 11 | Biometric setup | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt`; `apps/android/app/src/main/java/com/popwam/pop/ui/auth/BiometricSetupCard.kt` | `AuthViewModel` / `AuthUiState`; `apps/android/app/src/main/java/com/popwam/pop/data/auth/BiometricCoordinator.kt` | `AuthStepLayout.kt`; Material fingerprint icon | **OWNER VISUAL EDIT TARGET** — controls biometric enablement, device capability messaging, and skip action. |
| 12 | Onboarding completion | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/LoginOnboardingScreen.kt` — completion stage | `AuthViewModel` / `AuthUiState` / `AuthSetupRepository` | `AuthStepLayout.kt`; app logo resources under `apps/android/app/src/main/res/drawable/` | **OWNER VISUAL EDIT TARGET** — controls success confirmation and entry into the app. |
| 13 | Native Terms / Privacy viewer; `legal/terms`, `legal/privacy` | `apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt` — `NativeLegalScreen` | Network/content state in the same file; legal DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt` | Material top app bar; inherited strings/theme | **OWNER VISUAL EDIT TARGET** — controls native legal loading, document content, failure, and back navigation. |

## 2. Android — Home & Navigation

All authenticated routes are declared in `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` by `FigmaMainNavigation`; destination contracts are also influenced by `apps/mobile/foundation/src/commonMain/kotlin/com/popwam/mobile/foundation/navigation/PopDestination.kt`.

| # | Screen / route | Main UI | State / data chain | Shared visuals | Class and visual control |
|---:|---|---|---|---|---|
| 14 | Home; `home` | `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt` — `HomeRoute`, `HomeScreen`, `LoadedHome` | `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeViewModel.kt`; `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeContract.kt` — `HomeUiState`, `HomeProfile`; repository interface in `HomeViewModel.kt`, implementation/data in `apps/android/app/src/main/java/com/popwam/pop/data/repository/LocalFirstRepository.kt` | `PopBrandedLoading.kt`; `PopVisuals.kt`; approved navigation images under `apps/android/app/src/main/res/drawable-nodpi/` | **OWNER VISUAL EDIT TARGET** — controls the authenticated landing layout, header, cards, and top actions. |
| 15 | Home search / discovery results; embedded in `home` | `HomeScreen.kt` — `HomeSearch`, `DiscoveryResultCard` | `HomeViewModel.kt`; `HomeContract.kt`; API models in `data/api/Models.kt` | Home cards and Material search controls | **OWNER VISUAL EDIT TARGET** — controls search field, result rows, and no-result presentation. |
| 16 | Profile completion card; embedded in `home` | `HomeScreen.kt` — `ProfileCompletionCard` | `HomeContract.kt` completion data | Shared home card styling | **OWNER VISUAL EDIT TARGET** — controls readiness progress and missing-step call to action. |
| 17 | Activity summary; embedded in `home` | `HomeScreen.kt` — `HomeActivitySummary` | `HomeUiState` in `HomeContract.kt`; API models in `data/api/Models.kt` | Home card styling | **OWNER VISUAL EDIT TARGET** — controls compact activity metrics and recent-event rows. |
| 18 | Home profile picker sheet | `HomeScreen.kt` — `ProfilePickerSheet` | `HomeViewModel.kt`; `HomeUiState` | Material modal bottom sheet | **OWNER VISUAL EDIT TARGET** — controls active-profile selection inside Home. |
| 19 | Bottom navigation; top routes `home`, `my-profile`, `menu` | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `PopPrimaryNavigationBar` | `HomePrimaryTab` and route selection in `HomeContract.kt` / `FigmaNavigation.kt`; icon policy in `apps/android/app/src/main/java/com/popwam/pop/ui/PopNavigationIcons.kt` and `PopNavigationPolicy.kt` | approved nav PNGs in `apps/android/app/src/main/res/drawable-nodpi/`; generated icons under `apps/android/app/src/main/java/com/popwam/pop/ui/icons/` | **SHARED COMPONENT** — controls the three persistent destinations, selection indicator, labels, sizing, and spacing. |
| 20 | Menu; `menu` | `apps/android/app/src/main/java/com/popwam/pop/ui/MenuScreens.kt` — `PopMenuScreen`, `MenuProfileCard`, `MenuGroup` | `MainViewModel`, `MainUiState` in `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`; DTOs `data/api/Models.kt`; repository `data/repository/PopwamRepository.kt` | menu PNGs in `res/drawable-nodpi/pop_approved_menu_*.png`; bottom navigation | **OWNER VISUAL EDIT TARGET** — controls account summary and grouped links to profiles, social, settings, legal, and logout. |
| 21 | Activity feed; `activity` | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `ActivityFeed` | `MainViewModel` / `MainUiState`; `PopwamRepository.kt`; API DTOs | `RefreshScreen`, `Feedback` in `PopwamApp.kt` | **OWNER VISUAL EDIT TARGET** — controls full activity list, refresh, loading, and error feedback. |
| 22 | Virtual profiles; `virtual-cards` | `FigmaNavigation.kt` — `VirtualProfiles` | `MainViewModel` / `MainUiState`; `PopwamRepository.kt`; API DTOs | `RefreshScreen`, Material cards | **OWNER VISUAL EDIT TARGET** — controls the compact profile list and add-profile action. |
| 23 | Physical products; `products` | `FigmaNavigation.kt` — `PhysicalCards` | `MainViewModel` / `MainUiState`; `PopwamRepository.kt`; card DTOs | `RefreshScreen`; card artwork in `apps/android/app/src/main/res/drawable-nodpi/pop_card_*.png` | **OWNER VISUAL EDIT TARGET** — controls the owned physical-card grid/list and status treatment. |

## 3. Android — My Profile

The profile screens share `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileContract.kt` (`ProfilesUiState`, `OwnedProfile`, `ProfileContent`, editor models/events/effects), `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/repository/LocalFirstRepository.kt`, `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`, and `apps/android/app/src/main/java/com/popwam/pop/data/api/PopwamApi.kt`.

| # | Screen / route | Main UI and component | Extra model/support | Shared visuals / assets | Class and visual control |
|---:|---|---|---|---|---|
| 24 | My Profile; `my-profile` | `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt` — `ProfileViewScreen(topLevel=true)` | Shared profile chain above | `PopApprovedProfileComponents.kt`; approved action/section PNGs in `res/drawable-nodpi/`; bottom navigation | **OWNER VISUAL EDIT TARGET** — controls the active profile's top-level identity, actions, sections, and empty/loading/error states. |
| 25 | Profile list; `profiles` | `ProfileScreens.kt` — `ProfileListScreen`, `OwnedProfileCard` | Shared profile chain | `PopBrandedLoading.kt`; profile avatar/status helpers | **OWNER VISUAL EDIT TARGET** — controls profile selection, status, and create affordance. |
| 26 | Create additional profile; `profiles/create` | `ProfileScreens.kt` — `ProfileCreationScreen` | `ProfilePolicy.kt`; shared profile chain | `PopFormLayout.kt`, `PopFormTextField`; profile strings | **OWNER VISUAL EDIT TARGET** — controls PERSONAL/BUSINESS creation fields and validation. |
| 27 | Profile detail; `profile/{id}` | `ProfileScreens.kt` — `ProfileViewScreen` | Shared profile chain | `PopApprovedProfileComponents.kt`; approved profile PNGs | **OWNER VISUAL EDIT TARGET** — controls profile hero, visible sections, primary actions, and readiness summary. |
| 28 | Profile switcher sheet | `ProfileScreens.kt` — `ProfileSwitchSheet` | `ProfilesUiState`, `OwnedProfile` | Material modal bottom sheet | **OWNER VISUAL EDIT TARGET** — controls active-profile choice and add-profile entry. |
| 29 | Virtual card details; `virtual-card/{id}` | `apps/android/app/src/main/java/com/popwam/pop/ui/VirtualCardDetails.kt` — `VirtualCardDetailsScreen` | `MainViewModel` / `MainUiState`; API DTOs; `PopwamRepository.kt` | Material cards, badges, actions | **OWNER VISUAL EDIT TARGET** — controls the virtual-card summary and profile/publish actions. |
| 30 | Profile editor hub; `profile/{id}/edit` | `ProfileScreens.kt` — `ProfileEditorHubScreen`, `ProfileEditorSectionCard` | `ProfileEditorSection` in `ProfileContract.kt` | approved section PNGs; `PopApprovedProfileComponents.kt` | **OWNER VISUAL EDIT TARGET** — controls the list of editable sections and completion/readiness overview. |
| 31 | Basic Information; `.../edit/BASIC_INFORMATION` | `ProfileScreens.kt` — `BasicInformationEditor` | form validation/policy in `ProfilePolicy.kt`; shared profile chain | `PopFormLayout.kt`; avatar/image picker | **OWNER VISUAL EDIT TARGET** — controls display name, title, company, avatar, and core identity fields. |
| 32 | Profession selector; inside Basic Information | `ProfileScreens.kt` — `ProfessionSelector` | profile profession value in `ProfileContract.kt`; policy in `ProfilePolicy.kt` | Material choice controls | **OWNER VISUAL EDIT TARGET** — controls profession choices and selected state. |
| 33 | About; `.../edit/ABOUT` | `ProfileScreens.kt` — `AboutEditor` | `ProfileContent`; profile validation policy | `PopFormLayout.kt` | **OWNER VISUAL EDIT TARGET** — controls biography/description fields and language-aware text editing. |
| 34 | Contact / Links; `.../edit/CONTACT_LINKS` | `ProfileScreens.kt` — `ContactLinksEditor` and link/contact sheets | `ProfileLink` and contact fields in `ProfileContract.kt`; `ProfilePolicy.kt` | `PopFormSheet`, validated fields, generated link icons | **OWNER VISUAL EDIT TARGET** — controls phone, email, website, social links, ordering, and dialogs. |
| 35 | PERSONAL/BUSINESS structured details; `.../edit/TYPE_DETAILS` | `ProfileScreens.kt` — `StructuredDetailsEditor` | structured-field models in `ProfileContract.kt`; DTOs `data/api/Models.kt` | `PopFormLayout.kt` | **OWNER VISUAL EDIT TARGET** — controls type-specific detail groups without changing account type. |
| 36 | Media; `.../edit/MEDIA` | `ProfileScreens.kt` — `MediaEditor` and media/document dialogs | media/document models in `ProfileContract.kt`; upload policy `data/repository/AndroidUploadPolicy.kt` | Android photo/file pickers; approved media PNG | **OWNER VISUAL EDIT TARGET** — controls cover, gallery, documents, upload progress, and removal actions. |
| 37 | Visibility; `.../edit/VISIBILITY` | `ProfileScreens.kt` — `VisibilityEditor` | visibility models and mutations in `ProfileContract.kt`; `ProfilePolicy.kt` | Material radio/switch controls | **OWNER VISUAL EDIT TARGET** — controls profile and field visibility choices. |
| 38 | Template editor; `.../edit/TEMPLATE` | `apps/android/app/src/main/java/com/popwam/pop/ui/profile/TemplateStorefrontEditors.kt` — `TemplateEditor` | template DTOs `data/api/Models.kt`; profile state chain | `CompactTemplateCard.kt`; `DraftTemplatePreview.kt` | **OWNER VISUAL EDIT TARGET** — controls template browsing, locked/applied states, preview, and selection. |
| 39 | Services / Products showcase; `.../edit/SERVICES` | `TemplateStorefrontEditors.kt` — `StorefrontEditor`, `ShowcaseItemSheet` | `ProfileService` / storefront entitlement fields in `ProfileContract.kt`; `ShowcasePolicy.kt` | `PopFormSheet`, item cards, media picker | **OWNER VISUAL EDIT TARGET** — controls product/service cards, add/edit sheet, limits, contact notice, and ordering. |
| 40 | Branches / locations; `.../edit/LOCATIONS` | `ProfileScreens.kt` — `LocationsEditor`, `LocationDialog` | `ProfileLocation` in `ProfileContract.kt`; validation in `ProfilePolicy.kt` | `PopFormSheet`, LTR phone/map fields | **OWNER VISUAL EDIT TARGET** — controls branch list, location editor, map URL, phone, and visibility. |
| 41 | Publish readiness; `profile-publish/{id}` | `ProfileScreens.kt` — `ProfilePublishScreen`, `ProfileReadinessCard` | completion/blocking codes in `ProfileContract.kt`; `ProfilePolicy.kt` | shared profile status/action components | **OWNER VISUAL EDIT TARGET** — controls readiness blockers, publish/unpublish actions, and result feedback. |
| 42 | Public profile preview dialog; `profile/public-preview/{id}`, `public-preview/{slug}` | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `PublicProfilePreviewDialog` | URL authority in `apps/android/app/src/main/java/com/popwam/pop/PublicProfileUrls.kt`; profile state/slug from the profile or home chain | Android WebView/dialog shell | **OWNER VISUAL EDIT TARGET** — controls the in-app shell around the canonical public Web rendering. |

## 4. Android — Share / QR / NFC / HCE

Share state is defined by `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareContract.kt` (`ShareUiState`, `ActiveShareProfile`, `CanonicalSharePayload`, `ShareNfcState`, `ShareHceState`) and driven by `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareViewModel.kt`.

| # | Screen / route | Main UI | Direct support/model | Shared visuals / assets | Class and visual control |
|---:|---|---|---|---|---|
| 43 | Share center; `share`, `profile/share/{id}` | `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt` — `ShareCenterScreen` (`ProductionShareCenterScreen` alias) | `ShareViewModel.kt`; `ShareContract.kt`; `SharePlatform.kt`; `SharePayloadPolicy.kt` | approved share PNGs `res/drawable-nodpi/pop_approved_share_*.png`; `PopApprovedProfileComponents.kt` | **OWNER VISUAL EDIT TARGET** — controls profile selector and WhatsApp, QR, NFC, HCE, copy/open share actions. |
| 44 | QR panel / dialog; `profile/qr/{id}` | `ShareScreens.kt` — QR panel in `ShareCenterScreen` | `CanonicalSharePayload`; QR generation dependencies in Android build configuration | approved QR/share images | **OWNER VISUAL EDIT TARGET** — controls QR size, surrounding instructions, URL copy, and share affordances. |
| 45 | NFC write / Program Card; share NFC panel plus `programming`, `program/{id}` | `ShareScreens.kt` NFC sheet; current programming UI wrappers in `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` — `LegacyProgrammingList`, `LegacyProgramming` | `NfcCoordinator.kt`, `NfcTagManager.kt`, `NfcWritePreflightPolicy.kt`, `PermanentUrlPolicy.kt`; `MainViewModel` programming state | approved program-card PNG; Material NFC icon | **OWNER VISUAL EDIT TARGET** — controls card selection, write instructions, scan progress, result, and retry. |
| 46 | HCE / Share by Tap; `profile/nfc/{id}`, `hce` | `ShareScreens.kt` — HCE panel in `ShareCenterScreen` | `ShareViewModel.kt`; `apps/android/app/src/main/java/com/popwam/pop/hce/HceConfig.kt`, `HceProfilePolicy.kt`, `HceSelectionPolicy.kt`, `PopwamHostApduService.kt` | approved tap PNG | **OWNER VISUAL EDIT TARGET** — controls tap-ready state, selected profile, compatibility messaging, and stop/change actions. |
| 47 | Share activation; `share-activate` | `ShareScreens.kt` — `ShareActivationScreen` (`ProductionShareActivationScreen` alias) | `ShareViewModel.kt`; activation DTOs in `data/api/Models.kt` | `apps/android/app/src/main/java/com/popwam/pop/ui/QrScanner.kt` | **OWNER VISUAL EDIT TARGET** — controls QR/manual activation entry, camera state, and result feedback. |
| 48 | Physical card detail; `card/{id}` | `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` — `LegacyPhysicalCardDetails`, current `CardDetailScreen`, `QrDialog` | `MainViewModel` / `MainUiState`; card DTOs; `PopwamRepository.kt` | card artwork `res/drawable-nodpi/pop_card_*.png`; QR dialog | **OWNER VISUAL EDIT TARGET** — controls card status, permanent URL, QR, lost-card flow, and actions. |
| 49 | Activation scanner; `activate` | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `ActivationScannerScreen` | `MainViewModel` / `MainUiState`; activation DTOs; `PopwamRepository.kt` | `QrScanner.kt`; `PopFormTextField` | **OWNER VISUAL EDIT TARGET** — controls camera/manual activation, profile choice, confirmation, and errors. |

## 5. Android — Account & Settings

All numbered settings surfaces below are branches of `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt` — `SecuritySettingsScreen`. They use `MainViewModel` / `MainUiState` in `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`, DTOs in `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`, and `apps/android/app/src/main/java/com/popwam/pop/data/repository/PopwamRepository.kt`. Shared controls in the same UI file are `SettingsGroup`, `ChoiceSetting`, `ToggleSetting`, `InfoCard`, `QuotaCard`, `SecuritySummary`, `DeviceCard`, `SessionCard`, `PermissionRow`, `EmptySettings`, and `StepUpSheet`.

| # | Screen / route | Extra state/support | Assets / shared UI | Class and visual control |
|---:|---|---|---|---|
| 50 | Settings center; `settings` | Section route state in `FigmaNavigation.kt` | settings/menu approved PNGs | **OWNER VISUAL EDIT TARGET** — controls grouped navigation for security, preferences, account, help, about, and legal. |
| 51 | Appearance; `settings/appearance` | `apps/android/app/src/main/java/com/popwam/pop/ui/theme/AppearanceStore.kt`; `PopPlanThemes.kt`; identity models in `apps/mobile/foundation/src/commonMain/kotlin/com/popwam/mobile/foundation/launch/LaunchState.kt` | `Theme.kt`; palette cards | **OWNER VISUAL EDIT TARGET** — controls system/light/dark mode, POP identity palette, font label, and scale note. |
| 52 | Language / region; `settings/language` | `apps/android/app/src/main/java/com/popwam/pop/ui/LocalePolicy.kt`; localization authority in `data/localization/LocalizationAuthorityStore.kt` | English/Arabic/French resource directories | **OWNER VISUAL EDIT TARGET** — controls locale choices, region, font, and immediate direction changes. |
| 53 | Notifications / inbox settings; `settings/notifications` | notification preference DTOs and FCM bridge `data/auth/FcmTokenBridge.kt`, `PopMessagingService.kt` | switches and permission card | **OWNER VISUAL EDIT TARGET** — controls OS permission state and notification-category toggles; there is no separate native inbox route. |
| 54 | Privacy; `settings/privacy` | privacy/nearby/friend DTOs; navigation to friends and nearby | privacy/group/location icons | **OWNER VISUAL EDIT TARGET** — controls activity identity and links to blocked users, Nearby, friend privacy, and profile visibility. |
| 55 | Permissions; `settings/permissions` | Android permission APIs in `SecuritySettingsScreen.kt` | `PermissionRow` and system-settings action | **OWNER VISUAL EDIT TARGET** — controls camera, NFC, location, notifications, and contacts permission status. |
| 56 | Security overview; `settings/security` | security overview DTOs | `SecuritySummary` | **OWNER VISUAL EDIT TARGET** — controls passkey, device, session, recovery phone, and biometric summaries. |
| 57 | Devices; `settings/devices` | security device DTOs | `DeviceCard`, empty/loading/error states | **OWNER VISUAL EDIT TARGET** — controls device identity, current-device badge, push state, and session link. |
| 58 | Sessions; `settings/sessions` | security session DTOs; step-up actions in `MainViewModel` | `SessionCard`, confirm dialog, `StepUpSheet` | **OWNER VISUAL EDIT TARGET** — controls per-session revoke and sign-out-other/all actions. |
| 59 | Passkeys; `settings/passkeys`, `passkeys` | `PasskeyCoordinator.kt`; passkey DTOs and `PasskeyLoginError` in `AppViewModels.kt` | key icon, confirm dialog, `StepUpSheet` | **OWNER VISUAL EDIT TARGET** — controls add/remove passkey, metadata, empty state, and platform errors. |
| 60 | Biometrics / device security; `settings/device-security` | `BiometricCoordinator.kt`; Android biometric capability checks | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/BiometricSetupCard.kt` | **OWNER VISUAL EDIT TARGET** — controls biometric status and links to passkeys or device enrollment settings. |
| 61 | Usage / quotas; `settings/usage` | quota DTOs in `data/api/Models.kt` | `QuotaCard` | **OWNER VISUAL EDIT TARGET** — controls used, limit, remaining, and override presentation. |
| 62 | Account / phone / deletion; `settings/account` | account and change-phone actions in `MainViewModel`; `PopFormLayout.kt`; step-up state | form fields, confirmation dialog, `StepUpSheet` | **OWNER VISUAL EDIT TARGET** — controls account identity, phone change verification, logout, and deletion request. |
| 63 | Help; `settings/help` | navigation callbacks | help icon and settings cards | **OWNER VISUAL EDIT TARGET** — controls support/help actions and How It Works entry. |
| 64 | About; `settings/about` | `BuildConfig.VERSION_NAME`, `BuildConfig.VERSION_CODE` | app logo/info icon | **OWNER VISUAL EDIT TARGET** — controls version/build attribution and legal link. |
| 65 | Legal settings; `settings/legal` | navigation to native legal routes | legal/privacy icons | **OWNER VISUAL EDIT TARGET** — controls Terms and Privacy entry cards. |
| 66 | Connected accounts portal; `integrations` | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `SecurePortal`; URL from Android environment configuration | in-app browser / external portal shell | **OWNER VISUAL EDIT TARGET** — controls the native handoff to the connected-accounts Web portal. |

## 6. Android — Social / Discovery

| # | Screen / route | Main UI | State / model / repository | Shared visuals | Class and visual control |
|---:|---|---|---|---|---|
| 67 | Friends list; `friends`, `friends/friends` | `apps/android/app/src/main/java/com/popwam/pop/ui/FriendsScreen.kt` — `FriendsScreen`, `FriendsList`, `FriendCard` | `MainViewModel` / `MainUiState`; friend DTOs `data/api/Models.kt`; `PopwamRepository.kt`; `apps/android/app/src/main/java/com/popwam/pop/ui/FriendsPolicy.kt` | Friends header/tabs, profile picker, report sheet | **OWNER VISUAL EDIT TARGET** — controls friend rows, status/actions, tabs, and list states. |
| 68 | Friend requests; `friends/requests` | `FriendsScreen.kt` — `RequestsList`, `RequestCard` | Same friends chain | Friends tabs and cards | **OWNER VISUAL EDIT TARGET** — controls incoming/outgoing request cards and accept/decline/cancel actions. |
| 69 | Profile search; `friends/search` | `FriendsScreen.kt` — `FriendSearch`, `SearchCard` | Same friends chain | search field, profile cards, empty/loading states | **OWNER VISUAL EDIT TARGET** — controls people search, result identity, and request actions. |
| 70 | Friend privacy; `friends/privacy` | `FriendsScreen.kt` — `FriendsPrivacy` | privacy state and policy in `FriendsPolicy.kt` | choice/toggle cards | **OWNER VISUAL EDIT TARGET** — controls who can find, request, or view friend-related data. |
| 71 | Blocked users; `friends/blocked` | `FriendsScreen.kt` — `BlockedList` | Same friends chain | blocked-user cards and empty state | **OWNER VISUAL EDIT TARGET** — controls blocked identities and unblock actions. |
| 72 | Nearby; `nearby` | `apps/android/app/src/main/java/com/popwam/pop/ui/NearbyScreen.kt` — `NearbyScreen`, `NearbyGate`, `NearbyResultCard`, `NearbyReportDialog` | `MainViewModel` / `MainUiState`; nearby DTOs; `PopwamRepository.kt`; `NearbyPolicy.kt`; `NearbyLocationController.kt` | permission gate, result cards, report dialog, loading/empty states | **OWNER VISUAL EDIT TARGET** — controls privacy/permission gates, nearby results, profile selection, and reporting. |

Android has no current native chat/messages destination. Notifications are user-facing through `settings/notifications`; chat pages exist on Web and are mapped below.

## 7. Android — Shared Visual Components

| Shared component/file | Changing this file affects |
|---|---|
| `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `FigmaMainNavigation` | All authenticated route transitions, top-level scaffold placement, previews, and bottom navigation. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `PopPrimaryNavigationBar` | Home, My Profile, and Menu persistent navigation. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopVisuals.kt` — `PopDynamicBackground`, `PopSystemBars` | App-wide background treatment and Android system-bar colors. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopVisuals.kt` — `HowItWorksSheet` | The global How It Works modal and profile-creation handoff. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt` — `PopFormLayout` | Onboarding, profile creation/editors, account/phone forms, and activation forms. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt` — `PopFormSheet` | Contact, link, branch, service/product, and other editor sheets. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt` — `PopFormTextField`, `PopFormFocusController` | Field shape, keyboard actions, validation focus, and LTR fields across forms. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt` — branded loader components | Launch, Home, profiles, share, and other loading states. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt` — `PopOfficialLogo` | Authentication, loading, and branded empty/success surfaces. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/CompactTemplateCard.kt` | Onboarding and profile-editor template selection. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt` — approved actions | My Profile share, edit, preview, QR, and section actions. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopApprovedProfileComponents.kt` — approved section rows/cards | My Profile and editor hub section appearance. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/QrScanner.kt` | Card activation and share activation camera surfaces. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt` — settings primitives | Every settings section, cards, rows, switches, choices, devices, sessions, quotas, and empty states. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt` — `StepUpSheet` | Sensitive settings, passkey removal/addition, sessions, phone, and deletion confirmation. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` — `Field`, `LtrField`, `LabelValue`, `Loading`, `ErrorText`, `Feedback`, `QrDialog` | Current physical-card and programming surfaces plus their feedback/dialog presentation. |

## 8. Android — Theme / Typography / Assets

| File/path | Role and affected surfaces |
|---|---|
| `apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt` | App Material color scheme, semantic colors, identity palettes, rounded shapes, Cairo/Montserrat mapping; affects every Compose screen. |
| `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/PopTokens.kt` | Shared semantic color/token source used by Android themes. |
| `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/PopTypography.kt` | Shared script-aware typography scale. |
| `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/PopTheme.kt` | Shared theme identities and semantic projection. |
| `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/ProfileSetupVisualAssumptions.kt` | Functional visual assumptions for profile setup. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/theme/AppearanceStore.kt` | Persists theme mode and identity choice; affects app-wide theme selection. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/theme/PopPlanThemes.kt` | Maps plan/theme availability used by appearance/template presentation. |
| `apps/android/app/src/main/res/font/cairo.ttf`, `apps/android/app/src/main/res/font/montserrat.ttf`, `apps/android/app/src/main/res/font/abeezee.ttf` | Android font assets; Cairo and Montserrat are wired by `Theme.kt`. |
| `apps/android/app/src/main/res/values/colors.xml`, `apps/android/app/src/main/res/values/styles.xml`, `apps/android/app/src/main/res/values-v27/styles.xml` | XML launch/app colors and platform styles. |
| `apps/android/app/src/main/res/drawable/pop_logo_official.xml`, `apps/android/app/src/main/res/drawable/pop_logo.xml`, `apps/android/app/src/main/res/drawable/pop_splash_mark.xml`, `apps/android/app/src/main/res/raw/pop_logo_official.svg`, `apps/android/app/src/main/res/raw/pop_loading.svg` | Brand, splash, and loading artwork. |
| `apps/android/app/src/main/res/drawable-nodpi/pop_approved_*.png` | Approved navigation, menu, profile-section, profile-action, and share artwork. |
| `apps/android/app/src/main/res/drawable-nodpi/pop_card_*.png`, `apps/android/app/src/main/res/drawable-nodpi/pop_logo_form.png` | Physical-card previews and form logo. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopNavigationIcons.kt`, `apps/android/app/src/main/java/com/popwam/pop/ui/icons/*.kt` | Navigation and locally generated Material vector icons used throughout Android. |
| `apps/android/app/src/main/res/values/`, `apps/android/app/src/main/res/values-ar/`, `apps/android/app/src/main/res/values-fr/` | English/default, Arabic, and French strings that affect text length, direction, and layout. |

## 9. Web/Admin Pages

### Shared page dependencies

Admin pages use `apps/web/src/app/admin/layout.tsx`, `apps/web/src/components/dashboard-shell.tsx`, `apps/web/src/components/admin-ui.tsx`, `apps/web/src/components/page-heading.tsx`, the Web theme/localization baseline listed above, and where directly queried `packages/db/prisma/schema.prisma`. Dashboard pages use `apps/web/src/app/dashboard/layout.tsx`, `dashboard-shell.tsx`, the same Web baseline, `apps/web/src/lib/session.ts`, and Prisma-backed page data. The table lists page-specific components/actions; a dash means the page renders its own JSX and server/query state.

### Current Admin pages (48)

| Route | Page file / function | Page-specific visual component or direct UI data/action | Class and visual control |
|---|---|---|---|
| `/admin/login` | `apps/web/src/app/(admin-auth)/admin/login/page.tsx` — `AdminLoginPage` | `apps/web/src/components/admin-login-form.tsx`; auth/access state in `apps/web/src/lib/auth.ts`, `apps/web/src/lib/admin-access.ts` | **OWNER VISUAL EDIT TARGET** — admin sign-in card and validation states. |
| `/admin` | `apps/web/src/app/admin/page.tsx` — `AdminPage` | `admin-ui.tsx`; Prisma overview metrics | **OWNER VISUAL EDIT TARGET** — overview metrics and quick actions. |
| `/admin/account-types` | `apps/web/src/app/admin/account-types/page.tsx` — `AccountTypesPage` | `apps/web/src/lib/account-type-policy.ts` | **OWNER VISUAL EDIT TARGET** — PERSONAL/BUSINESS policy cards and edit entry. |
| `/admin/account-types/[kind]` | `apps/web/src/app/admin/account-types/[kind]/page.tsx` — `AccountTypeEditor` | `account-type-policy.ts`; page-local form/action | **OWNER VISUAL EDIT TARGET** — account-type settings editor. |
| `/admin/audit` | `apps/web/src/app/admin/audit/page.tsx` — `AuditPage` | `apps/web/src/lib/audit.ts` | **OWNER VISUAL EDIT TARGET** — audit filters and event table. |
| `/admin/branding` | `apps/web/src/app/admin/branding/page.tsx` — `BrandingPage` | `apps/web/src/components/branding-manager.tsx`; `apps/web/src/lib/branding.ts` | **OWNER VISUAL EDIT TARGET** — brand asset/configuration manager. |
| `/admin/cards` | `apps/web/src/app/admin/cards/page.tsx` — `AdminCardsPage` | `badge.tsx`, `confirm-submit.tsx`; `apps/web/src/app/business-actions.ts` | **OWNER VISUAL EDIT TARGET** — physical-card inventory table and actions. |
| `/admin/cards/[id]` | `apps/web/src/app/admin/cards/[id]/page.tsx` — `CardDetailPage` | `badge.tsx`, `qr-card.tsx`, `copy-url.tsx`, `confirm-submit.tsx`; `business-actions.ts` | **OWNER VISUAL EDIT TARGET** — card identity, status, QR, assignment, and destructive actions. |
| `/admin/cards/batches` | `apps/web/src/app/admin/cards/batches/page.tsx` — `CardBatchesPage` | `badge.tsx` | **OWNER VISUAL EDIT TARGET** — batch list and status badges. |
| `/admin/cards/batches/new` | `apps/web/src/app/admin/cards/batches/new/page.tsx` — `NewBatchPage` | card-token model `apps/web/src/lib/card-tokens.ts`; page-local form | **OWNER VISUAL EDIT TARGET** — batch creation form. |
| `/admin/cards/batches/[id]` | `apps/web/src/app/admin/cards/batches/[id]/page.tsx` — `BatchPage` | `badge.tsx`, `print-button.tsx`; `card-tokens.ts` | **OWNER VISUAL EDIT TARGET** — batch summary, cards, print actions. |
| `/admin/cards/unassigned` | `apps/web/src/app/admin/cards/unassigned/page.tsx` — `UnassignedTagsPage` | `badge.tsx` | **OWNER VISUAL EDIT TARGET** — unassigned tag list and status. |
| `/admin/countries` | `apps/web/src/app/admin/countries/page.tsx` — `CountriesPage` | `admin-ui.tsx`, `confirm-submit.tsx`; `apps/web/src/lib/country-catalog.ts` | **OWNER VISUAL EDIT TARGET** — searchable country availability table and bulk controls. |
| `/admin/integrations` | `apps/web/src/app/admin/integrations/page.tsx` — `AdminIntegrationsPage` | `apps/web/src/lib/connected-accounts.ts` | **OWNER VISUAL EDIT TARGET** — provider readiness/status cards. |
| `/admin/inventory` | `apps/web/src/app/admin/inventory/page.tsx` — `InventoryPage` | `apps/web/src/lib/inventory.ts`; `business-actions.ts` | **OWNER VISUAL EDIT TARGET** — inventory overview, stock, purchases, expenses, and suppliers. |
| `/admin/inventory/items` | `apps/web/src/app/admin/inventory/items/page.tsx` — default page component | page-local Prisma table/form | **OWNER VISUAL EDIT TARGET** — item catalog and quantities. |
| `/admin/inventory/batches` | `apps/web/src/app/admin/inventory/batches/page.tsx` — `InventoryBatchesPage` | page-local Prisma table | **OWNER VISUAL EDIT TARGET** — inventory batch history. |
| `/admin/inventory/low-stock` | `apps/web/src/app/admin/inventory/low-stock/page.tsx` — `LowStockPage` | page-local Prisma list | **OWNER VISUAL EDIT TARGET** — low-stock alerts and item rows. |
| `/admin/inventory/movements` | `apps/web/src/app/admin/inventory/movements/page.tsx` — `MovementsPage` | `business-actions.ts` | **OWNER VISUAL EDIT TARGET** — stock movement filters, table, and create action. |
| `/admin/legal` | `apps/web/src/app/admin/legal/page.tsx` — `LegalPage` | `admin-ui.tsx`, `legal-country-selector.tsx`; `apps/web/src/lib/legal-country-policy.ts` | **OWNER VISUAL EDIT TARGET** — policy versions, country scope, and publishing controls. |
| `/admin/limits` | `apps/web/src/app/admin/limits/page.tsx` — `LimitsPage` | page-local Prisma limits table | **OWNER VISUAL EDIT TARGET** — quota/limit configuration. |
| `/admin/link-platforms` | `apps/web/src/app/admin/link-platforms/page.tsx` — `LinkPlatformsPage` | `admin-ui.tsx`, `link-platform-admin-catalog.tsx` | **OWNER VISUAL EDIT TARGET** — platform catalog, icons, fields, and enablement. |
| `/admin/notifications` | `apps/web/src/app/admin/notifications/page.tsx` — `AdminNotificationsPage` | `admin-notification-composer.tsx`, `confirm-submit.tsx`; `apps/web/src/lib/admin-notifications.ts` | **OWNER VISUAL EDIT TARGET** — campaign list and notification composer. |
| `/admin/notifications/[id]` | `apps/web/src/app/admin/notifications/[id]/page.tsx` — `NotificationCampaignDetail` | `admin-ui.tsx`; `admin-notifications.ts` | **OWNER VISUAL EDIT TARGET** — campaign audience, delivery, and result detail. |
| `/admin/orders` | `apps/web/src/app/admin/orders/page.tsx` — `OrdersPage` | `badge.tsx`; commerce models `apps/web/src/lib/commerce.ts` | **OWNER VISUAL EDIT TARGET** — order filters, status, totals, and rows. |
| `/admin/orders/[id]` | `apps/web/src/app/admin/orders/[id]/page.tsx` — `OrderPage` | `badge.tsx`, `confirm-submit.tsx`; `apps/web/src/app/commerce-actions.ts`, `commerce.ts` | **OWNER VISUAL EDIT TARGET** — order detail and lifecycle actions. |
| `/admin/organizations` | `apps/web/src/app/admin/organizations/page.tsx` — `OrganizationsPage` | page-local Prisma table | **OWNER VISUAL EDIT TARGET** — organization list and summary data. |
| `/admin/plans` | `apps/web/src/app/admin/plans/page.tsx` — `PlansPage` | `admin-ui.tsx`, `confirm-submit.tsx`; `apps/web/src/app/actions.ts`; `apps/web/src/lib/plans.ts`, `plan-open-policy.ts` | **OWNER VISUAL EDIT TARGET** — plan cards/table, availability, and management actions. |
| `/admin/plans/new` | `apps/web/src/app/admin/plans/new/page.tsx` — `NewPlanPage` | `plan-form.tsx`; `plan-open-policy.ts` | **OWNER VISUAL EDIT TARGET** — new plan form. |
| `/admin/plans/[id]` | `apps/web/src/app/admin/plans/[id]/page.tsx` — `EditPlanPage` | `plan-form.tsx`; `plan-open-policy.ts` | **OWNER VISUAL EDIT TARGET** — plan details, limits, entitlement, and pricing form. |
| `/admin/platform-readiness` | `apps/web/src/app/admin/platform-readiness/page.tsx` — `PlatformReadinessPage` | `apps/web/src/lib/platform-readiness.ts` | **OWNER VISUAL EDIT TARGET** — provider/configuration readiness checks. |
| `/admin/reports` | `apps/web/src/app/admin/reports/page.tsx` — `ReportsPage` | `badge.tsx`; `apps/web/src/lib/friends-moderation.ts` | **OWNER VISUAL EDIT TARGET** — moderation report queue and filters. |
| `/admin/reports/[reportId]` | `apps/web/src/app/admin/reports/[reportId]/page.tsx` — `ReportPage` | `badge.tsx`; `apps/web/src/app/social-actions.ts` | **OWNER VISUAL EDIT TARGET** — content/profile report detail and action form. |
| `/admin/reports/users/[reportId]` | `apps/web/src/app/admin/reports/users/[reportId]/page.tsx` — `UserReportPage` | `badge.tsx`; `apps/web/src/app/moderation-actions.ts`; `friends-moderation.ts` | **OWNER VISUAL EDIT TARGET** — user report evidence and moderation actions. |
| `/admin/requests` | `apps/web/src/app/admin/requests/page.tsx` — `RequestsCenterPage` | `admin-ui.tsx`, `confirm-submit.tsx`; `commerce-actions.ts`, `quota-actions.ts`, `social-actions.ts`; `commerce.ts`, `plans.ts` | **OWNER VISUAL EDIT TARGET** — unified feature, limit, subscription, and social request center. |
| `/admin/resources` | `apps/web/src/app/admin/resources/page.tsx` — `AdminResourcesPage` | page-local resource links | **OWNER VISUAL EDIT TARGET** — operational resource cards. |
| `/admin/settings` | `apps/web/src/app/admin/settings/page.tsx` — `SettingsPage` | page-local settings form | **OWNER VISUAL EDIT TARGET** — admin portal settings. |
| `/admin/store` | `apps/web/src/app/admin/store/page.tsx` — `AdminStore` | page-local Prisma commerce data | **OWNER VISUAL EDIT TARGET** — store administration overview. |
| `/admin/tags` | `apps/web/src/app/admin/tags/page.tsx` — `AdminTagsPage` | `badge.tsx`; `apps/web/src/app/actions.ts` | **OWNER VISUAL EDIT TARGET** — NFC tag table and actions. |
| `/admin/templates` | `apps/web/src/app/admin/templates/page.tsx` — `TemplatesAdminPage` | `template-preview-card.tsx`; `apps/web/src/app/catalog-actions.ts`; `apps/web/src/lib/profile-templates.ts`, `figma-templates.ts` | **OWNER VISUAL EDIT TARGET** — template catalog, previews, plan metadata, and manage form. |
| `/admin/templates/preview/[slug]` | `apps/web/src/app/admin/templates/preview/[slug]/page.tsx` — `AdminTemplatePreview` | `admin-template-render-preview.tsx`; `profile-templates.ts` | **OWNER VISUAL EDIT TARGET** — full admin template preview controls and viewport. |
| `/admin/themes` | `apps/web/src/app/admin/themes/page.tsx` — `ThemesPage` | page-local Prisma theme data | **OWNER VISUAL EDIT TARGET** — theme inventory and configuration. |
| `/admin/transfers` | `apps/web/src/app/admin/transfers/page.tsx` — `AdminTransfersPage` | `badge.tsx`; page-local transfer data | **OWNER VISUAL EDIT TARGET** — ownership transfer list and status. |
| `/admin/translations` | `apps/web/src/app/admin/translations/page.tsx` — `TranslationsPage` | `apps/web/src/app/localization-actions.ts`; `apps/web/src/lib/localization-runtime.ts`, `localization-policy.ts`, `translation-editor.ts` | **OWNER VISUAL EDIT TARGET** — translation namespaces, editing form, and publish state. |
| `/admin/uploads` | `apps/web/src/app/admin/uploads/page.tsx` — `UploadsPage` | page-local Prisma upload data | **OWNER VISUAL EDIT TARGET** — upload inventory and metadata table. |
| `/admin/users` | `apps/web/src/app/admin/users/page.tsx` — `AdminUsersPage` | `admin-create-user-form.tsx`, `admin-ui.tsx` | **OWNER VISUAL EDIT TARGET** — user search/table and create-user form. |
| `/admin/users/[id]` | `apps/web/src/app/admin/users/[id]/page.tsx` — `AdminUserDetailPage` | `admin-ui.tsx`, `confirm-submit.tsx`, `destination-icon.tsx`, `profile-avatar.tsx`; `actions.ts`, `business-actions.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — user tabs, identity, profiles, links, sessions, roles, and actions. |
| `/admin/wallet` | `apps/web/src/app/admin/wallet/page.tsx` — `AdminWalletPage` | `badge.tsx`; `apps/web/src/lib/wallet.ts` | **OWNER VISUAL EDIT TARGET** — Wallet configuration/readiness checklist. |

### Current Dashboard pages (24)

| Route | Page file / function | Page-specific visual/state files | Class and visual control |
|---|---|---|---|
| `/dashboard` | `apps/web/src/app/dashboard/page.tsx` — `DashboardPage` | `apps/web/src/components/profile-home-editor.tsx` | **OWNER VISUAL EDIT TARGET** — customer overview and active-profile home editor. |
| `/dashboard/cards` | `apps/web/src/app/dashboard/cards/page.tsx` — `CardsPage` | `destination-icon.tsx`, `icon-selector.tsx`, `platform-link-capture.tsx`; `apps/web/src/app/actions.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — virtual profile/card destination editor. |
| `/dashboard/chats` | `apps/web/src/app/dashboard/chats/page.tsx` — `ChatsPage` | `apps/web/src/app/social-actions.ts` | **OWNER VISUAL EDIT TARGET** — conversation list and empty state. |
| `/dashboard/chats/[chatId]` | `apps/web/src/app/dashboard/chats/[chatId]/page.tsx` — `ChatPage` | `social-actions.ts`; page-local message form | **OWNER VISUAL EDIT TARGET** — message thread and composer. |
| `/dashboard/files` | `apps/web/src/app/dashboard/files/page.tsx` — `ContentPage` | `apps/web/src/app/content-actions.ts` | **OWNER VISUAL EDIT TARGET** — content/file list and controls. |
| `/dashboard/friends` | `apps/web/src/app/dashboard/friends/page.tsx` — `FriendsPage` | `apps/web/src/components/friends-center.tsx` | **OWNER VISUAL EDIT TARGET** — friends, requests, search, privacy, and blocks. |
| `/dashboard/integrations` | `apps/web/src/app/dashboard/integrations/page.tsx` — `IntegrationsPage` | `apps/web/src/components/connected-accounts.tsx`; `apps/web/src/lib/connected-accounts.ts` | **OWNER VISUAL EDIT TARGET** — connected-account provider cards and connect/disconnect state. |
| `/dashboard/menu` | `apps/web/src/app/dashboard/menu/page.tsx` — `MenuPage` | page-local navigation cards | **OWNER VISUAL EDIT TARGET** — customer menu links. |
| `/dashboard/nearby` | `apps/web/src/app/dashboard/nearby/page.tsx` — `NearbyPage` | `apps/web/src/components/nearby-center.tsx` | **OWNER VISUAL EDIT TARGET** — Nearby privacy, position, people, and report UI. |
| `/dashboard/plans` | `apps/web/src/app/dashboard/plans/page.tsx` — `UserPlansPage` | `badge.tsx`; `apps/web/src/app/commerce-actions.ts` | **OWNER VISUAL EDIT TARGET** — plan comparison and subscription/request actions. |
| `/dashboard/products` | `apps/web/src/app/dashboard/products/page.tsx` — `ProductsPage` | `apps/web/src/components/product-store.tsx`; `apps/web/src/lib/commerce.ts` | **OWNER VISUAL EDIT TARGET** — product catalog, cart/order controls. |
| `/dashboard/profile` | `apps/web/src/app/dashboard/profile/page.tsx` — `ProfilePage` | `image-field.tsx`, `theme-picker.tsx`, `profile-save-form.tsx`; `apps/web/src/app/actions.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — profile identity, media, links, fields, and theme form. |
| `/dashboard/profile/publish` | `apps/web/src/app/dashboard/profile/publish/page.tsx` — `PublishProfilePage` | `profile-publishing-client.tsx`; `apps/web/src/lib/profile-publishing.ts` | **OWNER VISUAL EDIT TARGET** — readiness issues and publish controls. |
| `/dashboard/profiles` | `apps/web/src/app/dashboard/profiles/page.tsx` — `ProfilesPage` | `apps/web/src/app/actions.ts`, `catalog-actions.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — profile list, create form, type, and active selection. |
| `/dashboard/settings` | `apps/web/src/app/dashboard/settings/page.tsx` — `SettingsPage` | `apps/web/src/components/settings-center.tsx` | **OWNER VISUAL EDIT TARGET** — settings landing cards. |
| `/dashboard/settings/[section]` | `apps/web/src/app/dashboard/settings/[section]/page.tsx` — `SettingsSectionPage` | `settings-center.tsx`; its client state calls `/api/settings`, `/api/security`, and `/api/mobile` endpoints | **OWNER VISUAL EDIT TARGET** — appearance, notifications, privacy, permissions, security, devices, sessions, passkeys, account, help, and legal sections. |
| `/dashboard/share` | `apps/web/src/app/dashboard/share/page.tsx` — `SharePage` | `apps/web/src/components/share-center.tsx` | **OWNER VISUAL EDIT TARGET** — profile selector, URL, QR, Web Share, and copy controls. |
| `/dashboard/tags` | `apps/web/src/app/dashboard/tags/page.tsx` — `TagsPage` | `badge.tsx`, `copy-url.tsx`, `qr-card.tsx`; `business-actions.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — assigned physical-tag list, URL, QR, and status. |
| `/dashboard/tags/[id]` | `apps/web/src/app/dashboard/tags/[id]/page.tsx` — `CardDetailPage` | `badge.tsx`, `copy-url.tsx`, `nfc-platform-actions.tsx`, `product-lost-button.tsx`, `qr-card.tsx`; `actions.ts`, `business-actions.ts` | **OWNER VISUAL EDIT TARGET** — tag detail, NFC actions, lost state, URL, and QR. |
| `/dashboard/templates` | `apps/web/src/app/dashboard/templates/page.tsx` — `TemplatesPage` | `template-preview-card.tsx`; `catalog-actions.ts`; `profile-templates.ts`, `figma-templates.ts`, `virtual-cards.ts`, `plans.ts` | **OWNER VISUAL EDIT TARGET** — per-profile template gallery, preview/apply/upgrade states. |
| `/dashboard/templates/preview/[templateId]` | `apps/web/src/app/dashboard/templates/preview/[templateId]/page.tsx` — `TemplatePreviewPage` | `public-profile.tsx`; `profile-publishing.ts` | **OWNER VISUAL EDIT TARGET** — live profile-renderer preview for a selected template. |
| `/dashboard/transfers` | `apps/web/src/app/dashboard/transfers/page.tsx` — `TransfersPage` | `badge.tsx`, `step-up-form.tsx`; `apps/web/src/app/transfer-actions.ts` | **OWNER VISUAL EDIT TARGET** — incoming/outgoing ownership transfers and verification. |
| `/dashboard/uploads` | `apps/web/src/app/dashboard/uploads/page.tsx` — `UploadsPage` | `apps/web/src/components/file-manager.tsx`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — upload picker, storage quota, file grid/list, and actions. |
| `/dashboard/wallet` | `apps/web/src/app/dashboard/wallet/page.tsx` — `WalletPage` | `apps/web/src/lib/wallet.ts`; `plans.ts` | **OWNER VISUAL EDIT TARGET** — Wallet pass status, eligibility, and actions. |

## 10. Web/Admin Shared Components

| Shared component/file | Changing this file affects |
|---|---|
| `apps/web/src/components/dashboard-shell.tsx` | Admin and dashboard sidebar, mobile navigation, header, account menu, and responsive shell. |
| `apps/web/src/app/admin/layout.tsx` | Every authenticated admin page and its access/layout boundary. |
| `apps/web/src/app/dashboard/layout.tsx` | Every authenticated customer dashboard page. |
| `apps/web/src/components/page-heading.tsx` | Titles, subtitles, and header actions across older admin/dashboard pages. |
| `apps/web/src/components/admin-ui.tsx` | New admin page headers, metrics, quick actions, status badges, identity cells, filters, search, empty states, and data tables. |
| `apps/web/src/components/badge.tsx` | Status labels across cards, tags, orders, reports, transfers, plans, ideas, and Wallet. |
| `apps/web/src/components/confirm-submit.tsx` | Confirmation controls for sensitive admin actions. |
| `apps/web/src/components/profile-avatar.tsx` | User/profile avatars in admin detail and related identity surfaces. |
| `apps/web/src/components/image-field.tsx` | Profile image/cover upload and preview fields. |
| `apps/web/src/components/icon-selector.tsx`, `apps/web/src/components/destination-icon.tsx`, `apps/web/src/components/destination-visual.tsx` | Destination/platform icon selection and rendering in profile/card editors. |
| `apps/web/src/components/qr-card.tsx`, `apps/web/src/components/copy-url.tsx` | QR and permanent/public URL blocks in admin, tags, and sharing. |
| `apps/web/src/components/step-up-dialog.tsx`, `apps/web/src/components/step-up-form.tsx` | Sensitive-action verification dialogs/forms. |
| `apps/web/src/components/plan-form.tsx`, `apps/web/src/components/profile-save-form.tsx` | Admin plan editing and customer profile-save feedback. |
| `apps/web/src/components/settings-center.tsx` | All customer settings sections, navigation, cards, switches, and empty states. |
| `apps/web/src/components/friends-center.tsx`, `apps/web/src/components/nearby-center.tsx` | Web friends and Nearby surfaces. |
| `apps/web/src/components/share-center.tsx`, `apps/web/src/components/profile-share-actions.tsx` | Dashboard and public-profile sharing actions. |
| `apps/web/src/components/file-manager.tsx` | Customer upload/file picker, list, quota, and delete states. |
| `apps/web/src/components/storefront.tsx`, `apps/web/src/components/storefront-order-actions.tsx`, `apps/web/src/components/product-store.tsx` | Public storefront, ordering actions, root catalog, and dashboard store. |
| `apps/web/src/components/managed-legal-page.tsx`, `apps/web/src/components/legal-consent-sheet.tsx`, `apps/web/src/components/legal-country-selector.tsx` | Public legal pages, onboarding consent, and admin legal country selection. |
| `apps/web/src/components/connected-accounts.tsx`, `apps/web/src/components/google-link-button.tsx` | Connected-account provider status and authorization actions. |
| `apps/web/src/components/template-preview-card.tsx`, `apps/web/src/components/admin-template-render-preview.tsx` | Admin/dashboard template thumbnails and full previews. |
| `apps/web/src/components/phone-entry-screen.tsx`, `apps/web/src/components/admin-login-form.tsx`, `apps/web/src/components/dynamic-onboarding-client.tsx`, `apps/web/src/components/initial-profile-bootstrap.tsx`, `apps/web/src/components/passkey-enrollment-prompt.tsx`, `apps/web/src/components/passkey-actions.tsx` | Web login and current conditional onboarding surfaces. |
| `apps/web/src/components/public-status.tsx`, `apps/web/src/components/public-tag-page.tsx` | Public unavailable/not-found profile states and public NFC/tag landing pages. |
| `apps/web/src/components/product-store.tsx`, `apps/web/src/components/product-lost-button.tsx`, `apps/web/src/components/nfc-platform-actions.tsx` | Product browsing and physical-tag/lost/NFC actions. |

## 11. Public Web / Template Renderer

The 24 current non-admin/non-dashboard page routes are listed here. All use the Web theme/localization baseline. Public profile data is projected by `apps/web/src/lib/profile-projection.ts`, `apps/web/src/lib/profile-publishing.ts`, `apps/web/src/lib/profile-public-fields.ts`, and `apps/web/src/lib/profile-data.ts`, with persistent models in `packages/db/prisma/schema.prisma`.

| Route | Page / main visual component | Direct model/state/support | Class and visual control |
|---|---|---|---|
| `/` | `apps/web/src/app/page.tsx` — `RootPage`; `apps/web/src/components/storefront.tsx` | `apps/web/src/lib/domains.ts`; commerce data | **OWNER VISUAL EDIT TARGET** — canonical public landing/storefront. |
| `/login` | `apps/web/src/app/login/page.tsx` — `LoginPage`; `phone-entry-screen.tsx` | `apps/web/src/lib/auth.ts`, `admin-access.ts`; Prisma user state | **OWNER VISUAL EDIT TARGET** — public phone/WhatsApp entry and authentication states. |
| `/onboarding` | `apps/web/src/app/onboarding/page.tsx` — `DynamicOnboardingPage`; `dynamic-onboarding-client.tsx` | `apps/web/src/lib/dynamic-onboarding.ts`; client `DynamicOnboardingState` | **OWNER VISUAL EDIT TARGET** — any active dynamic Web onboarding step. |
| `/onboarding/start` | `apps/web/src/app/onboarding/start/page.tsx` — `InitialOnboardingPage` | `legal-consent-sheet.tsx`, `initial-profile-bootstrap.tsx`, `passkey-enrollment-prompt.tsx`; `profile-bootstrap.ts`, `entry-flow-policy.ts` | **OWNER VISUAL EDIT TARGET** — legal, compatibility, initial profile, or passkey bootstrap state. |
| `/onboarding/passkey` | `apps/web/src/app/onboarding/passkey/page.tsx` — `PasskeyOnboarding`; `passkey-actions.tsx` | session and WebAuthn API state | **OWNER VISUAL EDIT TARGET** — standalone Web passkey enrollment. |
| `/p/[slug]` | `apps/web/src/app/p/[slug]/page.tsx` — `SlugProfilePage`; `apps/web/src/components/public-profile.tsx` — `PublicProfile` | projection/publishing/public-field files above; `friend-privacy.ts`, `profile-metadata.ts` | **OWNER VISUAL EDIT TARGET** — canonical slug profile rendering and audience-aware sections. |
| `/p/id/[profileId]` | `apps/web/src/app/p/id/[profileId]/page.tsx` — `IdProfilePage`; `public-profile.tsx` | same public profile chain | **OWNER VISUAL EDIT TARGET** — canonical ID-based profile rendering. |
| `/mobile-preview/[profileId]` | `apps/web/src/app/mobile-preview/[profileId]/page.tsx` — `MobileDraftPreviewPage`; `public-profile.tsx` | `apps/web/src/lib/mobile-auth.ts`, `mobile-draft-preview.ts` | **OWNER VISUAL EDIT TARGET** — authenticated Android draft/template preview. |
| `/[shortCode]` | `apps/web/src/app/[shortCode]/page.tsx` — `ShortCodePage`; `public-tag-page.tsx` | `apps/web/src/lib/tag-metadata.ts` | **OWNER VISUAL EDIT TARGET** — short-code NFC/tag landing and redirect/error state. |
| `/t/[token]` | `apps/web/src/app/t/[token]/page.tsx` — `LegacyTokenPage`; `public-tag-page.tsx` | `tag-metadata.ts` | **OWNER VISUAL EDIT TARGET** — still-routable token tag landing using the shared current renderer. |
| `/activate/scan` | `apps/web/src/app/activate/scan/page.tsx` — `ActivationScanPage`; `activation-scanner.tsx` | activation API client state | **OWNER VISUAL EDIT TARGET** — Web camera/manual activation scan. |
| `/activate/[token]` | `apps/web/src/app/activate/[token]/page.tsx` — `ActivationQrLanding` | `apps/web/src/lib/card-tokens.ts` | **OWNER VISUAL EDIT TARGET** — activation-token landing status and next action. |
| `/activate/card/[publicSlug]` | `apps/web/src/app/activate/card/[publicSlug]/page.tsx` — `CardActivationPage` | page-local card/claim state | **OWNER VISUAL EDIT TARGET** — card activation identity and sign-in/claim entry. |
| `/activate/card/[publicSlug]/phone` | `apps/web/src/app/activate/card/[publicSlug]/phone/page.tsx` — `ActivationPhonePage` | `apps/web/src/lib/activation-session.ts` | **OWNER VISUAL EDIT TARGET** — current Web phone-verification-unavailable notice. |
| `/activate/card/[publicSlug]/confirm` | `apps/web/src/app/activate/card/[publicSlug]/confirm/page.tsx` — `ConfirmClaimPage` | `activation-session.ts`; `apps/web/src/app/activation-actions.ts` | **OWNER VISUAL EDIT TARGET** — final card-claim confirmation. |
| `/product/[slug]` | `apps/web/src/app/product/[slug]/page.tsx` — `ProductPage` | Prisma product/order data | **OWNER VISUAL EDIT TARGET** — public product detail. |
| `/file/[slug]` | `apps/web/src/app/file/[slug]/page.tsx` — `PublicContentPage` | Prisma/public content metadata | **OWNER VISUAL EDIT TARGET** — public file/content landing. |
| `/download` | `apps/web/src/app/download/page.tsx` — `DownloadPage` | public APK environment metadata | **OWNER VISUAL EDIT TARGET** — Android download, version, size, checksum, and availability. |
| `/ideas` | `apps/web/src/app/ideas/page.tsx` — `IdeasPage` | `apps/web/src/app/social-actions.ts`; auth state; `badge.tsx` | **OWNER VISUAL EDIT TARGET** — idea/feature request list and submission. |
| `/nearby-privacy` | `apps/web/src/app/nearby-privacy/page.tsx` — `NearbyPrivacyPage` | localized static content | **OWNER VISUAL EDIT TARGET** — public Nearby privacy explanation. |
| `/community-guidelines` | `apps/web/src/app/community-guidelines/page.tsx` — `CommunityGuidelinesPage` | localized static content | **OWNER VISUAL EDIT TARGET** — community rules content. |
| `/terms` | `apps/web/src/app/terms/page.tsx` — `TermsPage`; `managed-legal-page.tsx` | published legal document data | **OWNER VISUAL EDIT TARGET** — current Terms document and unavailable state. |
| `/privacy` | `apps/web/src/app/privacy/page.tsx` — `PrivacyPage`; `managed-legal-page.tsx` | published legal document data | **OWNER VISUAL EDIT TARGET** — current Privacy document and unavailable state. |
| `/offline` | `apps/web/src/app/offline/page.tsx` — `OfflinePage` | service-worker/offline state | **OWNER VISUAL EDIT TARGET** — offline explanation and retry action. |

Global public failure surfaces are `apps/web/src/app/not-found.tsx` and `apps/web/src/app/error.tsx`; `apps/web/src/components/public-status.tsx` supplies profile unavailable/not-found states. Public profile sections, identity header, contact actions, links, services/products, branches, gallery, fields, files, friend action, and install/share actions are assembled by `apps/web/src/components/public-profile.tsx`. Template dispatch is in `apps/web/src/lib/profile-template-renderer.ts`; all families converge on `apps/web/src/components/profile-template-families/template-frame.tsx`. Public QR/share controls are `apps/web/src/components/qr-card.tsx` and `apps/web/src/components/profile-share-actions.tsx`.

## 12. All 17 Template Sources

All 17 approved variants are configured in `apps/web/src/lib/profile-templates.ts`. It controls slug, name, family, profile kind, minimum plan, supported modules, colors, radii, spacing, and layout flags. `apps/web/src/lib/profile-template-renderer.ts` chooses one of seven family components; `apps/web/src/components/profile-template-families/template-frame.tsx` draws the shared frame; `apps/web/src/components/public-profile.tsx` draws the actual profile sections; `apps/web/src/app/globals.css` supplies the shared template CSS. Preview fixture assets live in `apps/web/public/template-preview/` and are assembled by `apps/web/src/lib/template-preview-fixture.ts`.

| # | Approved template / kind / plan | Configuration source | Family implementation | Visual control |
|---:|---|---|---|---|
| 1 | `personal-sunrise` / PERSONAL / free | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/personal.tsx` | Warm minimal personal layout with start-aligned identity. |
| 2 | `professional-noir` / PERSONAL / personal | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/professional.tsx` | Dark split professional layout. |
| 3 | `professional-editorial` / PERSONAL / pro | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/professional.tsx` | Light editorial split layout. |
| 4 | `personal-rose-paper` / PERSONAL / free | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/personal.tsx` | Centered rose-paper personal layout. |
| 5 | `personal-lavender` / PERSONAL / personal | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/personal.tsx` | Lavender personal grid-link layout. |
| 6 | `personal-botanical` / PERSONAL / pro | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/personal.tsx` | Botanical start-aligned personal layout. |
| 7 | `business-horizon` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/business.tsx` | Wide split business layout with grid links. |
| 8 | `agency-idea-studio` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/agency.tsx` | Wide agency/studio layout. |
| 9 | `brand-bloom` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/brand.tsx` | Centered brand layout with banner cover. |
| 10 | `tech-link` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/tech.tsx` | Dark wide tech layout. |
| 11 | `store-first` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Green storefront with banner cover. |
| 12 | `store-lume` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Neutral minimal storefront. |
| 13 | `store-glowup` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Pink beauty storefront. |
| 14 | `store-nobletime` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Dark luxury storefront. |
| 15 | `store-stylehub` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Neutral fashion storefront. |
| 16 | `store-pawlove` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Green pet storefront. |
| 17 | `store-techzone` / BUSINESS / business | `apps/web/src/lib/profile-templates.ts` | `apps/web/src/components/profile-template-families/storefront.tsx` | Blue technology storefront. |

None of the 17 variants has a separate per-variant React file: the registry configuration plus its family component is the implementation.

## 13. Models / ViewModels / UI State Map

| Visual area | Screen → state → model → repository/API chain |
|---|---|
| Android launch | `LaunchExperience.kt` → `LaunchViewModel.kt` → `apps/mobile/foundation/src/commonMain/kotlin/com/popwam/mobile/foundation/launch/LaunchState.kt` → `AndroidLaunchStatePersistence.kt` / `LegacyLaunchStateMigration.kt`. |
| Android phone/OTP | `PhoneLoginScreen.kt` → `PhoneLoginViewModel.kt` / `PhoneLoginState` → `PhoneIdentity.kt` and DTOs in `data/api/Models.kt` → `SessionRepository.kt` / `AuthNetwork.kt`. |
| Android onboarding | `LoginOnboardingScreen.kt` → `AuthViewModel`, `AuthUiState`, `AuthSetupStage` in `AppViewModels.kt` → setup/template/profile DTOs in `data/api/Models.kt` → `AuthSetupRepository.kt`. |
| Android Home | `HomeScreen.kt` → `HomeViewModel.kt` → `HomeUiState`, `HomeProfile`, events/effects/destinations in `HomeContract.kt` → repository interface in `HomeViewModel.kt` / `LocalFirstRepository.kt`. |
| Android profiles | `ProfileScreens.kt`, `TemplateStorefrontEditors.kt` → `ProfilesViewModel.kt` → `ProfilesUiState`, `OwnedProfile`, `ProfileContent`, editor/service/location/media models in `ProfileContract.kt` → `LocalFirstRepository.kt` / `PopwamApi.kt`. |
| Android share | `ShareScreens.kt` → `ShareViewModel.kt` → `ShareUiState`, `CanonicalSharePayload`, NFC/HCE state in `ShareContract.kt` → `SharePlatform.kt`, NFC/HCE services, and `PopwamRepository.kt`. |
| Android settings/menu/social | `SecuritySettingsScreen.kt`, `MenuScreens.kt`, `FriendsScreen.kt`, `NearbyScreen.kt` → `MainViewModel` / `MainUiState` in `AppViewModels.kt` → DTOs `data/api/Models.kt` → `PopwamRepository.kt` / `PopwamApi.kt`. |
| Web Admin | each `apps/web/src/app/admin/**/page.tsx` server component → query/search params and page-local forms → `packages/db/prisma/schema.prisma` records → listed server actions or direct Prisma query. |
| Web Dashboard | each `apps/web/src/app/dashboard/**/page.tsx` → listed client component/page form state → Prisma domain plus `apps/web/src/lib/plans.ts`, `commerce.ts`, `wallet.ts`, or feature-specific lib → listed server action/API route. |
| Web settings/social | route page → `settings-center.tsx`, `friends-center.tsx`, or `nearby-center.tsx` client state → JSON response models declared in that component → `/api/settings`, `/api/security`, `/api/friends`, or `/api/nearby`. |
| Public profile/templates | public page → `public-profile.tsx` → public projection from `profile-projection.ts` / publishing rules from `profile-publishing.ts` → Prisma profile/card/link/service/location/file models; renderer → `profile-templates.ts` → family component → `template-frame.tsx`. |
| Web auth/onboarding | login/onboarding page → `phone-entry-screen.tsx`, `dynamic-onboarding-client.tsx`, `initial-profile-bootstrap.tsx`, or passkey components → client state types in those files → auth/onboarding API routes and `dynamic-onboarding.ts` / `profile-bootstrap.ts`. |

## 14. Visual Change Impact Map

| Change | Edit primarily | Also affects | Shared dependencies |
|---|---|---|---|
| Android onboarding step layout | `apps/android/app/src/main/java/com/popwam/pop/ui/auth/AuthStepLayout.kt` | Phone, OTP, legal, name, account type, first profile, template, passkey, biometric, completion | `Theme.kt`, Android string resources, logo resources. |
| Android bottom navigation | `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` | Home, My Profile, Menu | `PopNavigationIcons.kt`, `PopNavigationPolicy.kt`, approved nav PNGs, `Theme.kt`. |
| Android Home | `apps/android/app/src/main/java/com/popwam/pop/ui/home/HomeScreen.kt` | Search, completion, activity, profile picker | `HomeContract.kt`, `PopBrandedLoading.kt`, `PopVisuals.kt`, `Theme.kt`. |
| Android My Profile | `apps/android/app/src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt` | Profile list/view/editor sections/publish/switcher | `ProfileContract.kt`, `PopApprovedProfileComponents.kt`, approved profile PNGs, `PopFormLayout.kt`. |
| Android profile forms | `apps/android/app/src/main/java/com/popwam/pop/ui/components/PopFormLayout.kt` | Onboarding, profile creation, all profile editors, account and activation forms | `Theme.kt`, string resources. |
| Android templates/storefront editor | `apps/android/app/src/main/java/com/popwam/pop/ui/profile/TemplateStorefrontEditors.kt` | Template selection and services/products | `CompactTemplateCard.kt`, `DraftTemplatePreview.kt`, `ProfileContract.kt`. |
| Android share/QR/NFC/HCE | `apps/android/app/src/main/java/com/popwam/pop/ui/share/ShareScreens.kt` | Share center and panels | `ShareContract.kt`, approved share PNGs, NFC/HCE support files. |
| Android settings cards and rows | `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt` | All 16 settings sections plus step-up dialogs | `AppViewModels.kt`, `AppearanceStore.kt`, `BiometricSetupCard.kt`, `Theme.kt`. |
| Android global colors/type/shapes | `apps/android/app/src/main/java/com/popwam/pop/ui/theme/Theme.kt` | Every Compose surface | `apps/mobile/design-system/src/commonMain/kotlin/com/popwam/mobile/designsystem/PopTokens.kt`, `PopTypography.kt`, fonts. |
| Admin shell/sidebar/header | `apps/web/src/components/dashboard-shell.tsx`, `apps/web/src/app/admin/layout.tsx` | All 47 authenticated admin pages | `globals.css`, `tailwind.config.ts`, `i18n.ts`, locale JSON. |
| Admin tables/cards/filters | `apps/web/src/components/admin-ui.tsx` | Overview, users, requests, plans, templates, countries, legal, notifications, translations, account types | `globals.css`, `dashboard-shell.tsx`. |
| Dashboard shell/sidebar/header | `apps/web/src/components/dashboard-shell.tsx`, `apps/web/src/app/dashboard/layout.tsx` | All 24 dashboard pages | `globals.css`, Tailwind, locale files. |
| Web settings | `apps/web/src/components/settings-center.tsx` | Every `/dashboard/settings/*` section | `globals.css`, API response models within the component. |
| Public profile sections | `apps/web/src/components/public-profile.tsx` | Both canonical profile routes, mobile preview, dashboard template preview, all 17 templates | `template-frame.tsx`, `profile-projection.ts`, `globals.css`. |
| All approved template palettes/layouts | `apps/web/src/lib/profile-templates.ts` | All 17 public and preview variants | `profile-template-renderer.ts`, family components, `template-frame.tsx`, `globals.css`. |
| One template family | matching file under `apps/web/src/components/profile-template-families/` | Every template assigned to that family | `template-frame.tsx`, `profile-templates.ts`, `public-profile.tsx`. |
| Public/global Web styling | `apps/web/src/app/globals.css` | Every Web page and all template renderers | `tailwind.config.ts`, root/admin/dashboard layouts. |
| Web brand/card imagery | `apps/web/public/icons/`, `apps/web/public/brand/pop/`, `apps/web/public/template-preview/` | Shell branding, cards/store, and template previews | Components that reference the individual assets. |

## 15. Possibly Dead / Legacy Visual Files

These 30 items are excluded from current-screen/page counts. The 25 Web files are compatibility redirects with no current rendered UI; the five Android symbols have no call site outside their own definition. Files that merely contain a current component whose name starts with `Legacy` are not listed when the current navigation still calls that component.

| Path / symbol | Old purpose | Why it appears legacy | Current replacement |
|---|---|---|---|
| `apps/web/src/app/activate/page.tsx` | Activation landing | Unconditionally redirects | `/activate/scan`. |
| `apps/web/src/app/profile/[slug]/page.tsx` | Older canonical profile URL | Unconditionally redirects | `/p/[slug]`. |
| `apps/web/src/app/login/phone/page.tsx` | Separate phone login URL | Unconditionally redirects | `/login`. |
| `apps/web/src/app/admin/batches/page.tsx` | Older batch list URL | Unconditionally redirects | `/admin/cards/batches`. |
| `apps/web/src/app/admin/cards/new/page.tsx` | Single-card creation URL | Unconditionally redirects | `/admin/cards/batches/new?quantity=1`. |
| `apps/web/src/app/admin/customers/page.tsx` | Customer list | Unconditionally redirects | `/admin/users?customer=1`. |
| `apps/web/src/app/admin/expense-categories/page.tsx` | Expense-category page | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/expenses/page.tsx` | Expense list | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/expenses/new/page.tsx` | New expense form | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/feature-requests/page.tsx` | Feature-request queue | Unconditionally redirects | `/admin/requests?type=feature`. |
| `apps/web/src/app/admin/links/page.tsx` | Links-by-user page | Unconditionally redirects | `/admin/users` or `/admin/users/[id]?tab=links`. |
| `apps/web/src/app/admin/localization/page.tsx` | Older localization route | Unconditionally redirects | `/admin/translations`. |
| `apps/web/src/app/admin/orders/new/page.tsx` | New order page | Unconditionally redirects | `/admin/orders`. |
| `apps/web/src/app/admin/phone-countries/page.tsx` | Phone-country catalog | Unconditionally redirects | `/admin/countries`. |
| `apps/web/src/app/admin/profiles/page.tsx` | Separate admin profiles page | Unconditionally redirects | `/admin/users`. |
| `apps/web/src/app/admin/purchases/page.tsx` | Purchases page | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/purchases/new/page.tsx` | New purchase page | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/purchases/[id]/page.tsx` | Purchase detail | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/admin/quota-requests/page.tsx` | Quota request queue | Unconditionally redirects | `/admin/requests?type=limit`. |
| `apps/web/src/app/admin/security/page.tsx` | Separate admin security page | Unconditionally redirects | `/admin/users`. |
| `apps/web/src/app/admin/subscriptions/page.tsx` | Subscription request queue | Unconditionally redirects | `/admin/requests?type=subscription`. |
| `apps/web/src/app/admin/suppliers/page.tsx` | Suppliers page | Unconditionally redirects | `/admin/inventory`. |
| `apps/web/src/app/dashboard/appearance/page.tsx` | Standalone appearance page | Unconditionally redirects | `/dashboard/templates`. |
| `apps/web/src/app/dashboard/nfc/page.tsx` | Standalone NFC tools | Unconditionally redirects | `/dashboard/tags`. |
| `apps/web/src/app/dashboard/security/passkeys/page.tsx` | Older passkey route | Unconditionally redirects | `/dashboard/settings/passkeys`. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `PopBottomNavigationReviewScreen` | Isolated visual review wrapper | No call site outside its definition | `PopPrimaryNavigationBar` in the same file. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt` — `FutureHomeDestination` | Placeholder destination screen | No call site outside its definition | Current concrete routes in `FigmaMainNavigation`. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` — `LegacyActivation` / private `ActivationScreen` | Earlier activation UI | No call site outside the wrapper/definition | `ActivationScannerScreen` in `FigmaNavigation.kt` and `ShareActivationScreen` in `ui/share/ShareScreens.kt`. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt` — `LegacyNfcTools` / private `NfcToolsScreen` | Earlier combined NFC tools screen | No call site outside the wrapper/definition | Share NFC/HCE panels in `ui/share/ShareScreens.kt` plus current programming routes. |
| `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt` — `MenuSettingsReviewScreen` | Static settings review/sample surface | No call site outside its definition | `SecuritySettingsScreen` in the same file. |
