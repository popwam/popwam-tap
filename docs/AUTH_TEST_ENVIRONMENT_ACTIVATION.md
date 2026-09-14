# AUTH TEST ENVIRONMENT activation

> Current environment contract (2026-09-13): [POP_ENV_CONTRACT.md](POP_ENV_CONTRACT.md). This dated report is historical evidence; current Railway readiness and unresolved Meta/SMS, URL and signing-origin exceptions are recorded there.


Date: 2026-09-12. Owner physical OTP acceptance: **PENDING**.

## Infrastructure and isolation

The authenticated Railway inspection identified project **sparkling-reflection** (`a9d788a7-5ae7-414c-a1c5-fdac81b26227`), workspace **My Projects**. POP Production is environment **popwam** (`e465376b-2fd9-4119-aa97-a6d850d0259e`), service **popwam-tap** (`1abab459-a238-425f-aa34-e1ca500a4588`). This one service serves both `https://pop.popwam.com` and `https://go.popwam.com`.

The existing environments were `cg` (empty), `popwam` (POP plus unrelated services), and `production` (the unrelated real-estate services `public-web`, `admin-web`, `api`). There was no suitable POP TEST service/database. The environment named `production` and its staging-looking domains were not reused.

Created environment **test** (`ff94b952-4772-4675-905d-b36def679071`) without duplicating Production:

| Resource | Identity |
|---|---|
| TEST Web/API | `popwam-auth-test`, `9202f479-ece7-4253-bf0e-b11bc000cfca` |
| TEST public Web | `popwam-public-test`, `935087b3-8b1c-4e30-9286-f0c13f85b61d` |
| TEST PostgreSQL | Railway PostgreSQL template, `eb5873cf-cbe1-4784-a54a-fffa15348d67`, dedicated volume |
| TEST API/Web | https://popwam-auth-test-test.up.railway.app |
| TEST public Web | https://popwam-public-test-test.up.railway.app |
| TEST runtime DB | `postgres.railway.internal:5432/railway`; URL SHA-256 prefix `0bd28ac56ff70dae` |
| TEST maintenance DB | `gondola.proxy.rlwy.net:53631/railway`; URL SHA-256 prefix `ba329a8bcd6991fc` |
| Production DB | `ep-muddy-poetry-atc4qupm-pooler.c-9.us-east-1.aws.neon.tech/neondb`; URL SHA-256 prefix `0cfb543c8e1cdb7b` |

**TEST ISOLATION: PROVEN.** Runtime and migration URLs on both TEST services resolve to the dedicated TEST database. Actual SQL identity returned database `railway`, server `10.225.242.71/32`. Environment, service IDs, hosts/database names, connection fingerprints and public/API domains differ from Production. No additional writable Production database connection is configured. Proof is rerun immediately before each migration/reset operation. No destructive action ran before proof.

A TEST database credential appeared inadvertently in an early tool inspection. It was rotated before configuring application services. The superseded credential is invalid; no active database credential or Evolution key is recorded here.

## Configuration and clean seed

The actual owner-configured `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, and `EVOLUTION_INSTANCE` were read privately from the local environment and set on TEST through stdin, with CLI output suppressed. All three are present. TTL **300**, resend cooldown **60**, maximum attempts **5**. Independent TEST auth/enrollment/OTP/activation secrets were generated. Existing FCM and Android passkey-origin configuration was retained. Production variables were not changed.

Production R2/storage write credentials, customer integrations and demo-user credentials were **not** copied. TEST image/media uploads are therefore unavailable; optional image selection should be skipped during this OTP/onboarding pass. Account type defaults do not require avatar/cover images. This is a concrete limitation, not completed media acceptance.

Prisma `migrate deploy` applied all **33 migrations** to the new empty TEST database, including `20260911190000_retire_firebase_phone_subject`. `migrate status` reports the schema up to date. The retirement migration drops only the obsolete nullable proof column; the new empty TEST database had no historical proof/customer data to preserve. No `db push`, migration-history reset, or Production migration was used.

The TEST-only reset/seed was executed twice successfully. It clears customer/auth state and replaces only platform configuration, without seeding customer profiles or Inventory demos. Canonical non-customer configuration was read in explicit **READ ONLY** Production transactions: existing plans, countries, current published legal documents, categories/modules, approved templates, link platforms and onboarding definitions/questions. Only the **17 approved registry templates** were selected; obsolete templates were not copied. Missing account-type/legal-targeting settings use the existing application defaults.

| TEST state after reset/seed | Count |
|---|---:|
| Users | 1 intentional Admin |
| Customer users / profiles / profile revisions | 0 / 0 / 0 |
| OTP challenges / legacy mobile auth challenges | 0 / 0 |
| Mobile refresh tokens / Web sessions / device sessions | 0 / 0 / 0 |
| Approved templates | 17 |
| Plans | 4: free, personal, pro, business |
| Enabled registration countries | 1: EG, matching current canonical configuration |
| Legal documents | 7; published Terms/Privacy in AR and EN; normal EN fallback for FR |
| Link Platforms | 33 |
| Profile categories / module definitions | 10 / 10 |
| Published onboarding definitions / steps / questions | 7 / 29 / 60 |
| SystemSettings | 3: localization.runtime, profile.account-types.v1, legal.country-targeting.v1 |
| Account types | PERSONAL and BUSINESS enabled |
| Inventory batches/demo records | 0 |

Admin access is the existing `/admin/login` mechanism on the TEST API/Web origin, using the owner's existing local `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Only a password hash was seeded; no Admin profile or customer workspace was created. Credential values are not documented.

## Verification and deployment

- **74** focused Evolution OTP/auth/session tests across **12** files passed.
- **6** additional TEST environment safety checks passed, including refusal of Production environment/database/origin, divergent migration connection and shared auth secrets.
- TypeScript/Web lint (`tsc --noEmit`), Prisma validation and client generation passed.
- Root **`pnpm build` production Web/workspace build passed** (5 tasks successful).
- Initial Prisma generation hit a Windows engine-file lock while another Prisma operation was running; the serialized rerun passed. No dependency/schema change was needed.
- `git diff --check` passed.
- Android `:app:assembleDebug` passed; no device, emulator, adb, installation or instrumentation.

Railway no longer permits Config as Code opt-in for new services. TEST services therefore use explicit service-instance build/predeploy/start settings. Existing Production `railway.json` and root Production validator remain unchanged. A reduced deployment archive excludes local secrets, Android artifacts, and Production `railway.json`; it retains the three Android font source files required by Web. Deployment metadata confirms `configFile: null`, `pnpm build`, TEST validation before `pnpm db:deploy`, and TEST validation before Web startup. [Railway configuration documentation](https://docs.railway.com/config-as-code).

Both TEST deployments **SUCCESS** on 2026-09-12:

| Service | Deployment ID | Created (UTC) |
|---|---|---|
| TEST API/Web | `2d976ca5-d8fa-4e6d-a0b4-078d9e21d67d` | 11:32:14.870 |
| TEST public Web | `e5af52b7-742b-4189-87c6-91645878459b` | 11:32:27.818 |

Live predeploy logs show TEST validation passed and **no pending migrations**. API `/health`, public homepage, TEST Admin login, platform bootstrap, both account-type category/template endpoints and Terms/Privacy AR/EN/FR resolution returned **HTTP 200**. Template API returned 6 Personal and 11 Business templates. No customer login was performed.

At **11:38:33 UTC**, the read-only provider script ran **inside the deployed TEST API container**: Evolution **2.3.7**, credentials accepted, instance exists, state **open**, usable **true**, HTTP **200**. It checked root/version and the authenticated `connectionState` endpoint only. A temporary SSH key was registered solely for this check, then revoked and its private/public files removed. The provider contract was checked against the [upstream instance router](https://raw.githubusercontent.com/EvolutionAPI/evolution-api/main/src/api/routes/instance.router.ts).

Live TEST API smoke at **11:36:09 UTC**:

- Invalid phone: **400 PHONE_INVALID**.
- US country verified disabled in TEST before using a fictional reserved-range US number: **400 PHONE_COUNTRY_UNAVAILABLE**, before challenge/provider activity.
- Repeated invalid requests: **429 OTP_RATE_LIMITED**, `Retry-After: 60`, `retryAfterSeconds: 60`.
- Invalid verification input: **400 PHONE_INVALID**.
- All rejection responses used `Cache-Control: no-store`; no OTP/hash/session secret was returned.
- After smoke: 1 Admin, zero customer profiles/revisions, zero OTP/auth challenges, zero mobile refresh/Web/device sessions. **33 applied migrations, 0 failed; retired column absent**.

**Real WhatsApp OTP sent: NO.** No explicitly configured owner-safe delivery number exists. Valid-code delivery/login, resend and returning-account acceptance remain owner physical tests; automated coverage is not reported as real delivery.

## Production safety verification

Before/after explicit READ ONLY database snapshots match: **3 Users**, **10 Profiles**, **32 migrations**, including matching row fingerprints. Production service deployment remains **`59c18ff0-c958-494a-bdb5-70a8ad93daa7`**, created **2026-09-11 10:51:26.394 UTC**, SUCCESS. This newer pre-existing deployment was discovered during topology inspection; it was not created by this task. The complete Production variable fingerprint is unchanged; the three Evolution variables remain absent in Production, exactly as before. No Production column drop/reset/deployment was performed.

## TEST Android artifact

Reused existing `POPWAM_API_BASE_URL` and `POPWAM_PUBLIC_BASE_URL` Gradle environment configuration. No Android architecture/UI change or flavor refactor. Reproducible command: `scripts/build-auth-test-apk.ps1`.

- APK: `E:\saas\popwam-tap\apps\android\app\build\outputs\apk\debug\pop-auth-test-debug.apk`
- Package: **com.popwam.pop.debug**; versionName **0.0.12-debug**; versionCode **12**.
- Size: **53,480,757 bytes**.
- SHA-256: **7F37CE0DB7ABB28544E76D269EDC8B6494B067B25C91851A12BAF64E62FF48A2**.
- API base and public Web base: the TEST domains listed above, with trailing `/`.
- Draft-preview trusted origin: TEST API origin, through existing `BuildConfig.API_BASE_URL`.
- Actual aapt2 metadata and generated BuildConfig inspected. APK DEX contains both TEST bases. Compiled constants in `AppContainer`, `AccessTokenInterceptor`, `RefreshAuthenticator`, and `DraftTemplatePreviewKt` point only to TEST. No FirebaseAuth/PhoneAuthProvider DEX descriptors found.
- Existing My Profile public-share/display strings still mention Production; they are unrelated to login/API/credential forwarding/draft preview and are outside this pass's explicitly excluded My Profile corrections. The API interceptor strips credentials for other origins. Do not treat those legacy share links as TEST acceptance targets.
- The debug package ID is unchanged, so it can replace another debug build. The clearly named APK above is the TEST artifact; the older Production-targeted APK must not be used for this acceptance.

## Owner manual OTP checklist — not executed

A. Fresh install of the specifically named TEST APK (manual owner action).
B. Enter a new Egyptian phone number owned by the tester; EG is currently the enabled country.
C. Receive the WhatsApp OTP.
D. Enter the OTP.
E. Complete first-time account setup and legal acceptance; skip optional image uploads.
F. Confirm the app opens.
G. Log out.
H. Log in again with the same number.
I. Confirm the same account is restored.
J. Request resend and verify the cooldown.
K. Enter one incorrect OTP and confirm a safe error.
L. Confirm no Firebase/SMS wording appears in the login flow.

## Operational files

`scripts/auth-test-environment.mjs` contains explicit TEST-targeted proof, migration, reset/seed, environment configuration, Production read-only snapshot/comparison and API smoke operations. `scripts/validate-test-env.mjs` refuses mismatched environments/DB/origins before migration/start; `scripts/validate-test-env.test.mjs` verifies those refusals. `scripts/check-test-evolution.mjs` checks connectivity from TEST without a send operation. Redacted evidence snapshots are at `%LOCALAPPDATA%\POPWAM\auth-test-activation`; no secrets are saved in them.

No Acceptance Correction pass, Admin cleanup, Inventory cleanup, My Profile fix, Production deployment, or commit is included.

## Final statuses

```text
TEST ENVIRONMENT ISOLATION: YES
CLEAN TEST RESET COMPLETE: YES
AUTH TEST BACKEND DEPLOYED: YES
EVOLUTION PROVIDER READY: YES
TEST APK READY FOR OWNER: YES
OWNER OTP ACCEPTANCE: PENDING
PRODUCTION AUTH DEPLOYED: NO

NO PRODUCTION DATA RESET
NO PRODUCTION MIGRATION
NO PRODUCTION AUTH DEPLOYMENT
NO EMULATOR
NO ADB
NO PHYSICAL DEVICE
NO APK INSTALLED
NO ADMIN CLEANUP
NO INVENTORY CLEANUP
NO COMMIT CREATED
```
