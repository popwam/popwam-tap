# PASS 7A — OWNER ACCEPTANCE CORRECTIONS

Date: 2026-09-14  
Status: **IMPLEMENTED / BUILT / READY FOR OWNER RETEST / PHYSICAL ACCEPTANCE PENDING**

## Implemented corrections

- Reworked phone login and onboarding into compact, scrollable, IME-safe steps with smaller branding, controls and account-type cards. Arabic keeps native RTL layout while phone, OTP and URL values remain LTR.
- Enabled PERSONAL and BUSINESS for all four active plans in the isolated TEST database. All 17 approved active templates are available to TEST accounts, including newly registered accounts.
- Replaced the tall template picker with a fixed two-column compact card grid, selected/locked state, explicit preview where available, Save and keep-default actions.
- Kept Credential Manager/WebAuthn and POP sessions intact. Mobile registration now requests a platform authenticator with ES256/RS256, accepts that attachment in Android validation, uses a non-internal account label, and maps cancellation, unsupported provider, missing credential, network, re-authentication and generic failures to user-facing AR/EN/FR messages.
- Removed the obsolete public-profile Appearance editor entry, state, mutation and Android resources. Template selection is the profile appearance authority. The app light/dark theme setting remains.
- Retained the PERSONAL Profession field as optional profile content and relabeled its unset value; it does not control account type, plan or template access.
- Removed the dead Verification editor entry/screen and its Android resources. Existing backend verification evidence/badges were not destroyed.
- Hid generated `@auth.popwam.invalid` identity values and removed account engineering/status copy.
- Added a dedicated draft Publish screen: incomplete drafts show readiness blockers and Edit; ready drafts publish/resume; published profiles proceed to Share.
- Centralized Android public profile URLs on `BuildConfig.PUBLIC_BASE_URL`; API/login/deep-link hosts remain on `BuildConfig.API_BASE_URL`. The final APK contains only the isolated TEST API/public origins in BuildConfig.

## TEST configuration and deployment

- Entitlement readback: 4 active plans; PERSONAL/BUSINESS enabled; 17 approved templates active and available; Production untouched.
- TEST API deployment `818d14eb-6e07-433f-a786-03eeaf45297d`: **SUCCESS**.
- TEST Public deployment `fc4a86bc-d594-4b04-abe1-0ad98a22f30a`: **SUCCESS**.
- API health **200**; Public health **200**.
- TEST Digital Asset Links **200** and contains `com.popwam.pop.debug`, debug certificate SHA-256 `DB:02:C1:E8:0A:FE:AD:CD:E0:A0:F5:7E:4B:2B:9D:F2:85:89:77:92:29:BB:BF:1B:16:12:7E:81:14:1C:E5:30`, and `delegate_permission/common.get_login_creds`.
- Production deployment remains the pre-existing `1d2bead1-14a3-4168-8f63-cba891551669` (**SUCCESS**, created before PASS 7A). No Production deployment, variable, secret, data or migration operation occurred.

## Build-only verification

No automated test suite was run, as required by the owner. Android `compileDebugKotlin` and final `assembleDebug` succeeded. Necessary TypeScript compile and the Web production build required for TEST deployment succeeded. `git diff --check` is clean.

The actual APK reports package `com.popwam.pop.debug`, versionName `0.0.12-debug`, versionCode `12`, minSdk 26, targetSdk 36 and arm64-v8a. APK Signature Scheme v2 verification succeeds with one Android Debug signer. DEX inspection confirms API `https://popwam-auth-test-test.up.railway.app/` and public origin `https://popwam-public-test-test.up.railway.app/`. Packaged resources contain no old profile Appearance resources, dead Verification resources or removed account engineering copy.

Final APK: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\pop-pass7a-test-debug.apk`  
Size: **31,151,376 bytes** (**31.151376 MB decimal; 29.708267 MiB**)  
SHA-256: **580a794387562cef399a01e19294e38590c314c2453efc38ad8af7ccb31ad021**

## Owner physical retest

- Compact onboarding visual quality, small-screen scrolling, keyboard/IME and Arabic RTL.
- PERSONAL and BUSINESS first-profile creation, default/skip behavior, all template selection and preview.
- Passkey creation and returning login on the intended device/provider, including cancel/failure fallback to WhatsApp.
- Draft blockers, publish/resume, published Share, and TEST public links.
- Account generated-email hiding and existing-user onboarding skip.

No emulator, ADB, device or APK installation was used. No Production deployment/database/migration, Inventory work, Admin Account Types work or commit was performed.
