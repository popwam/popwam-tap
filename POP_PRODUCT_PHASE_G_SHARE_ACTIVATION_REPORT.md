# 1. Executive Summary

Phase G is complete at the local implementation, automated-test, build, and static-validation level. The temporary Share compatibility hub has been replaced by a canonical Web and native Android Share Center built around `Profile -> approved share target -> QR / native share / copy / HCE / physical product`.

`Profile` remains identity and publication authority remains Phase E. `Card` remains a sharing product. New physical-product activation requires a public product identifier plus a separate six-digit scratch secret, with salted scrypt verification, multi-scope rate limits, escalating lockout, and a serializable one-winner claim transaction.

No deployment, production mutation, migration application, emulator, external console change, push, or commit occurred.

# 2. Existing Share Stack Audit

**KEEP**

- `Profile` as identity/presence and Phase E published projections as public authority.
- Stable Card/Tag public identifiers and resolvers.
- Existing `Card`, `Tag`, `TagAlias`, `VirtualCard`, `Destination`, `ProducedTag`, production/inventory, wallet, transfer, and legacy activation routes.
- POP NextAuth and mobile bearer authentication authorities.
- Existing Android `HostApduService`, NFC reader coordinator, camera scanner, QR dependency, and Credential/Firebase boundaries.

**REUSE**

- `Destination` and `Card.activeDestinationId` for current target resolution.
- Card permanent URL, open counters, status history, plan limits, audit log, legacy claim paths, and current public URL helpers.
- Android NFC Forum Type 4 NDEF service and `PermanentUrlPolicy`.

**EXTEND**

- `Destination` receives an opaque public share key.
- Card/attempt/production records receive additive scratch-security state.
- Shared Web/Android bearer-or-cookie APIs provide target, product, inspection, claim, and target/status management projections.

**DEPRECATE LATER**

- Card-first navigation and duplicated legacy Cards/Tags/Activation surfaces can be retired only after production migration and compatibility evidence.
- Legacy bearer/OTP activation remains isolated for already-packaged products and is not removed in Phase G.

# 3. Share Center Architecture

The canonical interaction is:

1. Choose the current authorized Profile.
2. Choose what published content to share.
3. Choose how to share it.

The server owns authorization, publication eligibility, canonical URLs, target compatibility, physical-product state, limits, and activation. Web and Android render the same contract while enabling only platform capabilities they support.

# 4. Share Target Model

No new `ShareTarget` database model was created. Existing `Destination` remains sufficient for concrete profile-owned destinations, while full Profile and Contact are controlled virtual projections backed by the existing PROFILE/VCF destination semantics.

The only Destination schema extension is nullable unique `publicShareKey`, used to avoid exposing database IDs in public direct-target URLs. Enabled Phase G target classes are `PROFILE`, `CONTACT`, `LINK`, and `SOCIAL`. SERVICES/CATALOG and arbitrary module targets remain disabled until their domain contracts exist.

# 5. Target Selection

`GET /api/profiles/[profileId]/share-targets` resolves the current POP user through Web NextAuth or Android POP bearer authority. It applies `managedProfileWhere`, then reads the current Phase E public projection.

Only current published/visible destinations with safe normalized URLs are projected. Clients submit target IDs, never arbitrary URLs. Claim and target-change transactions revalidate profile authority, destination ownership, active state, and current published revision before writing.

# 6. QR Sharing

QR values are server-approved HTTPS URLs on `go.popwam.com`:

- `/p/<public-slug>` for the full Profile.
- `/p/<public-slug>/contact.vcf` for published contact export.
- `/s/<opaque-key>` for a current published destination.
- `/<permanent-product-slug>` for a physical product.

No bearer token, scratch secret, Firebase UID, POP user ID, Profile database ID, or private field is encoded. Web and Android show a large black-on-white QR and label it as ready; neither claims that displaying the QR means it was scanned.

# 7. Native Share / Copy

Web uses `navigator.share` when available and a clipboard/DOM copy fallback otherwise. Cancellation is not reported as success. Android uses `ACTION_SEND` with the approved canonical URL and Android clipboard services.

Feedback distinguishes “Link copied” and “Share sheet opened.” Raw private fields and internal identifiers are never shared.

# 8. HCE Architecture

The existing Android `HostApduService` remains a minimal NFC Forum Type 4 Tag emulator. It exposes one NDEF URI record under AID `D2760000850101`, requires device unlock, and implements no payment, EMV, identity, or private-data protocol.

The selected target persists locally as an approved public URL and opaque target selector. `HceConfig` immediately requests preferred-service status on a compatible active Activity. `PopwamHostApduService` revalidates the URL before every APDU response.

# 9. NFC Compatibility

Android reports four user-safe states: NFC unavailable, NFC disabled, HCE unsupported, and ready. Copy/QR remain available in every state.

The UI says to hold near a compatible NFC device and does not promise universal phone-to-phone operation. HCE and NFC features are optional in the manifest. Unused Bluetooth scan/advertise/connect permissions were removed; Phase G requests only camera when scanning and uses NFC without unrelated runtime permission prompts.

# 10. Physical Products

`GET /api/share/products` returns an authenticated bounded projection containing display label, masked serial, product type, authoritative status/assignment state, assigned Profile summary, current target summary, stable permanent URL, safe open summary, and management capabilities.

It excludes activation hashes, scratch material, manufacturing ciphertext, raw inventory metadata, owner identity, tokens, and full serial display.

# 11. Product States

The UI derives presentation from existing server states rather than inventing client-only lifecycle state. It presents active, paused, lost, unavailable/stolen, disabled, transfer pending, not activated, and archived compatibility states.

Capabilities are server-projected. Target changes are allowed only for ACTIVE/PAUSED products. Pause is allowed only from ACTIVE and resume only from PAUSED, preventing lost/stolen/disabled products from being restored through the Share API.

# 12. Activation Existing Security Audit

The existing legacy flow already provided hashed activation tokens, short-lived claim sessions, OTP verification, attempt tracking, plan checks, transactional ownership assignment, inventory updates, and audit records.

Its visible/bearer activation value is unsuitable as the final remote proof for newly manufactured products. It is therefore preserved only for legacy packaged inventory. The Phase G scratch flow is additive and does not modify or delete working legacy endpoints.

# 13. Scratch Secret Architecture

New products receive:

- A separate six-digit cryptographically generated scratch secret.
- Salted scrypt hash with version and configurable cost.
- A distinct server-only pepper.
- `SCRATCH_READY`, `LOCKED`, `CONSUMED`, or `REISSUE_REQUIRED` state.
- Attempt-window count, lockout timestamp, consumed timestamp, and version.

Normal runtime verification never reads plaintext. Comparison uses a timing-safe equality check after scrypt derivation. Production environment validation now requires distinct scratch and rate-fingerprint peppers.

# 14. Activation Flow

The new flow is:

`scan/tap/manual identifier -> authenticated inspect -> eligibility -> six-digit scratch entry -> explicit Profile -> approved target -> secret verification -> serializable claim -> secret consumption -> product refresh`.

The public identifier alone can only inspect safe eligibility/presentation. It cannot claim ownership.

# 15. QR Activation

The activation identifier URL contains only the public product slug and activation context. It does not contain the scratch secret, access token, owner identity, or inventory internals.

The public activation page masks the product reference, explains that the visible identifier is not proof, and routes scratch products into Share Center. Legacy products continue to their compatible activation route.

# 16. NFC Product Identification

Android NFC reading extracts the existing public product URI and sends it to the authenticated inspect endpoint. NFC never contains or supplies the scratch secret.

The existing NFC reader coordinator remains mutually exclusive with active HCE preference while reading. Failed NFC identification does not affect account access or other Share methods.

# 17. Scanner / Camera

Android uses the existing native CameraX/ML Kit full-screen-capable Compose scanner. Permission is requested only after the user presses the camera scan action. Image selection and manual identifier entry remain available after denial.

Web uses the existing BarcodeDetector camera/image path where supported and always retains manual entry. No OCR or new broad scanner dependency was added.

# 18. Scratch Code UX

Web and Android provide a short numeric six-digit input with paste-compatible normalization, LTR code presentation, masked password keyboard behavior on Android, localized errors, cooldown feedback, and scan-another recovery.

The value is kept only in transient UI/request state, cleared after success or restart action, and is never sent to Firebase Analytics, logs, reports, or audit metadata.

# 19. Rate Limiting

Server protection combines an endpoint process-local throttle with persistent database attempt counts over a 15-minute window:

- Per product: 5 attempts.
- Per POP account: 12 attempts.
- Per device/request context fingerprint: 8 attempts.
- Per privacy-safe network fingerprint: 25 attempts.

Fingerprints are HMAC-derived with a dedicated server secret. No plaintext IP is stored. The closest trusted proxy address or explicit real-IP header is used rather than a client-prepended forwarded value.

# 20. Lockout

The fifth product failure creates a 15-minute lockout. Repeated failures escalate exponentially up to 24 hours. Inspect and claim both honor active lockout.

Failures return generic unavailable/cooldown responses and do not reveal partial-code correctness, ownership identity, or whether a product/code combination was close.

# 21. Atomic Claim

The final claim uses a Prisma Serializable transaction, locks the POP User and Card rows, rechecks unowned/unassigned state and the unchanged secret hash, revalidates current Profile/target publication, applies plan limits, and performs a conditional `updateMany`.

Only one concurrent claimant can update the card. Same-owner retry returns an idempotent product projection. A different owner receives a safe unavailable response. Success clears the hash, marks the secret consumed, rotates the disabled legacy token, updates production/inventory state, records the attempt, and writes a secret-free audit event.

# 22. Profile Assignment

Activation shows the authorized non-archived Profile selector and defaults to the current Profile. The explicitly selected Profile ID is submitted.

The server validates direct ownership or authorized organization management and current published eligibility. It never assumes the first Profile or silently rewrites the Primary Profile.

# 23. Share Target Assignment

Activation may bind the physical product to the full Profile, published Contact target, or an approved current Destination. `Card.profileId` and `Card.activeDestinationId` are updated together only after verification.

`Card` remains a product assigned to a Profile; it does not become Profile identity.

# 24. Target Changes

Authenticated owners can change an ACTIVE/PAUSED product’s Profile/target without a scratch secret and without transferring ownership. The same server publication and authorization checks used during activation run again inside the update transaction.

Web and Android preselect the product’s current target when possible and refresh the bounded product projection after saving.

# 25. Card Pause / Lost

Share Center directly exposes pause and resume for exact ACTIVE/PAUSED transitions. The public Card resolver returns a safe paused state and does not delete the Card.

Lost, transfer, and broader product controls remain in the existing product-detail compatibility surface, linked from each product. Phase G does not invent a new transfer or step-up protocol.

# 26. Permanent URL Safety

The physical Card’s programmed `go.popwam.com/<publicSlug>` URL never changes during activation, Profile reassignment, target change, pause, or resume. Only server-side resolver state changes.

Profile, contact, destination, and product public URLs are separately labeled so Profile Share QR, physical-product permanent QR, and activation context are not ambiguous.

# 27. Card / Tag Resolver

Card resolution checks owner/assignment and all authoritative Card states. PAUSED, LOST/STOLEN, DISABLED/ARCHIVED/TRANSFER_PENDING, and unactivated products return safe non-content states.

PROFILE and VCF targets require a currently public Phase E projection. Contact export also requires the current public CONTACT module and `showSaveContact`. Direct Destination redirects must remain active, URL-safe, and present in the current published revision. Legacy Tag/TagAlias resolution remains compatible.

# 28. Share Analytics

Privacy-safe Firebase wrapper events cover Share Center viewed, Profile selected, target selected, QR opened, link copied, native share opened, HCE target selected, and product target updated.

These are UX events, not claims that another device scanned the QR. Server-observable Card opens continue using existing public resolver counters. No arbitrary campaign parameters were added to canonical URLs.

# 29. Activation Analytics

Allowed Firebase events are `activation_started`, `activation_scanned`, `activation_completed`, and `activation_failed`.

Metadata is bounded to platform, outcome, non-sensitive method (`qr`, `nfc`, or `manual`), and safe product category where applicable. No serial, Card/Profile/User ID, phone, scratch code, OTP, token, Firebase UID, or APDU payload is emitted.

# 30. Audit Logging

Server audit events cover failed scratch verification classification, lockout, completed activation, target change, pause/resume, production batch creation, and one-time manufacturing export.

Audit metadata contains only bounded classifications/counts/versions/target type. It contains no scratch value, hash, ciphertext, full IP, bearer token, or private URL content.

# 31. Web Share Center

`/dashboard/share` is now the canonical Web surface. It includes Profile selection, published target selection, large modal QR, Web Share/copy fallback, Android NFC compatibility wording, safe product list, target management, pause/resume, product-details compatibility link, camera/image/manual activation, scratch entry, cooldown, assignment, and success feedback.

Native dialog semantics, keyboard interaction, focus behavior, responsive grids, explicit labels, and live regions are used. QR shown is described as ready, not shared.

# 32. Android Share Center

The native Compose Share tab includes Profile/target selection, large QR, `ACTION_SEND`, copy feedback, NFC/HCE capability state and target selection, physical products, target management, pause/resume, compatibility details, camera/image/manual/NFC identification, scratch code, explicit Profile/target assignment, localized errors, and safe completion.

It uses Retrofit POP bearer APIs and no WebView. Firebase failure is irrelevant to authorization and activation completion.

# 33. Navigation

The primary Android navigation remains `Home | Share | Menu`; Share is now the Phase G surface. Web dashboard Share routes directly to Share Center.

Legacy Cards, Tags, Activation, Wallet, programming, product details, lost, and transfer routes remain reachable. No working route was deleted.

# 34. Localization / RTL

All Phase G Share Center and public activation copy is present in English and Arabic through the existing locale resources. Web uses locale JSON and Android uses `values` / `values-ar`.

RTL is inherited from the application locale. URLs, masked references, and code fields explicitly remain LTR where appropriate. The i18n audit passed with 423 Web keys, 471 Android keys, zero hardcoded candidates, and only 14 pre-existing possibly-unused dashboard keys.

# 35. Accessibility

Web uses native modal dialogs, labeled selects/inputs/buttons, `aria-live` status feedback, QR image descriptions, keyboard-safe controls, and high-contrast QR.

Android uses Material controls, large touch targets, content descriptions, TalkBack-compatible labels, observable locale changes, IME padding, numeric password input, permission explanation, and manual scanner alternatives.

# 36. Security Review

Validated controls include:

- Approved-host/path URL policies on server and Android.
- No javascript/data/custom scheme in QR/HCE.
- Publication and ownership revalidation inside writes.
- Public identifier plus separate secret.
- Salted slow hash, pepper, timing-safe comparison, consumption, and replay prevention.
- Product/account/context/network limits with exponential lockout.
- Serializable row locks and conditional one-winner claim.
- Same-owner idempotency and different-owner rejection.
- Exact ACTIVE/PAUSED transitions.
- CSRF/same-origin protection for Web mutations and one-time export.
- POP bearer or NextAuth authorization only; Firebase is not accepted.

The migration and live database concurrency path were not executed under local-only safety constraints. Their transaction/source contracts are covered by automated policy and structural tests.

# 37. Privacy Review

Authenticated product projections mask serials and omit secrets/manufacturing metadata. Public product pages also mask references. Activation inspection exposes no ownership identity.

No scratch value appears in logs, reports, analytics, audit metadata, public QR/NFC, consumer API responses, or runtime database plaintext. Rate controls store only keyed fingerprints. Phase E remains the only route to public draft/media exposure.

# 38. APIs

New shared authenticated APIs:

- `GET /api/profiles/[profileId]/share-targets`
- `GET /api/share/products`
- `PATCH /api/share/products/[cardId]`
- `POST /api/share/activation/inspect`
- `POST /api/share/activation/claim`

New public compatibility routes:

- `GET /s/[opaqueKey]`
- `GET /p/[slug]/contact.vcf`

Updated operational route:

- `GET /api/admin/production-batches/[id]/csv` remains read-only compatible for legacy batches.
- `POST /api/admin/production-batches/[id]/csv` is the explicit same-origin, serialized one-time scratch export.

All shared authenticated routes accept Web NextAuth or existing Android POP bearer authority. No route trusts Firebase ID tokens as POP authorization.

# 39. Prisma Changes

Additive changes:

- `ActivationSecretState` enum.
- `Destination.publicShareKey`.
- Card scratch hash/state/version/consumed/attempt-window/failure-count/lockout fields.
- ActivationAttempt actor/context/network/method/failure classification fields and indexes.
- ProducedTag one-time export ciphertext/export timestamp/version fields.

No ShareTarget model, no identity rewrite, and no Card/Profile conflation were introduced.

# 40. Migration

**MIGRATION: YES — CREATED ONLY**

`packages/db/prisma/migrations/20260726003000_share_activation_scratch_security/migration.sql` is additive and contains no DROP, DELETE, TRUNCATE, or legacy-data rewrite.

**MIGRATION APPLIED: NO**

No local or production migration command was run.

# 41. Legacy Activation Policy

Existing already-packaged products with legacy activation material continue through the prior OTP/claim route. Legacy GET CSV behavior remains available for legacy-only batches.

New products receive an unusable isolated legacy token value and use identifier plus scratch secret. Existing products are not silently required to have a scratch code they were never packaged with. Ambiguous inventory is classified for reissue/operator review.

# 42. Manufacturing Contract

Future production batches generate the scratch secret once in memory, store only its salted hash on Card, and temporarily seal one recoverable copy on ProducedTag for the controlled packaging boundary.

An administrator must explicitly POST the one-time production CSV. The transaction locks the batch, atomically marks every exported secret, clears all recoverable ciphertext, and audits only count/version. Browser prefetch cannot consume it. The CSV must be handled only by the approved print/scratch-coating workflow and is not recoverable from consumer APIs or the admin page afterward.

If a download fails after transaction completion, the secure outcome is operator reissue—not secret recovery.

# 43. Backfill Dry Run

`packages/db/prisma/activation-secret-backfill-report.ts` is a read-only aggregate classifier with package command `backfill:activation-secrets:dry-run`.

It reports only counts for:

- `LEGACY_ACTIVATION`
- `SCRATCH_READY`
- `ALREADY_ACTIVATED`
- `NEEDS_REISSUE_OR_OPERATOR_ACTION`

It outputs no IDs, codes, hashes, ciphertext, owners, or inventory details and performs no mutation. It was intentionally **NOT RUN** because the additive schema was not applied and querying an external/production database was outside the local-only safety boundary.

# 44. Automated Tests

Web: **PASS — 54 files, 282 tests, 0 failures.**

Phase G coverage includes URL allow/deny policy, identifier parsing, target classes, cooldown, all four rate scopes, eligible/used/locked/already-owned/different-owner gates, salted hash correctness, wrong/malformed secret rejection, production generation, one-time export locking/clearing/audit, publication projection, target ownership, generic failures, serializable claim contract, secret consumption, idempotency, stable URL, exact pause/resume transitions, resolver blocking, Firebase non-authority, Web Share/copy/QR/scanner/scratch/accessibility, and EN/AR parity.

Android: **PASS — 19 suites, 73 tests, 0 failures.**

Phase G additions cover selected server target behavior, six-digit input policy, NFC unavailable/disabled/HCE unsupported/ready states, assignment URL policy, bounded identifiers, approved Profile/Contact/opaque-link HCE URLs, and rejection of query secrets, activation paths, credentials, ports, bad schemes, and unapproved hosts. Existing POP-auth, Firebase/FCM independence, navigation, publishing, and HCE selection regression suites also pass.

# 45. Build / Lint

All required commands passed:

- `pnpm db:generate`
- `pnpm --filter @popwam/db lint`
- `pnpm --filter ./apps/web lint`
- `pnpm --filter ./apps/web test`
- `pnpm --filter ./apps/web build`
- `pnpm i18n:audit`
- Android `testDebugUnitTest` with Firebase flag
- Android `assembleDebug` with Firebase flag
- Android `lintDebug` with Firebase flag

Android lint result: 0 errors, 93 non-blocking warnings, primarily existing deprecation/API/KTX guidance. Debug APK assembly succeeded.

Final `git diff --check` passed; Git emitted only expected Windows LF-to-CRLF conversion warnings. `git status` and `git diff --stat` were inspected without staging or modifying unrelated prior-phase work.

# 46. Runtime Device Status

`adb devices` returned no attached device.

**ANDROID RUNTIME DEVICE TESTS: NOT RUN**

No emulator, AVD, or QEMU was created, started, or used.

# 47. Remaining Gaps

- Real camera, NFC reader, and HCE interoperability require a real authorized Android device.
- The additive migration requires a later controlled review/application before deployed Phase G endpoints can use the new columns.
- The aggregate legacy/scratch backfill classifier must be run only in an explicitly approved environment after the schema exists.
- Lost/transfer stays in the existing product-detail flow; no new transfer protocol or Phase H step-up was added.
- SERVICES/CATALOG direct targets remain deferred until their domain phases.
- Public opens are observable through existing resolver counters, but channel-specific QR/copy/native/HCE attribution is not attached to canonical URLs; the UI therefore makes no scan-success claim.
- The serializable claim and one-time export contracts were not exercised against a migrated live database under this local-only task.

# 48. Phase G Exit Criteria

**PASS at local implementation, automated-test, build, and static-security level.**

All 27 exit criteria are represented: Share is canonical; WHAT precedes HOW; only approved public QR/HCE URLs are used; native share/copy and QR fallback exist; HCE compatibility is accurately described; products and authoritative states are present; activation requires identifier plus separately hashed scratch secret; brute-force controls and atomic/idempotent claims exist; selected Profile/target assignment and stable permanent URLs are enforced; public resolution respects Phase E; legacy packaged products/routes remain compatible; Web/Android share one POP-authorized contract; Firebase is supplementary; Meta is unchanged; validations pass; no deployment/migration/push/commit/emulator occurred.

The no-device runtime status and unapplied migration are explicit operational prerequisites, consistent with the task’s safety boundary.

# 49. Recommended Next Phase

Recommended exact next phase:

**POP PRODUCT REDESIGN — PHASE H: SETTINGS / SECURITY / DEVICES / SESSION UX**

Scope should activate a logical device/session inventory without merging authentication authorities: current browser/mobile sessions, privacy-minimized device labels, last-seen/revocation state, individual revoke, “sign out all others,” purpose-bound step-up for lost/transfer and other sensitive actions, passkey management, and FCM ownership cleanup. NextAuth sessions, mobile refresh families, passkeys, Firebase external identities, and FCM tokens must retain their separate revocation semantics.

Recommended model/reasoning:

**`gpt-5.6-sol` with `xhigh` reasoning**

The current [official OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model) identifies GPT-5.6 Sol as the flagship-capability route. `xhigh` is appropriate for cross-authority session mapping, step-up proofs, revocation races, Web/Android parity, and abuse/privacy review; compare `max` only for a final focused threat-model pass if latency/cost is secondary.
