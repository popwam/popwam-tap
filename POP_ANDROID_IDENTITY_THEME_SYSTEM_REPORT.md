# POP Android Identity Theme System

## Architecture

Appearance and POP identity are independent, persisted values in `AppearanceStore`. `SYSTEM`, `LIGHT`, and `DARK` remain safe internal values while their UI labels are Auto, Day, and Night. Auto follows the system; Day and Night are explicit and never follow the device.

## Identities

The default is Pulse (`#1E5BFF` / `#60A5FA`). Built-in identities are Mint (`#0EA5A4` / `#2DD4BF`), Violet (`#7C3AED` / `#A78BFA`), Coral (`#F43F5E` / `#FB7185`), Solar (`#F59E0B` / `#FBBF24`), and Graphite (`#334155` / `#94A3B8`). POP Pro is defined (`#0EA5A4` / `#5EEAD4`) but is not offered as selectable because entitlement is not fabricated.

## Semantic colours and contrast

`PopwamTheme` resolves identity + appearance to Material colours and `LocalPopColors`: brand primary/accent, backgrounds, surfaces, readable foregrounds, outline, muted text, selected state, danger, success and warning. Night surfaces use near-white primary text and cool-gray muted text, independent of the identity. System-bar icon polarity follows the resolved surface.

## Logo and UI

The supplied POP SVG is retained as a tintable Android vector (`pop_logo.xml`). The resolver uses identity primary in Day and accent in Night (Graphite Night is `#CBD5E1`). Splash, language, appearance/style, and intro use a horizontally centered logo block. Appearance onboarding is responsive/scrollable and contains compact preview cards; settings uses the same store and offers Appearance plus POP Style.

## Persistence and typography

Appearance and identity are stored independently in local app preferences and are not cleared on logout. Pulse is used before a saved identity exists. Cairo remains Arabic-only and ABeeZee remains the Latin font; identity does not alter typography.

## Verification

Focused palette/logo tests were added in `PopIdentityThemeTest`. Requested Gradle test, debug APK, and lint commands were run with Firebase Android enabled. APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`.
