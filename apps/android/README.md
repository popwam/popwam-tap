# POP by POPWAM Android

Native Android client for customer card management and authorized NFC programming. The app is part of this monorepo and uses the web service as its source of truth.

## Requirements

- Android Studio with JDK 17 and Android SDK 36
- Android 8.0 (API 26) or newer
- A physical NFC-capable Android device for tag writing, verification, read-only locking, and HCE tests
- A camera-capable device for live activation-QR scanning (QR image import is also supported)

NFC and HCE are optional hardware features, so the app can still be installed on devices without them. NFC tools explain when the feature is unavailable.

## Configuration

Create `apps/android/local.properties` locally; it is ignored by Git:

```properties
sdk.dir=C:\\Users\\YOUR_USER\\AppData\\Local\\Android\\Sdk
POPWAM_API_BASE_URL=https://pop.popwam.com/
POPWAM_PUBLIC_BASE_URL=https://go.popwam.com/
GOOGLE_WEB_CLIENT_ID=
```

`POPWAM_API_BASE_URL` must use HTTPS for release builds. Phone OTP and SMS providers are configured on the backend, not in the APK. Google login is optional and requires a matching backend OAuth configuration.

The app requests:

- `INTERNET` for the POPWAM API
- `CAMERA` at runtime for live QR scanning
- `NFC` for reading, writing, locking, and HCE

Access and refresh tokens are encrypted with an Android Keystore AES-GCM key before being stored through DataStore. OTP values are never persisted.

## Build and verification

From `apps/android` on Windows:

```powershell
.\gradlew.bat testDebugUnitTest
.\gradlew.bat lintDebug
.\gradlew.bat assembleDebug
.\gradlew.bat validateReleaseConfiguration
```

The debug APK is generated at:

`apps/android/app/build/outputs/apk/debug/app-debug.apk`

Release signing is deliberately external. Use Play App Signing or CI-provided signing secrets; do not commit keystores or passwords.

## NFC behavior

Programming writes one NDEF URI record only:

`https://go.popwam.com/{publicSlug}`

The app supports `Ndef` and, when the tag allows it, `NdefFormatable`. It checks capacity and write protection, reads the tag back, verifies the exact URI, and only then asks the backend to mark the card programmed. Activation tokens and private customer data are never written to the tag.

Read-only locking calls Android's `canMakeReadOnly()`/`makeReadOnly()` only after an exact read-back verification and a separate typed confirmation. Locking is normally permanent and may not be supported by every tag. Always test with disposable tags before production programming.

No physical tag family is claimed as tested by the automated suite. Validate the intended NTAG/other stock on real devices and record manufacturer, capacity, Android model, successful read-back, and permanent-lock behavior before release.

## HCE limitations

The optional `HostApduService` exposes the selected POPWAM URL as an NFC Forum Type 4 NDEF message. It is disabled by default and is not payment, EMV, banking, or access-control emulation. Compatibility varies by device vendor, NFC controller, reader, lock-screen state, and operating-system policy; physical-device testing is required.
