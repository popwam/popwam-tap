# Mobile CI foundation plan

Status: plan only. Phase 2 does not select a hosted CI vendor or add signing credentials.

## Pull-request gates

### Linux or Windows Android lane

1. Set up JDK 17 and Android SDK 36.
2. Restore Gradle caches using wrapper, Kotlin, and build-file hashes.
3. Compile and test `apps/mobile/foundation` and `apps/mobile/design-system` for Android.
4. Run Android `testDebugUnitTest`.
5. Run Android `lintDebug`.
6. Run Android `assembleDebug`.
7. Upload unit-test, lint, and APK artifacts on failure; retain no secrets in artifacts.

### macOS KMP/iOS lane

1. Pin Xcode, macOS runner image, JDK 17, and CocoaPods versions.
2. Compile common, iOS device, and Apple-silicon simulator source sets.
3. Run iOS simulator Kotlin tests.
4. Link the debug iOS framework.
5. Once the host exists, run `xcodebuild build` and the iOS unit/UI test plan on a pinned simulator.
6. Verify Universal Link entitlements and the generated framework architecture.

### Web contract lane

1. Install dependencies with the locked pnpm version.
2. Generate Prisma client.
3. Run web tests that cover mobile authentication, passkeys, association files, and profile bootstrap.
4. Run localization audit.

## Main-branch and release additions

- Release Android lint/build with external signing configuration validation.
- iOS archive validation on macOS without exporting signing material to logs.
- Validate production `assetlinks.json` and `apple-app-site-association` against approved package, team, bundle, and certificate values.
- Verify `https://pop.popwam.com` is the only primary public-link domain.
- Add dependency and secret scanning after the CI provider is chosen.

## Secret boundaries

- Store signing keys, provisioning credentials, Firebase service credentials, and deployment tokens only in the CI secret store.
- Never expose them to pull requests from forks.
- Keep production signing in protected environments with required reviewers.
- Do not cache `local.properties`, keystores, provisioning profiles, `.env` files, or generated credential files.

## Required artifacts

- JUnit XML for common, Android, and iOS tests
- Android lint HTML/SARIF
- Debug APK for internal verification
- iOS simulator build log and test result bundle
- Dependency/version report for the two KMP modules

CI is considered foundationally complete only when the same pinned commands work locally and on hosted runners, failures are non-optional, and no job silently skips an unavailable iOS or Android target.

