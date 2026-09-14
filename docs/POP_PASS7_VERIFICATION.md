# PASS 7 — Clean onboarding, first profile, passkey, biometric and APK cleanup

> Current environment contract (2026-09-13): [POP_ENV_CONTRACT.md](POP_ENV_CONTRACT.md). This dated report is historical evidence; current Railway readiness and unresolved Meta/SMS, URL and signing-origin exceptions are recorded there.


Date: 2026-09-13. Repository: `E:\saas\popwam-tap`.

**IMPLEMENTED / CODE VERIFIED / AWAITING OWNER PHYSICAL ACCEPTANCE.** This is code, JVM, backend, build, APK and TEST-service verification. No physical visual or authenticator acceptance is claimed. The owner's earlier WhatsApp OTP physical acceptance is accepted as passed; the Evolution OTP architecture was preserved.

## Requested 31-point handoff

1. **Old architecture:** removed Android dynamic category onboarding, old category/type enums and selection state, questionnaire API adapters, the old shared welcome tour, its completion/version state and its destinations. A second, still reachable virtual-card creation wizard with PROFESSIONAL/CREATOR types was also removed; all its entry points now use canonical `profiles/create`. Profession content fields and real template families remain content, not account types.
2. **Deleted files:** the exact PASS 7 inventory is below. Prior auth-rebuild deletions already present in the dirty worktree are not attributed to this pass.
3. **Navigation:** welcome → phone → WhatsApp OTP → required legal agreement if missing → account name → PERSONAL/BUSINESS → first profile name/create → optional template/preview → optional passkey/biometric → ready → app. Existing unsaved language/theme launch preferences precede the auth flow; cached choices are preserved. Saved server checkpoints determine the resume point. Back preserves saved identity and selected kind.
4. **UI:** a shared gradient layout, official POP logo, decorative icon surfaces, cards, selected/locked states, progress, consistent primary buttons, separate phone and OTP screens, template visuals, security cards and completion card. The rest of the authenticated application was preserved.
5. **Account type:** only PERSONAL/BUSINESS. The server combines enabled account-type policy with plan entitlements; the client presents the returned availability. There is no fake billing route.
6. **First profile:** template/category metadata is no longer a prerequisite on Android or the server. Identity and profile names are separate. The server creates a draft with existing module defaults and virtual-card linkage; there is no automatic publishing. Additional-profile creation uses the same authoritative fallback, quotas and idempotent domain route.
7. **PERSONAL default:** resolves `personal-sunrise` through the existing approved registry. Missing seed metadata is upserted from that registry.
8. **BUSINESS default:** resolves `business-horizon` the same way, subject to BUSINESS entitlement. If an administrator has deactivated a canonical default, creation still succeeds with `templateId=null` and the existing renderer's registry fallback; the pass does not reactivate the admin row.
9. **Template choice:** happens after profile existence. Invalid, inactive, incompatible or plan-locked creation selections fall back safely. Optional catalog fetch/preview failure does not prevent continuing. Subsequent selection uses the existing revision-checked editor mutation; locked/inactive cards cannot submit a selection.
10. **Existing users:** a complete account with accepted legal documents and an existing profile enters the app. An account without a profile resumes creation when its identity/type are already known; only genuinely missing setup data is requested. Existing canonical profiles are not rewritten. A persisted TEMPLATE/SECURITY checkpoint resumes unfinished PASS 7 setup.
11. **Passkey architecture:** Android Credential Manager uses real WebAuthn JSON and the existing server stack. Server-owned challenge, public credential, ownership, transports and counter records remain authoritative. No proprietary passkey or client identity shortcut was added.
12. **Registration:** optional after verified login, using existing recent-authentication/step-up eligibility, platform creation and server verification. Skipping/canceling does not prevent onboarding. Only public credential material is persisted by POP.
13. **Login:** explicit passkey entry on the unauthenticated welcome screen (supported Android versions), assertion verification, then the normal POP session issuance pipeline. Wrong credential/owner, invalid signature/origin, expired/consumed challenge and stale counters are rejected.
14. **OTP fallback:** WhatsApp is explicit in phone/OTP copy. Passkey cancellation/failure keeps login available without automatically sending an OTP. Existing country availability, numeric six-digit input/paste, masked phone, resend cooldown, number change and legal display are preserved.
15. **Biometrics:** available during optional onboarding and from the existing Device Security settings for established accounts, without replaying onboarding. Uses optional `BiometricPrompt` with an Android Keystore authentication-per-use AES-GCM wrapping key. A random session encryption key is wrapped only after the successful CryptoObject operation. The encrypted session and wrapped key are written atomically; no normally decryptable duplicate session is retained. The unwrapped key stays in RAM and is cleared after 30 seconds in background and on logout. Strong fingerprint/face authenticators are supported; weak face and device PIN fallback are not enabled. No biometric data is received or stored by POP.
16. **Session validity:** cold start gates a biometric-protected record before exposing account UI. Unlock checks stored refresh recovery expiry and refreshes expired access tokens; server refresh rejection clears the session. Valid cached access does not force an extra network call. Temporary offline failures preserve bounded LocalFirst access, never beyond the recorded refresh deadline (legacy records use access expiry plus the existing 30-day recovery bound). Revocation is enforced by server requests/refresh; biometrics do not independently authenticate to the server. Invalidation/unavailability has explicit passkey/OTP recovery.
17. **LocalFirst:** existing encrypted private snapshots, account isolation, cache launch and revision authority remain. Completing setup triggers the existing account refresh; returning completed login avoids a second forced snapshot bootstrap. Biometric unlock of a complete installation does not request onboarding again. Android backup and cleartext traffic remain disabled.
18. **Backend:** narrow profile bootstrap/status/checkpoint changes; shared `resolveInitialTemplate`; quota/account-type enforcement; removal of the unused category-template compatibility helper; explicit WebAuthn `userHandle` ownership rejection. PATCH setup is authenticated and CSRF-protected. PASS 6 editor, products/services, storefront, publication and draft authority are retained.
19. **Prisma:** no new PASS 7 schema or migration. Existing `OnboardingProgress.data` and passkey/session records suffice. TEST predeploy found 33 migrations and **no pending migrations**. Production migration count remains 32, unchanged.
20. **Android tests:** 250 app JVM tests passed, plus 8 foundation and 13 shared onboarding JVM tests; zero failures/errors/skips. The focused auth/security set covers 54 tests (14 onboarding, 2 actual profile/catalog-resume view-model, 10 security operations, 17 phone/passkey login and 11 session tests). Default template truth is tested on the backend rather than duplicated in Android. No instrumentation was run.
21. **Backend tests:** 508 passed, 9 skipped across 97 files (96 passing files, one pre-existing opt-in database integration file skipped). Focused bootstrap/template/passkey coverage passed; new crypto tests use ephemeral ES256 keys, real COSE/CBOR registration and real assertion signatures, including wrong handle/origin, tampered signature, stale and zero counters. No private test key is persisted.
22. **Checks:** `pnpm lint` (workspace TypeScript plus Prisma checks), Prisma validate/generate, `pnpm build`, Android lint/debug/analysis builds and `git diff --check` passed. Android analysis uses R8/resource shrinking with debug signing and no Crashlytics mapping/symbol upload. Dependency deprecation warnings do not represent failed checks.
23. **APK audit:** ZIP compressed/uncompressed groups, native entries, largest entries, APK Analyzer defined package contributions, signer and manifest were inspected. The historical 47,782,724-byte APK is unavailable, so the cause of that historical increase cannot be proven. The available 53,480,757-byte baseline contains both real removable payload and 10,260,920 bytes of unreferenced ZIP gaps; these are reported separately from dependency savings.
24. **Dependencies:** removed the whole Material extended-icon catalog in favor of core plus 86 referenced upstream Apache-2.0 vectors. Removed unused Ktor core/content-negotiation/JSON/OkHttp/Darwin declarations, version-catalog aliases and the unreferenced factory/platform engines. Final debug dependency resolution has no Ktor, Firebase Auth, extended-icon catalog or phone-number-hint dependency. Credential Manager and biometric dependencies already existed. Gson/Retrofit/OkHttp, Coil, active serialization, analytics/messaging/crash reporting and scanner dependencies remain because they have callers.
25. **Resources:** removed seven old onboarding PNGs (5,297,098 packaged bytes), retired tour/questionnaire strings and 57 obsolete virtual-card-wizard strings in each of AR/EN. French did not contain those retired wizard keys. All 54 new PASS 7 strings exist in AR/EN/FR. Clean regeneration removed stale copies from Compose's generated asset cache; final debug/analysis APKs contain none of the seven images. Fonts, branding, template/content previews and scanner models remain.
26. **Before:** `artifacts/pass7/before-test-debug.apk`, 53,480,757 bytes = 53.480757 MB (decimal), SHA-256 `7f37ce0db7abb28544e76d269edc8b6494b067b25c91851a12baf64e62ff48a2`.
27. **After:** 29,644,975 bytes / 29.644975 MB
28. **Delta:** Reduced by **23,835,782 bytes / 23.835782 MB / 44.5689%**. The payload versus packaging breakdown below prevents attributing ZIP free-space reclamation to library removal.
29. **Owner APK:** `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\pop-pass7-test-debug.apk`, **29,644,975 bytes / 29.644975 MB**, SHA-256 `188c635440c5648f9d9685386d7ab96ec9627a02a0f29d082c573caf8f31b145`. Package `com.popwam.pop.debug`; versionName `0.0.12-debug`; versionCode `12`; minSdk 26 / targetSdk 36; arm64-v8a. API `https://popwam-auth-test-test.up.railway.app/`; public `https://popwam-public-test-test.up.railway.app/`. This is the APK for owner manual TEST acceptance.
30. **Physical checks:** still required; see the checklist below. No emulator, ADB, device, APK installation or instrumentation was used.
31. **Handoff:** `docs/POP_ADMIN_REBUILD_HANDOFF.md` section 20 and current status now record PASS 7 implementation/code verification, TEST deployment, APK and outstanding owner acceptance. No commit or subsequent Admin/Inventory pass was started.

## Exact PASS 7 file deletions

Paths are relative to the repository. Some files are replaced by more focused implementations rather than having their real content removed.

```text
apps/android/app/src/main/java/com/popwam/pop/data/auth/BiometricUnlockPolicy.kt
apps/android/app/src/main/java/com/popwam/pop/ui/DynamicOnboardingPolicy.kt
apps/android/app/src/main/java/com/popwam/pop/ui/DynamicOnboardingScreen.kt
apps/android/app/src/main/java/com/popwam/pop/ui/PasskeyOfferPolicy.kt
apps/android/app/src/main/java/com/popwam/pop/ui/VirtualCardFlow.kt
apps/android/app/src/test/java/com/popwam/pop/data/auth/BiometricUnlockPolicyTest.kt
apps/android/app/src/test/java/com/popwam/pop/ui/AuthSetupResolverTest.kt
apps/android/app/src/test/java/com/popwam/pop/ui/DynamicOnboardingPolicyTest.kt
apps/android/app/src/test/java/com/popwam/pop/ui/PasskeyOfferPolicyTest.kt
apps/android/app/src/test/java/com/popwam/pop/ui/ProfileBootstrapPolicyTest.kt
apps/mobile/foundation/src/androidMain/kotlin/com/popwam/mobile/foundation/network/PopPlatformEngine.android.kt
apps/mobile/foundation/src/commonMain/kotlin/com/popwam/mobile/foundation/network/PopHttpClientFactory.kt
apps/mobile/foundation/src/iosMain/kotlin/com/popwam/mobile/foundation/network/PopPlatformEngine.ios.kt
apps/mobile/onboarding/src/commonMain/kotlin/com/popwam/mobile/onboarding/WelcomeScreen.kt
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_all_in_one.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_get_started.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_personal_business_ar.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_personal_business_en.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_share_ar.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_share_en_left.png
apps/mobile/onboarding/src/commonMain/composeResources/drawable/onboarding_share_en_right.png
```

Also removed obsolete declarations from retained models, DTOs, view models, shared navigation and test files. `VirtualCardDetails.kt` retains the real card details/template preview portions of the removed wizard file. The backend web category-management/dynamic-questionnaire routes and schema have other Web/Admin callers; they were not deleted merely because Android no longer uses them. No Admin redesign or content-module deletion is included.

## Measured APK comparison

MB means 1,000,000 bytes. Raw debug and optimized APK sizes are separate; neither is a claimed Play Store download size. The analysis variant uses the same TEST endpoints, `.debug` package, arm64 ABI and debug certificate, with R8/resource shrinking and `isDebuggable=false`. Production signing/build behavior was not changed.

| Artifact | Bytes | Decimal MB | MiB | SHA-256 |
|---|---:|---:|---:|---|
| Before TEST debug | 53,480,757 | 53.480757 | 51.003224 | `7f37ce0db7abb28544e76d269edc8b6494b067b25c91851a12baf64e62ff48a2` |
| After TEST debug | 29,644,975 | 29.644975 | 28.271651 | `188c635440c5648f9d9685386d7ab96ec9627a02a0f29d082c573caf8f31b145` |
| Optimized TEST analysis | 12,333,102 | 12.333102 | 11.761763 | `81f269c4f50022d8480842f9306b21393dded013d488be9ecf46755bfd224229` |


| ZIP group | Before uncompressed | Before compressed | After uncompressed | After compressed | Analysis compressed |
|---|---:|---:|---:|---:|---:|
| META-INF | 74,036 | 26,966 | 73,753 | 26,736 | 26,781 |
| dex | 88,187,312 | 28,924,485 | 53,266,984 | 20,657,760 | 3,724,253 |
| lib | 5,004,616 | 5,004,616 | 5,004,616 | 5,004,616 | 5,004,616 |
| assets | 6,317,592 | 6,230,289 | 883,544 | 882,224 | 890,947 |
| res | 2,036,268 | 1,127,977 | 2,036,268 | 1,127,977 | 1,093,240 |
| other | 1,552,803 | 1,527,024 | 1,549,083 | 1,523,472 | 1,199,181 |
| com | 331,304 | 126,532 | 331,304 | 126,532 | 126,532 |
| kotlin | 51,125 | 12,053 | 51,125 | 12,053 | 12,053 |


Compressed ZIP payload fell from 42,979,942 to 29,402,913 bytes: **13,577,029 bytes of actual payload reduction**. The remaining **10,258,753 bytes** of total reduction come from ZIP layout/entry/signature overhead, primarily reclaiming incremental-build free space. Final debug unreferenced gaps are 4,096 bytes; optimized analysis gaps are 16,384 bytes (signing block). Final packaging was regenerated using Gradle; no manual unsigned APK rewriting was used. Library/icon/obsolete-code changes reduce DEX together, so their individual compressed savings are not falsely presented as independently additive. Seven PNG entries alone account for exactly 5,297,098 removed bytes.

Baseline APK Analyzer defined package code includes `androidx.compose.material.icons` 13,676,409 bytes / 23,529 defined methods, `io.ktor` 967,169 bytes / 9,208 methods, and `com.google.android.gms` 2,435,472 bytes / 22,722 methods. These package code-size metrics are not the same as compressed DEX file bytes and parent/child package values must not be added together. The final icon package and dependency report are recorded in the local artifacts.

Final icon package: **338,775 defined code bytes / 808 defined methods**. Ktor is absent from final defined packages as well as runtime dependency resolution. The large scanner/Google dependencies remain because their current features still use them.

Native ABI is unchanged: **arm64-v8a** only for this owner debug target. Native payload is 5,004,616 bytes: `libbarhopper_v3.so` 4,946,720; `libimage_processing_util_jni.so` 32,544; `libdatastore_shared_counter.so` 10,360; `libandroidx.graphics.path.so` 10,096; `libsurface_util_jni.so` 4,896. Scanner and supported-device behavior were preserved.

Largest baseline payloads were DEX entries (largest compressed 9,645,801 bytes), scanner native library, resource table (1,516,208 bytes), and the seven retired tour images. Cairo/Montserrat branding fonts and ML Kit models are legitimate retained assets. No Web visual-review captures were found packaged as Android assets.

## TEST deployment and smoke verification

- Isolated Railway project `a9d788a7-5ae7-414c-a1c5-fdac81b26227`, environment `ff94b952-4772-4675-905d-b36def679071`.
- Auth: `53d7b1f2-db34-4bbd-9b47-6b965c3aac84`, service `popwam-auth-test`, **SUCCESS**.
- Public: `449c5f7c-a236-4666-b1b7-a59ac7db176e`, service `popwam-public-test`, **SUCCESS**.
- Initial uploads `e7ed0ea5-2568-4c39-9eaf-1a427639b52f` / `7cd531cd-5d46-4a25-aea3-2c86b5a1cca9` failed before runtime because the ignored staging directory produced an empty archive. Moving the explicit allowlisted stage outside the repository fixed uploading; the succeeding deployments above supersede them.
- TEST database identity/isolation re-proved before deployment. No reset and no owner OTP automation.
- Both `/health` endpoints return 200. Auth passkey options return 200, the TEST RP ID and `userVerification=required`. GET/PATCH bootstrap with trusted origin but no session return 401; untrusted PATCH returns 403. Assetlinks matches `com.popwam.pop.debug` and the actual signer SHA-256 `DB:02:C1:E8:0A:FE:AD:CD:E0:A0:F5:7E:4B:2B:9D:F2:85:89:77:92:29:BB:BF:1B:16:12:7E:81:14:1C:E5:30`.
- Read-only production comparison returned `productionUnchanged=true`: deployment `59c18ff0-c958-494a-bdb5-70a8ad93daa7`, environment-variable fingerprint, user/profile fingerprints and migration fingerprints unchanged. No production deployment or migration occurred.

Finalization found one real packaged-resource issue: Android stripped unescaped JSON quotes from the generated `asset_statements` string. Only the Gradle resource escaping was corrected, followed by APK rebuild/packaging and direct parsing of the final compiled resource as JSON. The final include points to TEST assetlinks, whose live relations include `delegate_permission/common.get_login_creds`. Already-passed large test suites were not repeated for this resource-only correction.

## Static visual review and owner checklist

Source review confirms logical RTL/LTR layout, an auto-mirrored Back icon, 24dp horizontal/20dp vertical spacing with scrollable content, 56dp minimum main CTA height, safe drawing/IME padding, text labels, decorative icons with null descriptions, radio selection semantics for type cards, and localized back/progress/action copy. Names are bounded to 160 characters. Existing template registry names retain its AR/EN metadata fallback for French, while new interface copy is fully AR/EN/FR. No physical screenshot is claimed.

Owner should install the named TEST debug APK manually and verify:

1. Visual quality and hierarchy of each onboarding screen, including AR/EN/FR, RTL, long names, large fonts and TalkBack.
2. Keyboard/IME handling, small-screen scrolling and six-digit OTP paste.
3. PERSONAL first-profile creation with the default appearance; profile remains draft.
4. Entitled BUSINESS first-profile creation; unavailable BUSINESS remains locked.
5. Template skip/default behavior, including catalog/preview failure without blocking continuation.
6. Template selection, preview, locked selection rejection and preserved PASS 6 draft/revision/storefront behavior.
7. Passkey creation, skip/cancel and real device/provider acceptance of TEST RP association.
8. Returning passkey login.
9. Explicit WhatsApp OTP fallback after canceled/failed/unavailable passkey, including resend and number change.
10. Biometric enable or skip, both during setup and later through Device Security settings.
11. Biometric quick unlock on cold start and after the 30-second background grace period; real hardware Keystore behavior.
12. Biometric cancel/failure/unavailable/changed-enrollment fallback to passkey or OTP, including expired/revoked session recovery.
13. Logout/login and subsequent session restoration.
14. Existing-user onboarding skip; users without a profile resume only missing setup; Back/restart preserves saved checkpoints.

## Reproducing local verification

From the repository root in PowerShell (no installation or instrumentation):

```powershell
pnpm --filter @popwam/web test
pnpm lint
pnpm --filter @popwam/db prisma validate
pnpm --filter @popwam/db prisma generate
pnpm build
$env:POPWAM_API_BASE_URL='https://popwam-auth-test-test.up.railway.app/'
$env:POPWAM_PUBLIC_BASE_URL='https://popwam-public-test-test.up.railway.app/'
apps/android/gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleAnalysis :mobile:foundation:testDebugUnitTest :mobile:onboarding:testDebugUnitTest --max-workers=2 --console=plain
git diff --check
```

Gradle's incremental ZIP layout can accumulate free space and Compose resource copy outputs can retain deleted files. The reported owner APK was packaged from regenerated asset outputs and a fresh packaging task state; compare ZIP payload groups as well as raw file sizes when reproducing size measurements.

## Exact statuses

PASS 7 CODE COMPLETE: YES

OLD PROFILE-TYPE ARCHITECTURE DELETED: YES

ONE CLEAN PERSONAL/BUSINESS ONBOARDING: YES

FIRST PROFILE CREATION BLOCK REMOVED: YES

DEFAULT TEMPLATE FALLBACK WORKING: YES

MODERN STEP-BY-STEP UI IMPLEMENTED: YES

PASSKEY IMPLEMENTED: YES

BIOMETRIC QUICK UNLOCK IMPLEMENTED: YES

WHATSAPP OTP FALLBACK PRESERVED: YES

APK CLEANUP COMPLETE: YES

TEST BACKEND READY: YES

TEST APK READY FOR OWNER: YES

APK SIZE BEFORE: 53,480,757 bytes / 53.480757 MB

APK SIZE AFTER: 29,644,975 bytes / 29.644975 MB

PHYSICAL ACCEPTANCE: PENDING OWNER

Confirmed: NO OLD PROFILE-TYPE UI LEFT ACTIVE; NO FIREBASE PHONE AUTH; NO PASSKEY PRIVATE KEY STORED BY POP; NO BIOMETRIC DATA STORED BY POP; NO EMULATOR; NO ADB; NO PHYSICAL DEVICE; NO APK INSTALLED; NO PRODUCTION DEPLOYMENT; NO PRODUCTION MIGRATION; NO ADMIN CLEANUP; NO INVENTORY CLEANUP; NO COMMIT CREATED.

Evidence: local ignored `artifacts/pass7/` contains the preserved baseline, JSON size reports, APK Analyzer package reports, signer output, dependency tree, test/build/lint logs, TEST proof/smoke/deployment reports and production comparison. The shared worktree's pre-existing changes are preserved.
