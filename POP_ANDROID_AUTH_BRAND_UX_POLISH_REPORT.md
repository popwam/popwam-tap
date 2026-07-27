# POP Android Auth Brand UX Polish

1. **Language root cause/fix:** English bootstrap only updated the locale when a stored language was invalid. It now always applies the resolved server-authoritative POP locale, so an Arabic device cannot override English-only POP.
2. **Night text:** resolver supplies identity-specific Day/Night title, body, muted, outline, selected and on-primary tokens; auth screens use Material semantic foregrounds.
3. **Theme model:** `PopIdentityPalette` provides full Day/Night palette capacity, composed through `PopwamTheme` and `LocalPopColors`.
4. **Theme picker:** existing AppearanceStore remains the sole persistence layer; settings style controls use it. (The country selector is a reusable ModalBottomSheet.)
5. **Auth visual flow:** login and OTP use a centered final vector logo without a top app bar; login is compact and phone-first.
6. **Splash:** fallback is the final tintable vector. Future asset integration point is `res/drawable-nodpi/pop_splash.gif`; no GIF was fabricated.
7. **Launcher:** adaptive foreground/background now use the new Pulse POP artwork, independent of runtime identity.
8. **Countries:** `PhoneCountryConfig` supports ISO, enabled state, display order and placeholder. The mobile policy filters to enabled records; safe fallback is Egypt, Saudi Arabia and UAE until remote admin configuration is supplied. The selector is a searchable bottom sheet and the entry is `[dial code] [national number]`.
9. **Auth:** passkey is a compact alternate action; no fake biometric route exists. OTP auto-submits at exactly six digits and Firebase automatic verification remains unchanged. The account-check card is now a compact bottom sheet. The prior apparent hang was after `AUTH_SETUP_RESOLVE`: READY was deliberately rewritten to `AUTHENTICATED_CHECKING`; resolved stages are now published.
10. **Typography/RTL:** Cairo is selected only from the POP RTL locale policy; ABeeZee is selected for English/LTR. Logo centering is independent of direction.
11. **Verification:** requested unit tests, debug assembly and lint were run. No emulator or install was used. APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`.

Remaining physical QA: fresh-install launcher cache refresh, English-only boot on an Arabic device, tall/short layout, remote country configuration wiring once its admin endpoint is available, Firebase success/exchange against a real environment, and Arabic after publication.
