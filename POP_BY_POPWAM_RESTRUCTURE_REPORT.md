# POP by POPWAM — implementation report

Date: 2026-07-18  
Figma source: `C:\Users\POPWAM\Downloads\Untitled (2).fig`  
Figma SHA-256: `362E968409A45550888C52504A83895EC19C63B277EE022118C74B58EE07E439`

## Scope verified from the Figma file

The file was parsed directly; the previous audit text was not used as a visual substitute. It contains two canvases and 16 frame nodes, of which five are top-level source frames. It contains no application screens, forms, mobile flows, prototype links, components, variants, shared styles, or empty/error/loading states. Consequently, only the identity and card artwork below can be described as Figma-exact. Application flows were implemented from the functional requirements using real application components and APIs.

| Figma frame | Size | Purpose | Web mapping | Android mapping |
|---|---:|---|---|---|
| `0:4 logo` | 1035×1035 | POP logo/form | `apps/web/public/brand/pop/logo-form.svg` and `.png` | `drawable-nodpi/pop_logo_form.png`, launcher treatment |
| `0:12 03_landscape_front 1` | 1016×638 | landscape card front | `card-landscape-front.svg/.png`, `pop-landscape` template and app landing | `pop_card_landscape_front.png`, welcome and card preview |
| `0:39 04_landscape_back 1` | 1016×638 | landscape card back/QR | `card-landscape-back.svg/.png`, public template back | `pop_card_landscape_back.png` |
| `0:64 01_portrait_front 1` | 600×900 | portrait card front | `card-portrait-front.svg/.png`, `pop-portrait` template and app landing | `pop_card_portrait_front.png` |
| `0:91 02_portrait_back 1` | 600×900 | portrait card back/QR | `card-portrait-back.svg/.png`, public template back | `pop_card_portrait_back.png` |

The complete machine-readable node inventory, including all 11 nested frames, text, geometry, paints and child nodes, is in `docs/evidence/figma-2-reference/inventory.json`. Exported source evidence is in `docs/evidence/figma-2-reference/`.

## Implemented

### Product identity, package, and domains

- Product name is `POP by POPWAM`; version is `0.0.12` on Web and Android.
- Android namespace/applicationId is `com.popwam.pop`; source and test packages were moved to the matching folder. Manifest, FileProvider, deep links, ProGuard references, labels, resources, tests and documentation were updated.
- This package-name change is intentionally documented in the root and Android READMEs: Google Play treats `com.popwam.pop` as a new app unless that was the originally published applicationId. It cannot silently upgrade an app published under a different package.
- New links use only `pop.popwam.com` for application/auth/admin/API and `go.popwam.com` for public/store/card/profile/file content.
- Middleware centralizes host routing and canonical redirects. Legacy `app.popwam.com` and `tap.popwam.com` remain only as recognized redirect inputs and in regression tests; no new destination is generated on either host.
- QR, NFC, public card URLs, manifest links, environment examples and Wallet URL generation use the two-host policy.

### Web

- `go.popwam.com/` is a real database-backed store root with an honest empty state; no demo product is fabricated. Product details are served at `/product/{slug}` and a local cart can create the existing purchase-request path.
- `pop.popwam.com/` is the application landing page and uses the extracted Figma portrait artwork.
- Added additive catalog models and admin management for categories/products, variants, images, inventory, prices, features, media and slugs.
- Added Content Entry semantics separate from uploaded assets, explicit publication to a card, and normalized per-user duplicate-name rejection. Arabic variants such as `أعمال`, ` الأعمال ` and `اعمال` collide by policy.
- Added public `/file/{slug}` and canonical `/profile/{slug}` routing.
- Added six shared plan themes with exact supplied tokens and server-side template-plan gating.
- Added the Figma `pop-landscape` and `pop-portrait` templates with distinct front/back assets and public render configurations; changing these templates changes the actual preview/public layout.
- Added user-owned product labels, serial masking, physical-product status transitions and audit/history recording.
- Added privacy preference API for activity identity consent, nearby opt-in/expiry/audience and owned default-sharing card.
- Added current/all-device session revocation endpoints; sidebar exposes version and logout-all.
- Google Wallet remains conditional: user UI is absent when configuration is unavailable; admin receives setup status.

### Android

- Authenticated navigation is Home, Virtual Cards, My Products, Activity and Menu. NFC Tools is not a public destination; NFC activation/writing/HCE internals remain contextual.
- Home uses compact create/activate/scan actions. Product activation is also available through a haptic FAB and bottom sheet.
- Pull-to-refresh is used on connected Home/cards/profiles/links/activity surfaces; fixed refresh is retained only for retry semantics.
- Physical products show user labels, type/status, masked serial and destination.
- One local `activeHceVirtualCardId` is maintained. Selecting another card replaces it, unsupported hardware is explained, and the payload is the permanent `go.popwam.com` URL. This remains experimental until verified on physical HCE hardware; no iPhone claim is made.
- English/Arabic changes are immediate through text buttons (`ع`/`EN`), Android 13 supported locales are declared, RTL/LTR is recreated correctly, and the selected locale persists after force-stop/reopen. Phone/OTP fields remain LTR.
- The login screen, menu and application surfaces show version `0.0.12` without secrets.
- Figma card art is a local image asset inside real Compose controls; no full-screen screenshot is used as an interface.

### Database and safe scripts

- Added an additive Prisma migration at `packages/db/prisma/migrations/20260718120000_pop_product_content_social/migration.sql`.
- Added an idempotent draft-only backfill at `packages/db/prisma/backfill-pop-upgrade.ts`. It creates no stock and publishes no products.
- The migration and backfill were **not applied** to Neon or any database.
- No existing data was deleted and no environment secret was changed.

## Runtime evidence

- [Web application root](docs/evidence/pop-restructure/web-app-pop-root.png)
- [Web public store root](docs/evidence/pop-restructure/web-store-go-root.png)
- [Android English/Figma card](docs/evidence/pop-restructure/android-final-en.png)
- [Android Arabic/RTL after UI toggle](docs/evidence/pop-restructure/android-final-ar.png)
- [Android Arabic after force-stop and reopen](docs/evidence/pop-restructure/android-final-ar-reopened.png)
- [Earlier pre-Figma-card Android state](docs/evidence/pop-restructure/android-welcome-en.png)

The web screenshots were captured from the production build served locally with `Host: pop.popwam.com` and `Host: go.popwam.com`. The Android screenshots were captured from the installed debug APK on AVD `POPWAM_API35`, not from Figma.

## Verification results

| Verification | Result |
|---|---|
| `pnpm db:generate` | PASS; Prisma schema formatted and validated |
| `pnpm i18n:audit` | PASS; 239 Web keys, 258 Android keys, zero reported hardcoded/unused candidates |
| Web type/lint | PASS |
| Web tests | PASS; 23 files, 120 tests |
| Web production build | PASS; 103 routes/pages generated |
| `git diff --check` | PASS; only line-ending notices |
| Android `testDebugUnitTest` | PASS |
| Android `lintDebug` | PASS; report at `apps/android/app/build/reports/lint-results-debug.html` |
| Android `assembleDebug` | PASS |
| APK install | PASS on emulator as `com.popwam.pop.debug` |
| Language toggle | PASS from UI; system locale became `ar` |
| Language persistence | PASS after force-stop/reopen; system locale remained `ar` |
| Store root | PASS, HTTP 200 on `go.popwam.com`; empty because no migration/seed was applied |
| App root | PASS, HTTP 200 on `pop.popwam.com` |

APK: `apps/android/app/build/outputs/apk/debug/app-debug.apk`  
APK SHA-256: `1CCBB8E7D267810EE3465518113B6CE0192C720F3606FC4C2ABEE0CEFF987181`

## Tests added or extended

- Domain routing, legacy host redirects, store/app root selection and public host generation.
- Figma template asset/configuration and plan gating.
- Exact six-theme token set.
- Virtual-card/product labeling and serial/status rules.
- Arabic normalized content-name collision.
- Activity identity consent, nearby opt-in and default-sharing-card ownership helpers.
- Android locale policy, HCE single-selection behavior, required navigation and absence of the public NFC Tools route.

## Not completed or not claimed as runtime-complete

- The attached Figma has no app frames, forms, navigation prototypes, mobile screens or state variants; therefore those application screens cannot truthfully be claimed as pixel-matched Figma frames.
- The migration was deliberately not applied. Consequently, a live database-backed end-to-end run creating a card/content item, changing its template, publishing it, creating store products, testing duplicate persistence, and exercising pause/lost/stolen against the new tables was not performed. Unit/API/build coverage passed, but it is not a substitute for that run.
- Authenticated Android screenshots and current/all-device logout runtime tests were not produced because no test account/OTP and no migrated disposable database were authorized for this verification.
- HCE was checked by support policy/unit tests and emulator UI only; it was not tapped on physical NFC hardware and remains experimental.
- Nearby BLE discovery runtime, follow UI, and the expanded receipt/archive messaging model are not production-complete. Preferences/schema/permissions exist, while discovery and incomplete social/message actions remain unexposed rather than becoming dead buttons.
- Store checkout is the existing purchase-request flow, not a new payment processor.
- Production DNS/TLS requests to the legacy domains were not changed or tested externally. Redirect behavior is implemented and regression-tested in middleware, but deployment/DNS must route those hosts to this application for it to execute.
- The broad drawer catalogue is partially implemented; incomplete destinations are rendered as informational items rather than fake navigation actions.

No commit or push was made.
