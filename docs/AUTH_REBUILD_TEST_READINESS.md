# Evolution OTP — TEST deployment and reset readiness

**Superseded on 2026-09-12 by completed isolated TEST activation:** isolation proven, clean reset/seed completed, TEST API/public deployments successful, Evolution connected, TEST APK ready. Production unchanged; owner OTP acceptance pending. Current URLs, deployment IDs, APK hash and limitations: [AUTH TEST environment activation](AUTH_TEST_ENVIRONMENT_ACTIVATION.md) and canonical handoff section 19. The following is the historical pre-activation readiness assessment.

Date: 2026-09-12. No deployment, database reset, migration application, OTP delivery, or device acceptance was performed.

## Isolation and reset decision

**TEST RESET BLOCKED — ISOLATION NOT PROVEN.**

The repository's canonical handoff identifies the deployed Production service/environment. Local configuration contains database connections but no independently verified TEST/STAGING database/service identity. A local filename or `STAGING=true` alone does not prove isolation. Production databases were not queried to manufacture this proof, and no destructive command was executed. Owner confirmation must identify the independent service/database and storage scope before reset work can run.

The existing `packages/db/prisma/seed.ts` creates a demo customer/profile and is unsuitable for clean onboarding acceptance. It was inspected but not run or modified. No executable reset/seed is represented as ready while isolation is unproven.

Once isolation is established, the deterministic reset/seed specification is:

1. Record the reviewed TEST service/database identifiers and distinct credentials/storage scope. Keep Production deployment configuration unchanged.
2. Apply the reviewed migration history to that TEST database, including the local retirement migration, as a separately authorized deployment action.
3. Clear only the proven TEST customer's users, businesses, profiles/revisions/media references, sessions, onboarding state and OTP challenges/logs, in dependency order. Never target Production or reset its migration history.
4. Seed platform configuration only: one test Admin access mechanism, enabled test countries from the existing country catalogue, published current Terms/Privacy and applicability configuration, PERSONAL/BUSINESS definitions, onboarding/testing Plans, the 17 approved templates, Link Platforms, required SystemSettings/module definitions and onboarding definitions.
5. Verify zero customer profiles, zero test customer sessions/challenges and no Inventory/demo records. Provision the Admin separately using the existing `ensure-admin.ts` mechanism with test-only `ADMIN_EMAIL`/`ADMIN_PASSWORD`; do not enable its Production override.
6. Record the seeded configuration/version manifest and prove a second reset/seed yields the same baseline before owner OTP acceptance.

## Required TEST configuration

The new mobile OTP path requires:

| Variable | Requirement |
|---|---|
| `EVOLUTION_API_URL` | HTTPS Evolution API base URL; no credentials/query/fragment embedded in the URL. |
| `EVOLUTION_API_KEY` | Server-only API credential; never placed in Android, logs or responses. |
| `EVOLUTION_INSTANCE` | Instance name, 1–120 ASCII letters/digits/underscore/dot/hyphen. |
| `OTP_TTL_SECONDS` | Default 300; integer 60–900. |
| `OTP_RESEND_COOLDOWN_SECONDS` | Default 60; integer 30–300. |
| `OTP_MAX_ATTEMPTS` | Default 5; integer 1–10. |
| `OTP_PEPPER` | Existing independent server secret, at least 32 characters, for OTP/phone/source HMAC. |
| `MOBILE_TOKEN_SECRET` | Existing mobile session signing/refresh secret, at least 32 characters. The existing session layer supports `NEXTAUTH_SECRET` fallback. |
| `DATABASE_URL`, `DIRECT_DATABASE_URL` | Verified independent TEST runtime/migration connections. |

The shared application additionally retains its existing configuration: `NEXTAUTH_SECRET`, `MOBILE_ENROLLMENT_SECRET` for retained generic security/enrollment compatibility, `ACTIVATION_SCRATCH_PEPPER`, `ACTIVATION_RATE_LIMIT_PEPPER`, and the TEST-specific `NEXTAUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `PUBLIC_URL`, `APP_HOST`, `PUBLIC_HOST` and optional `NEXT_PUBLIC_WEB_APP_URL`. Retained passkey/security features use `PASSKEY_RP_ID`, `PASSKEY_ORIGIN` and reviewed `PASSKEY_ANDROID_ORIGINS`. Retained push/analytics use existing FCM/Firebase configuration; these credentials are not OTP credentials. Onboarding media requires the existing isolated storage configuration if images are tested.

`OTP_TEST_MODE`, `OTP_TEST_CODE`, legacy SMS variables and Meta WhatsApp OTP variables are **not read by the new mobile login flow**. There is no fixed-code bypass or alternate delivery provider.

The existing Railway configuration invokes `validate:production-env` and `db:deploy`; its validator intentionally requires Production hostnames. Do not point that existing deployment at TEST or Production as part of this pass. A separately reviewed TEST service must use the appropriate TEST host configuration and an explicit migration step for its verified database.

## Installed provider and owner acceptance

A read-only authenticated GET of the locally configured Evolution root returned **2.3.7**. No send-message request was issued against the real provider. The adapter checks the installed v2 version and uses the upstream v2 contract: `POST /message/sendText/{instance}`, `apikey` header, top-level `number`, `text`, and `linkPreview`. Sources: [message router](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/routes/sendMessage.router.ts), [message DTO](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/dto/sendMessage.dto.ts), [version endpoint](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/routes/index.router.ts).

Owner acceptance remains: real WhatsApp delivery, invalid/expired/resend behavior, provider failure, first-user onboarding, returning-user login, logout/revocation, restart/offline behavior, RTL/LTR and keyboard/accessibility on a physical Android device. The debug APK defaults to Production API configuration; it must be rebuilt with `POPWAM_API_BASE_URL` pointing to the matching TEST backend for TEST acceptance. No emulator/adb/install/instrumentation is authorized here.
