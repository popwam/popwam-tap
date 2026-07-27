# POP quick edit map

Use this alongside `POP_DEVELOPER_MANUAL.md`. Paths are verified against the current repository.

| I want to change… | Files | What to edit | Run after |
|---|---|---|---|
| Android Home | `apps/android/app/src/main/java/com/popwam/pop/ui/ProfileEditorHomeScreen.kt` | Home editor layout | `cd apps/android; .\gradlew.bat assembleDebug` |
| Share / QR | `.../ui/ShareCenterScreen.kt`, `.../ui/ShareCenterPolicy.kt` | Share UI/behavior | Android build |
| Menu/routes | `.../ui/FigmaNavigation.kt`, `.../ui/PopNavigationPolicy.kt` | NavHost, bottom items, Back | Android build |
| Phone login / OTP design | `.../ui/PopwamApp.kt` | Active LoginScreen UI | Android build |
| OTP Firebase behavior | `.../data/auth/FirebasePhoneAuthGateway.kt`, `SessionRepository.kt`; web `api/mobile/auth/firebase/phone/exchange/route.ts` | callbacks/exchange | Android + web tests |
| Passkeys | Android `PasskeyCoordinator.kt`; web `api/mobile/auth/passkey/*`, `lib/mobile-passkey-auth.ts` | options/verify | integration test |
| Theme, Cairo, ABeeZee, radius | `.../ui/theme/Theme.kt` | colors/fonts/Material shapes | Android build |
| Local Android strings | `res/values/strings.xml`, `values-ar/strings.xml`, `values-fr/strings.xml` | resource keys/translations | Android build |
| Dynamic localization | web `lib/localization-*.ts`, admin localization page/actions, `SystemSetting.localization.runtime` | enable/publish runtime locale | `pnpm i18n:audit` |
| Splash duration | `.../ui/RuntimeLaunchViewModel.kt` | `POP_COLD_SPLASH_MILLIS` | Android tests |
| Profile editor/publish | Android `ProfileEditorHomeScreen.kt`, `ProfilePublishingScreen.kt`; web `lib/profile-editor.ts`, `lib/profile-publishing.ts` | UI/domain | relevant tests |
| New Android screen | composable file + `FigmaNavigation.kt` | add NavHost route/caller | Android build |
| Web dashboard page | `apps/web/src/app/dashboard/<area>/page.tsx`, component/lib/API | route and UI | `pnpm --filter @popwam/web build` |
| Admin page | `apps/web/src/app/admin/<area>/page.tsx` + action/lib | retain `admin-access` | web build |
| API endpoint | `apps/web/src/app/api/<area>/route.ts` | method/auth/validation | web tests |
| DB model | `packages/db/prisma/schema.prisma` | schema, then new migration only | `pnpm db:migrate; pnpm db:generate` |
| Free plan limits | Admin Plans or seed `Plan` row `free`; `lib/plans.ts` | data value, not schema default | web tests |
| One-user limit | Admin Limits / `UserLimitOverride` | override max storage/links/etc. | none or web test |
| Quota enforcement | `apps/web/src/lib/plans.ts`, `quota-requests.ts` | precedence/usage/locked enforcement | web tests |
| Upload max/MIME/R2 keys | `packages/storage/src/index.ts`; Android `AndroidUploadPolicy.kt` | validation/defaults | web + Android tests |
| R2 bucket/domain | environment only; storage package for behavior | never expose keys | deploy |
| Friends | `FriendsScreen.kt`; web `lib/friends-*.ts`, `api/friends/**` | UI/policy | tests |
| Nearby TTL/radius/caps | `SystemSetting` `nearby.runtime.v1`; `lib/nearby-policy.ts` | runtime config/validation | Nearby tests |
| NFC/HCE | `nfc/*`, `hce/*`, `FigmaNavigation.kt` | scanner/programming/route behavior | Android device test |
| Web logo | `apps/web/public/brand/pop/*`, `public/icons/*`, admin branding | asset/settings | web build |
| Android logo/name | `res/drawable*`, `res/values/strings.xml`, manifest | resource/app label | Android build |
| API/public/passkey domains | Android `app/build.gradle.kts`; web env/`lib/url.ts`; `PASSKEY_*` | matching domains/origins | rebuild/deploy |
| Railway deploy pipeline | `railway.json`, root `package.json`, `scripts/validate-production-env.mjs` | commands/checks | dry-run locally |

Do not edit applied migrations, generated build/cache folders, real secrets, Firebase private keys, R2 keys, Android signing keys, or token/session cryptography unless that is the deliberate task.
