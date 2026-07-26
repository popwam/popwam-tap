# 1. Root Cause

The unauthenticated root in `PopwamApp` initialized an internal entry state to `SPLASH`, then ran:

`LaunchedEffect(Unit) { delay(650); ... entry = LOGIN }`

That unconditional timer made phone authentication the effective first destination for every unauthenticated launch. The existing Welcome and How It Works code was therefore unreachable during ordinary first launch. There was no independent resolver or persisted completion state for language, appearance, or the product introduction.

The apparent Egypt-only country behavior had a different cause. The app already used libphonenumber's complete country metadata and defaulted from a previously saved choice, network country, device region, then Egypt. However, the UI placed the entire country list in a non-searchable dropdown attached to a full-width button. On the physical phone it presented Egypt as if it were fixed and did not provide the intended selection experience.

# 2. Old Startup Flow

The old effective flow was:

`Application/session initialization → Splash (650 ms) → Phone authentication → OTP → existing authenticated setup resolver`

Consequences:

- language was controlled only by an auth-screen toggle or later Settings;
- the current System appearance could render dark immediately;
- no explicit appearance decision existed;
- first-time product introduction was skipped;
- auth Terms and Privacy buttons opened trusted Web URLs in Custom Tabs;
- the country control was a large, non-searchable dropdown.

The post-auth `AuthSetupResolver` itself was not the cause and has not been duplicated or replaced.

# 3. New Startup Resolver

A new device-local `PreAuthStore` and pure `resolvePreAuthStage` policy now sit in front of the existing auth/setup flow:

1. missing/invalid language → `LANGUAGE`
2. missing/invalid appearance → `APPEARANCE`
3. `introVersionSeen` below the controlled current intro version → `INTRO`
4. otherwise → existing authentication flow

An already authenticated POP session resolves directly to the existing auth/setup path regardless of incomplete local first-launch state. A compatibility adoption then persists the current language, appearance, and intro version so a later logout or app update does not unexpectedly replay the slides.

The pre-auth state is never consulted as authentication, POP User, Profile, legal-consent, Firebase, session, or authorization authority.

# 4. Language Implementation

The first fresh-install surface is a dedicated full-screen Compose language chooser. It contains no phone, OTP, country, login, or Profile controls.

Supported first-launch locales are:

- Arabic (`ar`) — RTL
- English (`en`) — LTR
- French (`fr`) — LTR

The selected locale is written to the controlled `pop_pre_auth` preference and immediately applied through `AppCompatDelegate`. Startup reapplies that persisted choice before the Activity is created. Android's locale configuration now declares all three locales.

Arabic and English remain fully covered by the existing Android catalog and `pnpm i18n:audit`. This repair adds dedicated French translations for the complete first-launch, phone-authentication, country-picker, and native legal experience. Historical authenticated surfaces without French entries use Android's English fallback; a scoped `MissingTranslation` lint suppression is used instead of creating a false machine-copied French catalog.

The Phase H Settings appearance page also exposes French locally. The Phase H server enum currently contains only `SYSTEM`, `ENGLISH`, and `ARABIC`, so French remains device-local and is not sent as an unsupported server preference.

# 5. Appearance Implementation

The new Appearance screen reuses the existing Phase H `AppearanceStore` and `PopwamTheme`. No second theme system was introduced.

Choices remain:

- System
- Light
- Dark

The fresh Language and as-yet-unselected Appearance surfaces use a neutral light presentation rather than interpreting a dark device theme as the user's deliberate choice. Selecting an option previews it immediately inside the Appearance screen. **Continue** persists the selected mode in the existing `pop_appearance` store and marks the first-launch appearance step complete.

The selected theme then applies to Intro, Auth, native Terms/Privacy, and the existing app. System remains a valid explicit choice.

# 6. Intro Implementation

A full-screen, native Compose four-page POP introduction now follows Language and Appearance:

1. **Your world. One POP.** — identity, work, or business Profile
2. **Share your world.** — QR, NFC, trusted link, and compatible physical POP products
3. **Connect on your terms.** — only connections and discovery features the user chooses
4. **Ready to POP?** — continue into secure phone entry

It supports Next, Back, pager progress, large touch targets, localized copy, RTL/LTR, and the current theme. It does not advertise Messaging as available, claim continuous Nearby behavior, or overstate inactive features.

Completing the final page records `CURRENT_POP_INTRO_VERSION = 1`. Ordinary later launches do not replay it. The Auth screen's **How POP works** action reopens the same native presentation in help mode without changing authentication or resetting completion.

# 7. Country Picker Implementation

The existing libphonenumber dependency remains the metadata authority. No country list or dialing table was hand-maintained.

Tapping the country control now opens a full-screen native picker with:

- search by localized country name;
- search by two-letter region;
- search by dialing code;
- country name;
- ISO representation;
- dialing code;
- flag derived mechanically from ISO regional indicators;
- current-selection indicator.

Selecting a row immediately updates and locally remembers the country. Egypt remains a possible network/device/default fallback, but it is fully changeable and is not treated as citizenship.

# 8. Phone Normalization Behavior

The phone field remains national-number input. Before the existing OTP send method is called, Android now:

1. parses the entered value using libphonenumber and the selected region;
2. validates it for that region;
3. formats it as canonical E.164;
4. sends the normalized international number plus the selected `countryIso2` through the unchanged POP OTP contract.

Invalid values remain on the screen with localized validation copy. Existing Egyptian and Saudi national/international normalization tests continue to pass.

# 9. Internal Terms Implementation

The unauthenticated Terms action now routes to a native Compose Terms page. It has:

- native top bar/title;
- back navigation;
- scrollable localized body;
- current bundled public-notice label;
- explicit informational-versus-consent explanation;
- no WebView;
- no Custom Tab;
- no arbitrary URL.

When opened from the existing authenticated Phase C legal-consent screen, the native page also displays the server-supplied `LegalDocument.version`.

# 10. Internal Privacy Implementation

The unauthenticated Privacy action now routes to the corresponding native Compose Privacy page with the same safe navigation/content boundaries. Reading it requires no login and does not create consent.

Actual post-OTP consent remains server-authoritative. The Phase C required-document UI was updated to use the same native reader and display the required server version. The Phase H Settings legal actions now navigate to native Terms/Privacy routes as well.

# 11. Returning-User Compatibility

`resolvePreAuthStage` gives a meaningful authenticated POP session immediate precedence. Existing authenticated installations cannot be trapped behind the new Language, Appearance, or Intro screens during an update.

The subsequent compatibility adoption stores the current safe locale/theme and intro version only. It does not clear or rewrite tokens, User identity, Profile state, consent, bootstrap state, Firebase identity, or FCM state.

For an unauthenticated installation that has completed the versioned first-launch state, launch goes directly to phone/passkey entry without replay.

# 12. Passkey Compatibility

The existing Credential Manager/POP passkey authority is unchanged. On supported Android versions, **Continue with passkey** remains before the phone fallback on the Auth screen.

Passkey options still come from the existing POP server contract, assertions still return to the existing verification endpoint, and phone/OTP remains available. The selected pre-auth locale is now passed into post-auth setup refresh after either OTP or passkey success.

# 13. Local Persistence

`pop_pre_auth` contains only:

- `language`
- `appearance`
- `intro_version_seen`

Appearance mode itself continues to be persisted by the existing `AppearanceStore` in `pop_appearance`. The pre-auth appearance value records completion/compatibility and is not a second renderer.

No access token, refresh token, User/Profile ID, phone, OTP, Firebase UID, consent, or authentication flag is stored in the pre-auth preferences. Intro completion is controlled by intro-content version and is not reset when the APK version increments.

# 14. Fresh-Install Reset Method

The safest local reset is Android's normal app-data clear for the debug application ID:

```powershell
adb shell pm clear com.popwam.pop.debug
```

This clears all local debug-app data, including pre-auth state **and the local debug POP session**, so the next launch starts at Language Selection. It does not create a production backdoor and is not exposed in the UI.

The command was documented only and **was not executed**. Before running it, `adb devices -l` must show the intended phone in `device` state—not `offline`.

# 15. Android Tests

Final result: **25 suites / 115 tests passed; 0 failures, 0 errors, 0 skipped.**

New/updated coverage includes:

- fresh install → Language;
- Language → Appearance;
- Appearance → Intro;
- current intro complete → Auth;
- no ordinary intro replay;
- deliberate future intro-version behavior;
- authenticated-user bypass safety;
- Arabic RTL;
- English/French LTR;
- explicit locale persistence contract;
- existing AppearanceStore persistence/reuse;
- complete libphonenumber metadata;
- country search by name/ISO/code;
- country flag derivation;
- Egyptian/Saudi E.164 normalization;
- native Terms and Privacy destinations;
- How POP works reopening;
- absence of WebView/Custom Tabs from auth legal navigation;
- absence of the old delayed login jump;
- passkey-before-phone and phone-fallback preservation.

# 16. Build / Lint Results

- `testDebugUnitTest -Ppopwam.firebase.android.enabled=true`: **PASS**
- `assembleDebug -Ppopwam.firebase.android.enabled=true`: **PASS**
- `lintDebug -Ppopwam.firebase.android.enabled=true`: **PASS — 0 errors, 104 warnings**
- `pnpm i18n:audit`: **PASS — 710 Android English/Arabic keys, 0 hardcoded candidates**

The remaining Android lint warnings are non-blocking repository deprecations, resource suggestions, and existing implementation advisories. No lint baseline was created.

Generated APK:

`E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\app-debug.apk`

Final size: 54,316,285 bytes.

The APK was **not installed automatically**.

# 17. Files Changed

Runtime implementation:

- `apps/android/app/src/main/java/com/popwam/pop/MainActivity.kt`
- `apps/android/app/src/main/java/com/popwam/pop/TapApplication.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PreAuthExperience.kt` — new
- `apps/android/app/src/main/java/com/popwam/pop/ui/PopwamApp.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/LocalePolicy.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/AppViewModels.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/FigmaNavigation.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/PhaseCSetupScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt`
- `apps/android/app/src/main/java/com/popwam/pop/data/auth/PhoneIdentity.kt`

Resources:

- `apps/android/app/src/main/res/xml/locales_config.xml`
- `apps/android/app/src/main/res/values/strings.xml`
- `apps/android/app/src/main/res/values-ar/strings.xml`
- `apps/android/app/src/main/res/values-fr/strings.xml` — new

Tests:

- `apps/android/app/src/test/java/com/popwam/pop/ui/PreAuthExperiencePolicyTest.kt` — new
- `apps/android/app/src/test/java/com/popwam/pop/ui/FirstLaunchAndroidContractTest.kt` — new
- `apps/android/app/src/test/java/com/popwam/pop/ui/LocalePolicyTest.kt`
- `apps/android/app/src/test/java/com/popwam/pop/data/auth/PhoneIdentityTest.kt`

# 18. Remaining Runtime Items

The physical phone could not be used for final runtime verification. It first appeared as the sole endpoint:

`192.168.1.33:36447  offline  model:moto_g85_5G`

An ADB connection refresh was attempted, but it remained offline and subsequently disappeared from `adb devices -l`. Therefore:

- no APK was installed;
- the app was not launched;
- app data was not cleared;
- no screenshot or physical flow assertion was made.

Once the phone is reconnected and authorized, the manual sequence should be:

1. verify `adb devices -l` shows exactly the Moto G85 in `device` state;
2. manually install the reported debug APK when explicitly approved;
3. run `adb shell pm clear com.popwam.pop.debug`;
4. launch and verify Language → Appearance → Intro → Auth;
5. verify Arabic RTL, French/English LTR, System/Light/Dark, country search/selection, internal Terms/Privacy, keyboard behavior, and screen fit;
6. verify a completed intro does not replay;
7. verify returning passkey and existing post-auth setup remain intact.

No deploy, push, commit, Git add, migration, Railway, production database, Firebase Console, Meta, emulator, AVD, or QEMU operation occurred.
