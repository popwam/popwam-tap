# POP Android Physical QA Fix

`AUTH_SETUP_RESOLVE` is `AuthViewModel.refreshSetup()`, calling `AuthSetupRepository.status()` → `GET /api/profile-bootstrap?locale={locale}`. The verified physical run reached POP session persistence; its `setup_unavailable` result is produced by `resolveAuthSetupStage()` when a successful bootstrap response reports `legalReady=false`, not by Firebase, OTP, token exchange, or token storage.

The duplicate calls were caused by both `exchangeFirebaseProof()` and `PopwamApp`'s authenticated `LaunchedEffect` calling `refreshSetup`. The composition trigger was removed and the ViewModel now has a single-flight guard. Debug logs now report the sanitized setup endpoint/outcome/account flags, response code/error where available, and exception type under `PopAuthRuntime`.

Appearance now directly presents only Auto, Day, and Night. Its POP Style section is one current-style selector; Pulse, Mint, Violet, Coral, Solar, and Graphite are in a `ModalBottomSheet`. Intro pages no longer place a POP logo above each illustration.

Verification commands run: `testDebugUnitTest`, `assembleDebug`, and `lintDebug` with Firebase Android enabled. APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`.
