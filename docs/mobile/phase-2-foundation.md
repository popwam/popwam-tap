# Mobile foundation and host integration

Status: Phase 2 foundation. This document does not authorize Phase 3 feature work.

## Non-destructive module boundary

`apps/mobile/foundation` is a Kotlin Multiplatform library for non-UI contracts. It owns typed destinations, overlay coordination, persisted launch-state contracts, platform interfaces, authentication contract models, and dormant Ktor client infrastructure.

`apps/mobile/design-system` is a Compose Multiplatform library for approved visual tokens. It depends on `foundation` and owns semantic colors, identity styles, spacing, radius, elevation, typography rules, and explicit layout direction.

The existing `apps/android/app` remains the only Android application. It consumes both modules through a Gradle composite build. No second Android app, navigation host, repository, or feature state owner is introduced.

## Migration rules

1. Migrate one bounded feature at a time.
2. Assign an endpoint group to Ktor only when the corresponding Retrofit calls are removed from the production feature path.
3. Keep typed destinations in shared code and translate them to legacy route strings only at the temporary Android navigation boundary.
4. Give each migrated feature its own state owner; do not expand the existing `MainUiState`.
5. Remove legacy responsibility after replacement behavior, recovery paths, analytics, accessibility, and tests pass.
6. Never use biometric results as standalone remote identity proof.

## Approved visual authority

- Reference presentation: 393 × 852.
- English family: Montserrat.
- Arabic family: Cairo.
- Approved full-screen spacing takes precedence over the conflicting 360-wide Foundation grid.
- The stale `Core Components` section is not a component source of truth.
- Identity styles are Pulse, Mint, Violet, Coral, Solar, and Graphite.

The shared type-scale line heights and the non-Mint dark identity primaries are implementation assumptions because the approved screens do not define every semantic combination. They must be visually reviewed before a migrated feature is released.

## Profile Setup visual assumptions

No approved four-step Profile Setup frames exist. The development-only contract uses:

1. Basic Identity
2. About You
3. Location & Visibility
4. Review & Create

Assumed composition:

- Existing approved authentication/profile screen chrome
- 20-point horizontal content inset
- 24-point section spacing
- 16-point control radius
- 24-point primary-action radius
- Existing semantic colors and Montserrat/Cairo typography
- No new illustration, gradient, card style, or motion language

The proposed feature flag is `mobile.profileSetup.composedDesign`. It must default to disabled outside development until visual review.

## Android host integration

Phase 2 integration is deliberately narrow:

- `apps/android/settings.gradle.kts` includes the mobile build.
- `apps/android/app/build.gradle.kts` consumes the two local module coordinates.
- The existing `PopwamTheme` API remains intact.
- English typography changes from ABeeZee to the approved Montserrat variable font.
- Existing routes, screens, ViewModels, Retrofit repositories, SharedPreferences, and DataStore behavior remain active.

Future feature migrations can use shared `PopTheme` within the migrated feature boundary. Switching the complete legacy UI to the new type scale in one change is prohibited.

## iOS host integration plan

The iOS host must be created on macOS as a normal Xcode application target; Phase 2 does not create an unverifiable Xcode project from Windows.

The host will:

- Target iOS 16 or newer, subject to product confirmation.
- Embed one framework assembled from the shared mobile modules.
- Provide a `ComposeUIViewController` root for migrated shared screens.
- Keep Swift adapters for Universal Links, LocalAuthentication, AuthenticationServices passkeys, Keychain, Core NFC, system sharing, media saving, locale application, and lifecycle events.
- Use `https://pop.popwam.com` for Universal Links.
- Permit a custom scheme only in development builds.
- Store no raw biometric data and expose only local authorization outcomes to common code.

The first macOS integration checkpoint is a blank host rendering a design-system smoke screen in English and Arabic. It must not include a product feature.

## Rollback

Rollback requires no data or backend migration:

1. Remove the two composite dependencies from the Android app.
2. Remove the `includeBuild("../mobile")` block.
3. Restore the previous Android font mapping if the typography change itself must be rolled back.
4. Remove `apps/mobile`.

Because Phase 2 does not replace launch storage, routes, Retrofit endpoints, authentication, or feature state, rollback does not invalidate user data.

## Build commands

From the repository root on Windows:

```powershell
.\apps\android\gradlew.bat -p ..\mobile :foundation:testDebugUnitTest :design-system:testDebugUnitTest
.\apps\android\gradlew.bat -p ..\mobile :foundation:compileDebugKotlinAndroid :design-system:compileDebugKotlinAndroid
Push-Location apps\android
.\gradlew.bat testDebugUnitTest lintDebug assembleDebug
Pop-Location
```

The relative `-p ..\mobile` is intentional: the Gradle wrapper changes its working directory to `apps/android` before evaluating the project directory.

On macOS:

```bash
./apps/android/gradlew -p ../mobile :foundation:iosSimulatorArm64Test :design-system:iosSimulatorArm64Test
./apps/android/gradlew -p ../mobile :design-system:linkDebugFrameworkIosSimulatorArm64
```

The exact framework link task may change when the Xcode export module is added. The CI job must query `tasks` and pin the verified task name rather than silently skipping it.

