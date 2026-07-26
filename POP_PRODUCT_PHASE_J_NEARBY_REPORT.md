# 1. Executive Summary

Phase J's local Nearby foundation is implemented for the Web, Android, shared POP APIs, and PostgreSQL schema. Nearby is an explicit, versioned-consent, foreground-only feature that is OFF by default and fails closed when its server configuration is missing, malformed, disabled, or excludes the current rollout subject.

The implementation stores one short-lived coarse presence per POP User. Raw coordinates are accepted only by the authenticated POP API, validated and converted in request memory, then discarded. Peers receive neither coordinates, cell identifiers, exact distance, exact freshness, nor internal User IDs. Discovery returns a bounded, privacy-filtered projection of the Phase I social Profile and reuses Phase I Friends, Block, and Report behavior.

All requested local automated validation passed. A new additive migration exists but was not applied. Nearby remains operationally disabled because no runtime setting was seeded and no reviewed active `NEARBY_PRIVACY` legal document was created. No authorized physical Android device was attached, so Android runtime and the physical-device/browser matrix were not run.

# 2. Existing Location / Nearby Audit

The audit classified the previous implementation as follows:

- **KEEP:** POP User identity, NextAuth and POP bearer current-user resolution, Phase I selected social Profile, Friendship/UserBlock/UserReport, publication/privacy states, Phase H settings architecture, SystemSetting configuration, analytics wrapper, FCM lifecycle, and cleanup-script conventions.
- **REUSE:** `LegalDocument`/`UserLegalConsent`, current Community Guidelines prerequisite, Phase I friend/block/report endpoints and capability projection, safe request fingerprinting/rate-limit patterns, and existing English/Arabic localization.
- **EXTEND:** the legacy `NearbyPreference`, report/request sources, legal-consent revocation, settings projections, analytics allowlists, and navigation.
- **NOT SUITABLE:** `User.allowNearbyDiscovery` alone, the legacy preference's `enabled`/`visibleUntil` fields alone, Card/VirtualCard identity, Branch/Profile address fields, Firebase identity/data stores, and client-owned radius/precision.
- **DEFER:** iOS, proximity notifications, background location, maps, exact-distance UX, messaging, Bluetooth/Wi-Fi/contact discovery, and any full experimentation/admin platform.

At baseline, Web sent a global `Permissions-Policy: geolocation=()` header; Android had no Nearby location acquisition flow. No repository geospatial dependency was required: the implementation uses a small server-owned geohash encoder.

# 3. Nearby Product Architecture

The implemented flow is:

1. An authenticated user opens Nearby.
2. The client fetches safe rollout/capability, current consent, preference, and presence state.
3. If needed, the user reads the product explanation and current reviewed Nearby notice, then explicitly accepts it.
4. The user explicitly chooses **Turn on Nearby**.
5. Only then does the client request foreground location.
6. The authenticated API validates the coordinate and immediately converts it to server-owned coarse cells.
7. A short-lived, generation-bound presence replaces any previous effective presence for that User.
8. Discovery applies rollout, consent, community, preference, presence, profile/publication, block, relationship, rate-limit, and sparse-area rules.
9. Results expose a safe social Profile projection, broad band, relationship state, and server-derived capabilities.
10. Turning Nearby off invalidates the generation and deletes presence; leaving the active surface stops collection and presence expires naturally.

No client creates friendships, changes profile identity, initializes location history, or authorizes itself.

# 4. Authority Boundaries

- PostgreSQL is authoritative for Nearby configuration, legal consent, preference, generation, presence, expiry, discovery eligibility, blocks, relationships, and rate-limit buckets.
- POP `User.id` is account identity; the Phase I selected social `Profile` is presentation identity.
- NextAuth is accepted for Web and the established POP bearer session is accepted for Android through the shared POP current-user resolver.
- Firebase ID tokens do not authorize any Nearby route. Firebase remains supplementary for privacy-safe analytics, Crashlytics, and existing FCM only.
- Device/browser APIs are authoritative only for obtaining a foreground coordinate. They do not choose server precision, range, TTL, or eligibility.

# 5. Feature Flag / Kill Switch

Typed configuration is stored under SystemSetting key `nearby.runtime.v1`. It independently controls Nearby availability, presence, and discovery and includes validated rollout, resolution, TTL, limits, and throttles. Missing, malformed, unknown, or out-of-range configuration resolves to OFF.

An example file is present at `packages/db/prisma/nearby-feature-config.example.json` with rollout `DISABLED`. No runtime setting was created or changed. Operators can later disable presence or discovery server-side without releasing new clients.

# 6. Rollout Foundation

Rollout states are `DISABLED`, `INTERNAL`, `LIMITED`, and `ENABLED`. The server resolves the current user's eligibility and returns only safe capability/status—not internal allowlists or rollout rules. This distinguishes global unavailability, rollout exclusion, user opt-out, and active opt-in without building an experimentation platform.

Current local operational state is fail-closed OFF because the example is not an active setting and no environment was modified.

# 7. Versioned Nearby Consent

Nearby uses the existing controlled `LegalDocument`/`UserLegalConsent` foundation with a `NEARBY_PRIVACY` document type. `UserLegalConsent.revokedAt` was added so active/revoked semantics are explicit. Presence and discovery require acceptance of the current active required document/version.

Turning Nearby off leaves a same-version acceptance reusable. Revocation or a new active version requires acceptance again. The Web explanation is clearly product copy, not final legal wording. No reviewed production Nearby legal document was invented or seeded.

# 8. Nearby Default / Opt-In

Nearby is OFF for new and existing users. Effective activation requires all of:

- `enabled = true`
- `discoverable = true`
- a positive server generation
- `activatedAt` set by the new explicit enable flow
- current consent and all server eligibility checks

The additive migration uses privacy-safe defaults and performs no backfill, inserts, or presence creation. Legacy rows cannot become effective opt-ins merely because an older `enabled` field happened to be true.

# 9. Audience Policy

The MVP audience is authenticated POP users eligible for community features who have current Community Guidelines consent, current Nearby consent, explicit Nearby activation, a valid selected social Profile, an unexpired active presence, and account/profile/publication states allowed by policy. Blocks in either direction exclude the pair.

The viewer and target do not need to be friends. Nearby is discovery, not automatic friendship.

# 10. Privacy Preferences

Nearby enablement/discoverability is distinct from normal `discoverableByProfileSearch`. Search visibility cannot imply Nearby consent and Nearby opt-in cannot silently change normal search.

Audience is server-owned through `NEARBY_PRIVACY` policy values. The current MVP policy remains deliberately bounded, and `allowFriendRequests = false` does not necessarily hide an otherwise eligible Profile; it removes the friend-request capability.

# 11. Android Permission Model

Android adds only `android.permission.ACCESS_COARSE_LOCATION`. It does not add `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, Bluetooth permissions, `NEARBY_WIFI_DEVICES`, or a location foreground service.

The native controller models not-requested, coarse granted, precise granted where the platform reports it, denied, permanently denied as a best-effort UI distinction, location services disabled, and unavailable/error states. It records only whether permission was requested; it never stores a coordinate. Even if a device supplies a precise fix, POP applies the same coarse server contract.

Permission is requested only after the user reads the explanation and presses the explicit enable action. Opening Settings or launching the application does not request it.

# 12. Android Lifecycle

Location work exists only while the Nearby Composable is the active destination and lifecycle is at least `STARTED`. The controller performs a one-shot, bounded foreground fix and periodic heartbeat only within that active in-memory session. App background, screen lock, destination exit, lifecycle stop, or disposal cancels acquisition/heartbeat; no service continues it.

The client heartbeat interval is 90 seconds. Leaving the screen clears the client token and lets server presence expire. Process recreation does not silently resume collection: the user must explicitly resume Nearby.

# 13. Web Geolocation / Lifecycle

Web calls `navigator.geolocation.getCurrentPosition` only after explicit activation, with `enableHighAccuracy: false` and bounded timeout/error handling. It handles denial, unavailability, unsupported browsers, timeout, hidden tabs, page exit, and sleep/resume without background collection.

The presence token remains in React memory. Heartbeats run only while the document is visible and the Nearby surface is active; visibility loss stops them and presence expires. The global geolocation-deny policy remains in place, with a smallest-scope same-origin self policy only for `/dashboard/nearby`; embedded origins are not enabled.

# 14. Presence Model

`NearbyPresence` stores one row per `userId` and contains the selected social Profile reference, coarse cell, cell version/resolution, generation, hashed session token, source, timestamps, and expiry. It does not contain latitude, longitude, accuracy, altitude, bearing, speed, or position history.

The unique User relation ensures one nearby person per account across devices. Presence is ephemeral state, not Profile, Card, VirtualCard, Branch, or address data.

# 15. Exact Coordinate Handling

The authenticated client sends a coordinate over the normal TLS API request. The route validates finite latitude/longitude ranges and does not echo rejected values. Server code immediately converts the values in request memory to the approved coarse representation. The raw values then fall out of scope and are neither persisted nor returned.

Coordinates are excluded from application/Prisma error metadata, response DTOs, analytics, AuditLog, Crashlytics attributes, Android Logcat, test snapshots, and this report.

# 16. Coarse Cell Strategy

The server uses geohash implemented locally in the Nearby domain, avoiding a new geospatial service or database extension. Geohash is used only as an internal coarse candidate index. Cell IDs are never client-visible.

This strategy fits the MVP because it is deterministic, server-controlled, bounded, easy to validate, and sufficient for neighborhood/local-area candidates without claiming meter accuracy.

# 17. Cell Resolution / Neighbor Query

Configuration selects geohash precision 6, validated within a narrow safe range. At precision 6, cells are approximately neighborhood scale; geometry varies by latitude, so the product deliberately describes broad surrounding areas rather than a fixed distance.

The server queries the current cell plus a bounded neighbor ring of 2 and derives privacy bands from cell relationships. The resulting local candidate area is roughly 3–6 km depending on latitude and cell geometry. Clients cannot send resolution, radius, neighbor depth, or cell identifiers.

# 18. Proximity Bands

Responses use only:

- `SAME_AREA`
- `NEARBY_AREA`
- `AROUND_THIS_AREA`

No exact or bounded numeric distance, direction, map coordinate, movement, cell, accuracy, or exact last-seen value is exposed. Results are grouped by broad band and use a stable five-minute pseudorandom order rather than nearest-person sorting.

# 19. TTL / Heartbeat

The example presence TTL is 600 seconds and runtime validation constrains it to 300–900 seconds. Server heartbeat acceptance is limited to at least 60 seconds; clients use 90 seconds while actively visible.

Every read filters on server time and `expiresAt`, so expiry correctness does not depend on a cleanup job. No background heartbeat or high-frequency GPS loop exists.

# 20. Presence Generation / Replay Protection

Each explicit enable creates a new positive generation and random session token. Only an HMAC-derived token hash is persisted. Heartbeats must match the current User generation and token hash and must target an unexpired presence.

Old-generation, stale-token, replayed, expired, or post-disable requests fail closed and cannot resurrect presence.

# 21. Multi-Device Semantics

Latest explicit enable wins. Starting Nearby on device B rotates the User generation/token and replaces device A's effective presence. Device A's subsequent heartbeat is rejected. Disabling from the current session increments generation and deletes presence; old devices cannot restore it.

The schema's unique `userId` presence and discovery self-deduplication ensure one User appears once.

# 22. Nearby OFF Semantics

OFF is authoritative and idempotent: the server disables/disarms the preference, increments generation, clears activation, and removes the presence transactionally. A second disable remains safe.

Any heartbeat racing OFF carries the old generation/token and is rejected. UI also removes local results/session state immediately, but server state—not the client projection—enforces privacy.

# 23. Discovery Eligibility

Eligibility is recalculated on authoritative reads and requires feature/rollout/discovery enabled, current Nearby and Community Guidelines consent, explicit preference activation, unexpired current presence, current selected Profile, active account/community state, permitted publication/visibility, and no block.

Self, expired, paused, archived, unpublished, private, invalid-consent, opted-out, and ineligible rollout targets are removed. Clients cannot override the predicates.

# 24. Block-First Filtering

UserBlock is queried in both directions before target projection. Blocked candidates are removed server-side without revealing which direction caused exclusion. Blocking from the Nearby UI removes the target immediately and authoritative refresh prevents reappearance.

A discovery/block race resolves in favor of the block on the next authoritative result. No cell or count side channel is returned.

# 25. Social Profile / Publication

The selected Phase I social Profile remains the only presentation identity. Nearby never uses User, Card, VirtualCard, or Branch as a new identity.

Profile/account publication is checked at read time, so social Profile changes, pause/archive, privacy changes, unpublish, or account inactivation fail closed without relying on stale presence data.

# 26. UNLISTED / PRIVATE Policy

The explicit MVP rule is:

- `PRIVATE`: always ineligible.
- `UNLISTED`: eligible only through the separate, explicit, current Nearby opt-in and all other Nearby requirements.
- `PAUSED`, `ARCHIVED`, or unpublished: ineligible.

UNLISTED Nearby eligibility does not change normal search/public-directory behavior.

# 27. Friend Projection

Non-friends receive only public social Profile publication allowed by Phase I. Accepted friends may receive the existing allowed `PUBLIC` plus `FRIENDS` projection when current relationship and publication rules permit it. `ONLY_ME` is never projected.

Relationship removal or a block immediately removes friend-only eligibility on the next authoritative read.

# 28. Capabilities Projection

The server returns relationship state and capabilities such as view, send/cancel/accept friend request, block, and report. They derive from current Phase I relationship, privacy, target settings, viewer authority, and block state.

Android and Web render these capabilities; they do not recreate authorization logic. `allowFriendRequests = false` results in no Add Friend capability.

# 29. Result Limits / Pagination

The example maximum is 20 results and configuration is capped at 30. The endpoint returns a single bounded page with no global/regional total, coordinate, cell, exact order key, client radius, or client precision. No city-wide directory is exposed.

Results use band-first, stable short-window randomized ordering. A cursor was intentionally not added because the MVP's bounded result set provides less enumeration surface.

# 30. Sparse-Area Privacy

Discovery suppresses results until the candidate set meets a configured minimum crowd size; the example minimum is 2. Responses do not distinguish “nobody nearby” from privacy suppression and do not expose counts per band/cell.

This reduces but cannot eliminate inference in very sparse areas. Nearby therefore remains explicit, temporary, rate-limited, approximate, and non-map-based.

# 31. Coordinate-Probing Threat Model

Threats reviewed include grid walking, binary-searching cell boundaries, rapid coordinate hopping, comparing response membership, replaying old sessions, creating repeated discovery requests, and using multiple accounts/devices.

Mitigations include server-owned resolution/range, bounded neighbors/results, no counts/cells/exact order, broad bands, sparse suppression, stable randomized ordering, current-presence requirement, User uniqueness, token/generation checks, cell-change throttling, and per-User/privacy-safe-fingerprint rate buckets.

# 32. Stalking Mitigations

Nearby has no map, exact distance, direction, movement trail, background updates, precise last seen, proximity push, contact matching, device radio discovery, or unsolicited messaging. Presence expires quickly and requires mutual feature eligibility for display.

Block-first filtering, reports, kill switches, limited output, opt-out, consent, publication rechecks, and rate limits provide layered controls. The product does not claim that a nearby user or their location is verified.

# 33. Abuse / Rate Limits

Validated example limits are:

- presence requests: 12 per 600 seconds
- discovery requests: 30 per 600 seconds
- enables: 6 per 3600 seconds
- coarse-cell changes: 3 per 600 seconds

`NearbyRateLimitBucket` stores aggregate counters/window state only, keyed to the relevant User and privacy-safe fingerprint where appropriate. Malformed/extreme coordinates, rapid hopping, and client attempts to inject radius/resolution are rejected. No invasive hardware fingerprint was introduced.

# 34. Location Spoofing Position

Device/browser coordinates are untrusted, spoofable input. Nearby is a coarse discovery hint, not a security, identity, attendance, or “verified nearby” signal.

Range validation, generation binding, cell-change limits, request throttles, and abuse reporting limit impact. The implementation does not pretend to detect all mock-location or VPN behavior and does not add hardware attestation/fingerprinting.

# 35. Retention

Raw coordinates have zero database retention. Active coarse presence is functionally retained only until its short `expiresAt`; expired rows are invisible immediately.

The cleanup tool removes expired presence older than 24 hours and rate buckets older than 48 hours when explicitly executed. This bounded operational grace supports safe cleanup without turning presence into history.

# 36. Cleanup

`packages/db/prisma/nearby-presence-cleanup.ts` is dry-run by default and supports explicit `--execute`. It reports aggregate counts only and does not print Users, Profiles, cells, coordinates, or tokens.

No scheduler was deployed and the script was not run against production. Cleanup is hygiene, not discovery correctness.

# 37. Settings Integration

Web and Android settings now expose Nearby status/manage entry and separate it from ordinary search discovery. Settings can explain state and navigate to the dedicated Nearby surface, but do not request location permission merely by being opened.

The legacy mobile preferences route rejects Nearby mutation so an older generic preferences payload cannot bypass the new consent/generation API.

# 38. Web UX

The native Web surface at `/dashboard/nearby` covers feature unavailable/rollout excluded, explanation, consent, OFF, acquiring, active results, sparse/empty, permission denial, timeout/unavailable, retry, and server-error states. A dedicated `/nearby-privacy` in-app page provides the safe explanation and links current legal content without accepting arbitrary URLs.

Results provide Profile and existing relationship actions according to server capabilities. Turning off or blocking removes local results immediately.

# 39. Android UX

The Compose Nearby screen uses the existing design system, in-memory session state, lifecycle awareness, explanatory/permission dialogs, full-width actions, loading/error/empty states, Settings recovery for permanent denial or services-off states, server-projected relationship actions, and existing Friends request navigation.

No map, precise distance, hidden tracking, or hardcoded layout direction was added. Location is requested only from the explicit action.

# 40. Block / Report Reuse

Nearby extends existing Phase I request/block/report source enums with `NEARBY`; it does not create duplicate systems. Block calls the existing authoritative block route and report uses the existing controlled report flow. No report includes coordinates/cells.

Friend request, cancel, accept-navigation, Profile view, block, and report continue to use Phase I contracts and policies.

# 41. Analytics

The existing privacy-safe Web and Android Firebase analytics wrappers were extended with allowlisted Nearby events/properties only. Events cover explanation/consent/enable/disable/presence/discovery/result/action states without adding a second analytics implementation.

Payloads exclude coordinates, cell, accuracy, distance, User/Profile IDs, phone/email, token, consent text, legal content, and raw errors.

# 42. Audit / Logging

Nearby security/audit records are intentionally low-data: action/category/outcome and aggregate operational status only. Admin status exposes effective feature state and an aggregate active-presence count, never identity or cell distribution.

Raw request location is not passed to logger, Prisma metadata, AuditLog, analytics, Crashlytics, Android Logcat, or client error responses. Presence session tokens are never stored raw.

# 43. FCM Behavior

No proximity FCM event, notification, background wakeup, or Nearby topic was added. Existing FCM remains supplementary and independent. FCM failure cannot create, extend, disable, or authorize Nearby presence.

# 44. Accessibility

Web actions are keyboard reachable, have associated labels, use status/error announcements where appropriate, preserve focus through state changes, and use accessible dialog/action semantics. Android uses Material semantics, readable state/error copy, large touch targets, accessible dialogs, and no color-only meaning.

Runtime screen-reader validation remains part of the physical QA matrix and was not claimed as run.

# 45. Localization / RTL

All new user-visible strings use the existing English/Arabic localization systems. Layout uses logical/alignment-aware components rather than hardcoded LTR direction. Normal UI says “Nearby” and understandable permission wording; it does not expose geohash, cell, TTL, or internal rollout terminology.

`pnpm i18n:audit` passed with 713 Web keys, 670 Android keys, zero hardcoded-string candidates, and 14 pre-existing possibly-unused dashboard keys.

# 46. APIs

Shared authenticated endpoints are:

- `GET /api/nearby`
- `GET /api/nearby/settings`
- `POST /api/nearby/consent`
- `DELETE /api/nearby/consent`
- `POST /api/nearby/presence`
- `DELETE /api/nearby/presence`
- `GET /api/admin/nearby/status`

The shared current-user resolver accepts NextAuth or established POP bearer authority and never Firebase authorization. Existing friend request, block, and report routes accept the `NEARBY` source. No Android-specific duplicate endpoint, client radius, or precision parameter was added.

# 47. Prisma Changes

Additive schema changes include:

- `NEARBY_PRIVACY` legal-document type and Nearby request/report source values
- `UserLegalConsent.revokedAt`
- `UserReport.source`
- explicit Nearby preference fields for discoverability, audience, generation, and activation
- `NearbyPresence` with one-row-per-User coarse ephemeral state
- `NearbyRateLimitBucket` for bounded abuse counters
- controlled Nearby presence source and rate-limit kind enums

No Card, VirtualCard, Profile, Branch, address, exact coordinate, location-history, Firestore, or Realtime Database model was added.

# 48. Migration

**NEW MIGRATION: YES**

Filename:

`packages/db/prisma/migrations/20260726210000_nearby_privacy_presence_foundation/migration.sql`

It is additive, create/alter-only, reviewable, and contains no data updates or presence creation.

**MIGRATION APPLIED: NO**

# 49. Migration Privacy Defaults

All new preference fields default to non-discoverable/unactivated values. No old boolean or preference is converted into consent. Existing Users receive no presence row and no inferred Nearby activation.

Effective eligibility additionally requires `discoverable = true`, a positive generation, and `activatedAt`, so even a legacy row with `enabled = true` remains OFF until the explicit new flow completes.

# 50. Automated Tests

- Focused Web Nearby policy/contract/component tests: 25 passed.
- Full Web suite: 62 files, 329 tests passed.
- Android debug unit tests: 23 suites, 97 tests passed; 0 failures, 0 errors, 0 skipped.
- Nearby-focused Android tests: 12 policy/contract tests included in the full result.

Coverage includes fail-closed flags/rollout, consent state/version/revocation, privacy defaults, coordinate/cell/DTO boundaries, presence generation/TTL/replay/multi-device semantics, discovery eligibility, result caps, block/profile/privacy projection, Web explicit geolocation timing/lifecycle contract, Android manifest/foreground permission contract, Firebase independence, and UI state/action behavior. No live Firebase, production database, emulator, or live device was used.

# 51. Build / Lint

Final local results:

- `pnpm db:generate`: PASS.
- `pnpm --filter @popwam/db lint`: PASS (Prisma validation and TypeScript).
- `pnpm --filter ./apps/web test`: PASS — 62 files / 329 tests.
- `pnpm --filter ./apps/web lint`: PASS.
- `pnpm --filter ./apps/web build`: PASS — 164 pages; Nearby routes included. The existing Edge-runtime static-generation warning remains non-fatal.
- `pnpm i18n:audit`: PASS.
- `apps/android/gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true`: PASS — 97 tests.
- `apps/android/gradlew.bat assembleDebug -Ppopwam.firebase.android.enabled=true`: PASS.
- `apps/android/gradlew.bat lintDebug -Ppopwam.firebase.android.enabled=true`: PASS — 0 errors, 103 warnings. Warnings are non-blocking, predominantly existing unused-resource/deprecation items; no Nearby lint error exists.

# 52. Runtime Device Status

`adb devices` returned only the header and no attached authorized device.

**ANDROID RUNTIME DEVICE TESTS: NOT RUN**

No emulator, AVD, or QEMU was created, started, or used. Browser geolocation runtime testing also was not available in this local validation.

# 53. Physical Device QA Matrix

Every item below is prepared but **NOT RUN**; none is claimed as passed.

Android:

| Scenario | Status | Expected verification |
| --- | --- | --- |
| Coarse permission granted | NOT RUN | Active foreground presence and broad bands only |
| Precise permission granted | NOT RUN | Same coarse POP semantics; no precise exposure |
| Permission denied | NOT RUN | Truthful denial UI; no presence |
| Permanently denied | NOT RUN | Settings recovery; no repeat-loop |
| Location services off | NOT RUN | Distinct services-off state |
| Nearby OFF | NOT RUN | No acquisition/presence/results |
| Nearby ON | NOT RUN | Explicit consent/action and bounded results |
| Screen lock | NOT RUN | Acquisition/heartbeat stops; natural expiry |
| App background | NOT RUN | No collection/service/heartbeat |
| Leaving Nearby tab | NOT RUN | Immediate client stop; natural expiry |
| Two sessions/devices | NOT RUN | Latest enable wins; stale device rejected |
| Social Profile change | NOT RUN | New current projection/fail-closed transition |
| Profile paused | NOT RUN | Target disappears |
| Block while visible | NOT RUN | Immediate removal and no reappearance |
| Report | NOT RUN | Existing safe Phase I report flow |
| Feature kill switch | NOT RUN | Presence/discovery fail closed |

Web:

| Scenario | Status | Expected verification |
| --- | --- | --- |
| Geolocation allow | NOT RUN | One-shot foreground acquisition |
| Deny | NOT RUN | Permission-safe error/retry |
| Unsupported | NOT RUN | Unsupported state; no presence |
| Timeout | NOT RUN | Timeout state; no raw error leak |
| Tab hidden | NOT RUN | Heartbeat/acquisition stops |
| Browser sleep/resume | NOT RUN | Expiry/re-explicit resume behavior |
| Permission revoked | NOT RUN | Fail closed with recovery |
| Nearby OFF/ON | NOT RUN | Explicit lifecycle and generation rotation |
| Feature kill switch | NOT RUN | Server state wins without client release |

# 54. iOS Boundary

iOS Nearby is explicitly deferred. No iOS permission, location, UI, or background integration was created or claimed. The server contract is platform-neutral for a future reviewed implementation.

# 55. Security Review

Verified in code/tests:

- OFF-by-default and current versioned consent requirements
- foreground-only Android/Web acquisition
- no background permission, location service, Bluetooth/Wi-Fi/contact discovery, or location notification
- no persisted/returned/logged coordinates, cell IDs, exact distances, or exact last seen
- server-owned resolution/range/bands/limits
- short server-time TTL independent of cleanup
- HMAC token, generation, stale-writer, replay, OFF-race, and multi-device controls
- block-first/private-direction filtering
- bounded output, sparse suppression, throttles, and no User-ID/count directory
- fail-closed kill switch/rollout/config
- POP authority only; Firebase cannot authorize Nearby
- no invasive hardware fingerprinting, new messaging, or automatic friendship

# 56. Privacy Review

Verified in code/tests:

- no long-term location history, map, movement/direction, exact distance, exact last seen, or proximity push
- no coordinates in responses, analytics, audit, Crashlytics, logs, Profile/Branch data, reports, or report content
- separate Nearby preference and search-discovery preference
- PRIVATE/paused/archived/unpublished fail closed
- explicit UNLISTED opt-in rule
- ONLY_ME excluded; FRIENDS projection relationship-gated
- deferred friend media is not embedded in Nearby results
- sparse-area and probing/stalking residual risks documented and mitigated
- consent is separate from OS permission and can be revoked/versioned

Residual privacy risk remains because any proximity-discovery product can be probed or spoofed. The product reduces that risk through approximation, bounded output, rate limits, sparse suppression, short-lived explicit presence, and abuse controls; it does not claim perfect location verification.

# 57. Remaining Gaps

1. A reviewed active required `NEARBY_PRIVACY` LegalDocument/version must be legally approved and published through a separately authorized operational process.
2. Current Community Guidelines availability must be confirmed in the target environment.
3. The additive migration must be reviewed and applied through an approved non-local release process; it was intentionally not applied here.
4. A valid `nearby.runtime.v1` SystemSetting must later be created initially in `DISABLED` state, reviewed, then deliberately rolled out. Missing configuration currently fails closed.
5. The Android physical-device and real-browser geolocation QA matrix remains not run.
6. No live migrated-database/API integration test was run because applying the migration and using production data were prohibited.
7. iOS remains deferred.

# 58. Phase J Exit Criteria

All applicable local implementation criteria pass: architecture, privacy/security defaults, consent model, foreground lifecycles, coarse presence, expiry/generation/multi-device controls, bounded discovery, block-first filtering, Phase I reuse, Web/Android shared authority, Firebase independence, localization, tests, builds, and lint.

Phase J is therefore **LOCAL FOUNDATION COMPLETE / EXIT CRITERIA PASS**, with operational activation intentionally blocked. It is not ready to enable for users until the migration, reviewed legal document, disabled-first runtime configuration, and physical Android/browser QA are completed under separate authorization.

No production migration, deployment, push, commit, configuration change, console change, production access, or emulator operation occurred.

# 59. Recommended Next Phase

The exact next phase should be **Phase J.1 — Controlled Nearby Activation and Physical-Device/Browser QA**:

1. legal review and publication of the versioned Nearby notice;
2. migration review/application through approved operations;
3. seed and verify fail-closed runtime configuration in `DISABLED`;
4. execute the full physical Android and supported-browser matrix;
5. complete security/privacy sign-off;
6. progress through `INTERNAL` then tightly bounded `LIMITED` rollout with privacy-safe aggregates and kill-switch drills.

Do not start a broader social feature until J.1 closes the operational evidence gaps. Recommended model: **GPT-5.6 Sol** with **Extra High reasoning**, because the work combines cross-platform lifecycle behavior, production rollout safety, legal/version state, database operations, and adversarial privacy validation.
