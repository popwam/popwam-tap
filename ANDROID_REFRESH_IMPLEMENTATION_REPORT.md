# POP by POPWAM — Android UI/activation refresh

Date: 2026-07-18

## Implemented in connected Android navigation

- Replaced the legacy drawable launcher reference with adaptive `mipmap` icons for normal and round launchers, a black POP background, gold vector foreground, and Android 13 monochrome layer. Notification metadata uses the monochrome mark.
- Enabled edge-to-edge in `MainActivity`, transparent system bars, light/dark system-icon switching, safe drawing/navigation/IME insets, cutout support from API 27, and `adjustResize` for input screens.
- Added lightweight screen-aware backgrounds: animated abstract light Welcome, dark Home, template-accent-ready details, neutral forms, and motion reduction when system animator duration is disabled.
- Product activation and Scan open the camera scanner directly. The scanner has a framing overlay, low-cost scan-line animation, flash, front/back camera switching, Photo Picker QR import, permission denial/settings handling, and manual activation-code fallback. Manual state is `rememberSaveable` and LTR.
- Replaced the inline “How it works” text with a three-page swipeable modal. It includes Back/Next/Skip/Start, page count, RTL-aware navigation icons/swipe direction, illustrations, and a persisted “seen” preference. It is reopenable from Menu.
- Authenticated bottom navigation is now Home, Cards, Scan, Products, Menu. NFC Tools is not exposed.
- Home is connected to create card, activate/scan, virtual cards, products, activity and How It Works, and uses pull-to-refresh.
- Pull-to-refresh remains connected on Home, virtual cards, products, profiles, activity and links. Reload now rejects overlapping refresh requests and retains the previous lists while refreshing; snackbar feedback remains at the navigation root.
- Language remains available on Welcome, Login, every top-level authenticated screen, Menu and Settings. App locales remain `ar`/`en`; fields for phone/OTP/URL/serial/code remain LTR.

## Upload changes and limits

- Android now queries `OpenableColumns.DISPLAY_NAME/SIZE`, resolves MIME through `ContentResolver`, and reads `content://` through a bounded stream instead of using a filesystem path.
- Client limits match the current storage package defaults: 5 MiB for JPG/PNG/WebP images and 10 MiB for allowed files.
- Disallowed MIME and oversized input are rejected before multipart upload; unknown lengths are bounded while streaming.
- Reading progress is reflected in `MainUiState`; coroutine cancellation cancels the Retrofit call. HTTP 401/403/413/415 and generic server errors are mapped to distinct error codes.
- Added tests for JPG, PNG, WebP, oversized and disallowed MIME policy.

The upload was **not executed against R2**. No authenticated disposable account was available. The local `.env` currently resolves `R2_PUBLIC_BASE_URL` to `media.popwam.com`, while `.env.example` and `scripts/validate-production-env.mjs` expect `go.popwam.com`. The real `.env` and secrets were not changed. Before claiming upload readiness, deployment must choose one of:

1. proxy public R2 objects through `go.popwam.com`, preserving the two-domain policy; or
2. formally retain `media.popwam.com` and update the validator/domain specification together.

Therefore there is no real response code or uploaded URL to report, and profile/logo replacement/deletion and network-interruption cases are not claimed as runtime-passed.

## Runtime evidence

- Before icon reference: `docs/evidence/pop-restructure/android-welcome-ar-restart.png`
- [Adaptive launcher icon after](docs/evidence/android-refresh/launcher-after.png)
- [Welcome English, dynamic background and edge-to-edge](docs/evidence/android-refresh/welcome-en-edge-to-edge.png)
- [Welcome Arabic/RTL](docs/evidence/android-refresh/welcome-ar-edge-to-edge.png)
- [Scanner camera preview, overlay and manual code](docs/evidence/android-refresh/scanner-camera-code.png)
- [How It Works 1/3](docs/evidence/android-refresh/how-it-works-1.png)
- [How It Works 2/3](docs/evidence/android-refresh/how-it-works-2.png)
- [How It Works 3/3](docs/evidence/android-refresh/how-it-works-3.png)

The screenshots are from AVD `POPWAM_API35`. No physical Android device was connected, so camera behavior, HCE/NFC, launcher variations across OEMs, Recents rendering, notification rendering and performance on low-end hardware were **not tested on a real device**.

No authenticated Home screenshot was fabricated: there was no valid test account/session. Home is compiled and connected in `FigmaNavigation.kt`, but its runtime screenshot and gesture proof require an authorized test login.

## Relevant files changed

- `.env.example`
- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/api/Models.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/repository/AndroidUploadPolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopNavigationPolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopVisuals.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/QrScanner.kt`
- `apps/android/app/src/main/res/drawable/ic_launcher_background.xml`
- `apps/android/app/src/main/res/drawable/ic_launcher_foreground.xml`
- `apps/android/app/src/main/res/drawable/ic_launcher_monochrome.xml`
- `apps/android/app/src/main/res/mipmap-anydpi*/ic_launcher*.xml`
- `apps/android/app/src/main/res/values*/strings.xml`, `colors.xml`, `styles.xml`
- `apps/android/app/src/test/java/com/popwam/pop/data/repository/AndroidUploadPolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/ui/PopNavigationPolicyTest.kt`

## Verification

| Command/check | Result |
|---|---|
| `gradlew clean lintDebug testDebugUnitTest assembleDebug` | Initial combined run: tests and assemble passed; lint found two new API-placement issues |
| `gradlew lintDebug` after fixes | PASS |
| final `gradlew testDebugUnitTest assembleDebug` | PASS |
| APK install on emulator | PASS |
| camera preview on emulator | PASS; emulator virtual-scene camera only |
| English/Arabic locale switch | PASS |
| `pnpm db:generate` | PASS |
| `pnpm i18n:audit` | PASS: 239 Web keys, 284 Android keys, zero reported candidates |
| `pnpm lint` | PASS |
| `pnpm test` | PASS: 23 files, 120 tests |
| `pnpm build` / Web-only build | NOT PASSED in this run: `next build` remained waiting and hit the 10-minute limit twice; orphaned build processes were stopped |
| `git diff --check` | PASS; line-ending warnings only |

APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`  
SHA-256: `B0D8F62D9EF27AD2B9163BE825D7B5C6B15599764FBC61282426BE7F22B12771`

No commit or push was made. No migration was applied. No secret or real `.env` value was changed.
