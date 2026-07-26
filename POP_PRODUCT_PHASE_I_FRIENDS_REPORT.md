# 1. Executive Summary

Phase I implements a local, server-authoritative Friends foundation for Web and Android. The delivered scope includes versioned community-policy gating, explicit social-profile and discovery setup, bounded profile search, mutual friend requests and friendships, directional favorite/mute preferences, block-first authorization, user reporting, an admin moderation foundation, durable anti-abuse checks, privacy-safe FCM events, authenticated FRIENDS profile projection, localization, and native Web/Compose experiences.

PostgreSQL remains authoritative. POP `User.id` remains the internal account identity, while clients receive only opaque/profile-safe identifiers. Firebase remains supplementary for analytics, Crashlytics, and best-effort FCM. No Nearby, contact-book upload, new messaging, Firestore, Realtime Database, or Firebase authorization was introduced.

Local implementation and automated exit checks pass. Runtime activation still requires the normal later release procedure: review/apply the additive migration and publish an approved active `COMMUNITY_GUIDELINES` legal-document version. Neither action was performed in this phase.

# 2. Existing Friends Audit

The audit found pre-existing mutual `Friendship`, `UserBlock`, `UserReport`, notification-preference, Profile publication/visibility, FCM, admin, and legacy Friends/chat UI foundations. These were extended where safe instead of creating competing authorities.

- **KEEP:** canonical `Friendship`, `UserBlock`, `UserReport`, `LegalDocument`, `UserLegalConsent`, Profile publication state, POP auth, mobile bearer auth, FCM token lifecycle, audit, and admin authorization.
- **EXTEND:** friendship compatibility, report lifecycle, typed social notification preference, immutable profile snapshots, viewer-aware projection, Settings, Web navigation, and Android APIs/navigation.
- **ADD:** relational friend requests, directional friend preferences, Friends privacy/configuration, notification-event outbox, community-policy type, shared Friends domain/state resolver, bounded APIs, and native clients.
- **LEGACY COMPATIBILITY:** historical Friendship rows are classified by a read-only dry-run tool; no existing relationship is rewritten automatically.

Pre-existing chat code remains outside Phase I. Its start/send paths were hardened to require a current accepted friendship and no block so that legacy messaging cannot bypass the new block-first policy. No new messaging feature was built.

# 3. Relationship State Machine

`apps/web/src/lib/friends-domain.ts` is the authoritative server coordinator and `apps/web/src/lib/friends-policy.ts` contains bounded policy/state helpers. The client-visible states are:

`NONE`, `OUTGOING_PENDING`, `INCOMING_PENDING`, `FRIENDS`, `BLOCKED_BY_ME`, and safe `UNAVAILABLE`.

Block state is evaluated before requests, friendships, preferences, discovery, notification delivery, and friend projection. A blocked target is not told the block direction. Removal resolves to `NONE`; unblock also resolves to `NONE` and never resurrects a friendship or request.

# 4. Friend Request Model

The additive relational `FriendRequest` model records requester, recipient, bounded source, status, creation/response/cancellation timestamps, optional expiry, and a revision. Statuses support `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, and `EXPIRED`.

Database indexes support requester/recipient pagination and pair lookup. The migration adds a PostgreSQL partial unique index so only one pending request can exist for a canonical pair. Expiry is modeled but no arbitrary automatic expiry policy was activated.

# 5. Friendship Model

The existing canonical `Friendship` row remains the mutual relationship authority. A sorted user pair and unique database constraint allow at most one mutual relationship per pair. Accepting a request creates or reuses this canonical row transactionally; the implementation does not create two independent friend rows.

Friendship DTOs use a stable opaque social key and safe Profile presentation fields. They do not expose raw `User.id`, email, phone, Firebase UID, FCM token, report state, session state, or moderation internals.

# 6. Directional Preferences

`FriendPreference` stores favorite and mute state per viewer/target direction. A preference is valid only while the pair is currently friends and no block exists. User A can favorite or mute User B without changing User B's state.

Favorite affects private sorting/quick access only. Mute suppresses eligible pair-specific social notifications only; it neither removes the friendship nor hides ordinary public content.

# 7. Blocking Architecture

`UserBlock` remains a unique directional, durable relation and is extended with a bounded source. Creating a block transactionally:

- creates/reuses the directional block;
- removes the canonical friendship;
- cancels pending pair requests;
- deletes pair preferences and cached friend-privacy state;
- suppresses queued pair notification events;
- writes a privacy-safe audit event.

Unblock removes only the blocker-owned row. It does not restore a friendship, request, preference, or notification.

# 8. Block-First Authorization

Every Friends mutation and projection revalidates both block directions on the server before softer relationship state. Search hides blocked pairs in both directions. Request creation/acceptance, favorite/mute, friend projection, and notification delivery all fail closed when either direction is blocked.

The blocker may see their own `BLOCKED_BY_ME` state and blocked-user Settings entry. The target receives only a generic unavailable/cannot-complete result; no endpoint exposes `BLOCKED_ME` as a target-facing explanation.

# 9. Request Creation

Request creation verifies POP authentication, policy acceptance, explicit Friends setup, recipient eligibility, non-self targeting, account/profile publication state, discovery/request privacy, no block, no friendship, no active request, cooldowns, pending caps, and durable request volume.

The chosen cross-request policy is conservative: opposite simultaneous attempts normalize to one pending request requiring explicit recipient acceptance. They do not auto-create friendship. The operation uses canonical pair locking and a Serializable transaction.

# 10. Accept / Reject / Cancel

Only the recipient may accept or reject. Only the requester may cancel. Every action locks/revalidates the request and pair state and uses idempotent terminal-state handling.

Accept creates/reuses the canonical mutual Friendship, marks the request accepted, cancels conflicting pending pair requests, and records audit/notification events. Double accept cannot create duplicate friendship. Reject starts the configured same-target cooldown and exposes no reason. Cancel cannot undo an accepted friendship.

# 11. Remove Friend

Either member of a current friendship can remove the canonical row. Removal also deletes pair preferences and invalidates access derived from friendship. It does not block either party and does not create an inflammatory notification.

After removal, server projection immediately stops returning FRIENDS content. A later relationship requires a new request and acceptance.

# 12. Favorite / Mute

The shared `PATCH /api/friends/[friendKey]` route supports bounded `favorite` and `muted` updates for current friends only. `DELETE` removes the friendship. Directional values are private and included only in the acting user's safe DTO.

Favorite/mute actions are available in Web and Android action surfaces. They are not public, do not generate pair notifications, and do not weaken block behavior.

# 13. Community Policy

Phase I reuses `LegalDocument` and `UserLegalConsent` with a distinct `COMMUNITY_GUIDELINES` document type. Account onboarding still considers only Terms and Privacy, so Friends policy changes cannot accidentally block global POP authentication.

The Friends gate fetches the active required server version and requires current-version acceptance before discovery, request creation/acceptance, and reporting. An active-version change naturally requires reacceptance.

The in-app `/community-guidelines` page provides trusted English/Arabic context, but no unreviewed legal version was silently seeded. A reviewed active database document must be published through the normal later release/admin process before runtime activation.

# 14. Friends Privacy

`FriendsPreference` stores explicit `allowFriendRequests`, `discoverableByProfileSearch`, selected `socialProfileId`, configuration timestamps, and revision state. Discovery defaults to false. First-time setup is explicit and lightweight:

community policy → social Profile → Friends privacy → Friends.

Legacy/default data does not silently count as a deliberate privacy selection because profile and privacy configuration timestamps are tracked separately.

# 15. Discovery

Discovery uses PostgreSQL only. Results require:

- explicit discovery opt-in;
- current policy/setup;
- an eligible selected social Profile;
- published `PUBLIC` Profile visibility;
- active account/profile state;
- no block in either direction.

Search fields are limited to safe public display name and public username/slug. No phone/email lookup or account-existence endpoint was added.

# 16. Search Enumeration Protection

Search input is NFKC-normalized, supports Arabic and English, and has a 2–64 character bound. Results are capped at 20 per page, use bounded cursor behavior, omit global totals, filter blocked/ineligible rows, and are protected by rate limiting.

The server does not accept user regex, expose raw database IDs, or return exact email/phone matches. Search text is not sent to analytics or audit logs.

# 17. Social Profile Selection

Friends setup requires the user to explicitly select one owned eligible Profile as their social presentation. The server validates ownership, publication state, and supported visibility. The selection is stored on `FriendsPreference`; Card/VirtualCard is not used as account identity.

Profile-safe response data includes the selected Profile's public presentation and opaque social key, not internal User identity.

# 18. Friend Projection

`apps/web/src/lib/profile-projection.ts` adds a viewer-aware authenticated friend projection. It requires a current accepted friendship, no block, the owner's selected social Profile, and a published `PUBLIC` or `UNLISTED` Profile.

`UNLISTED` is available to an already accepted friend through authenticated projection but remains absent from anonymous search/discovery. `PRIVATE` fails closed for non-owners.

# 19. FRIENDS Visibility

Immutable publication snapshots now retain modules and dependent content marked `PUBLIC` or `FRIENDS`. Anonymous/public projection still returns `PUBLIC` only. The authenticated friend projection may add `FRIENDS` content only for an accepted, unblocked friend.

`ONLY_ME` remains owner-only and is never unlocked by friendship. Removing/blocking invalidates client state and server access immediately.

# 20. Friend Media

Profile media remains fail-closed at `PUBLIC` visibility in Phase I. The public media route explicitly checks `PUBLIC`; no signed FRIENDS media-delivery contract was invented.

FRIENDS module/content projection is implemented. FRIENDS media rendering is intentionally deferred until a dedicated authenticated/signed delivery design exists. This is a safe scope gap, not a privacy bypass.

# 21. Friend Lists / Requests

Shared routes return bounded Friends, incoming requests, sent requests, and the PostgreSQL-authoritative pending incoming count. Web and Android provide Friends/Requests/Search/Privacy/Blocked surfaces and an in-list current-friends filter.

Current-friend filtering is client-local over an already authorized friend page and does not emit search text. Request actions remain server-authoritative.

# 22. Notification Events

`FriendNotificationEvent` is a PostgreSQL event/outbox foundation with bounded types:

- `FRIEND_REQUEST_RECEIVED`
- `FRIEND_REQUEST_ACCEPTED`

Events record delivery status and timestamps separately from relationship state. No notification is generated for search, favorite, mute, block, report, or routine removal.

# 23. FCM Behavior

FCM delivery is best-effort after the authoritative database transaction commits. Delivery rechecks current block state, request relevance, typed `socialEnabled` preference, and directional mute before sending.

Payloads are generic (`type` plus a Friends action) and contain no phone, email, internal IDs, report text, block state, Firebase UID, or FCM token. Missing/failed FCM never rolls back a request or friendship. Invalid failed tokens are revoked best-effort.

# 24. Reporting

`POST /api/reports` accepts only controlled categories:

`SPAM`, `HARASSMENT`, `IMPERSONATION`, `INAPPROPRIATE_CONTENT`, `SCAM`, `PRIVACY`, and `OTHER`.

Optional details are plain text and limited to 500 characters. Reports are private, rate-limited, coalesced where appropriate, and return only generic receipt status. The target cannot read reporter identity, text, or moderation status. Reporting and blocking remain separate explicit actions.

# 25. Moderation Foundation

The admin-only moderation queue/detail flow supports `OPEN`, `REVIEWING`, `ACTIONED`, and `DISMISSED`, with legacy `RESOLVED` compatibility. Private notes, review timestamps, reviewer identity, and bounded resolution codes are server/admin only.

Status changes write an audit event. No report count or individual report automatically warns, suspends, blocks, or bans a user.

# 26. Spam Controls

Request creation combines durable PostgreSQL history checks with a process-local limiter as defense in depth. Durable checks cover account volume, recipient volume, pending cap, same-target rejection cooldown, and current relationship/block state.

Search uses a lightweight process limiter and bounded output because harmless search terms are not persisted. Reports use durable database history and duplicate/coalescing rules. No large append-only log of search text was created.

# 27. Rate Limits / Cooldowns

Implemented bounds:

- outgoing requests: 20/hour;
- newly created accounts: 5/hour;
- outgoing requests: 50/day;
- active outgoing pending cap: 100;
- recipient intake: 100/hour;
- same-target rejection cooldown: 7 days;
- reports: 10/day;
- search: bounded process-local window plus 20-result pages.

Limit errors are generic and privacy-safe. Major denied abuse actions can be audited without target/search/report content.

# 28. Concurrency

Pair mutations lock users in deterministic canonical order and run in Prisma Serializable transactions. The database unique constraints remain the final correctness boundary.

Duplicate/cross request, double accept, double block, cancel/accept, remove/block, and accept/block paths re-read authoritative rows inside the transaction. Retry-safe behavior returns/re-fetches current state instead of creating local duplicate relationship state.

# 29. Block Races

Block, accept, and remove use the same canonical lock order. If block races with accept, block either prevents acceptance on revalidation or follows it and deletes the new friendship; the final block persists and the pair is not friends.

Block/remove is idempotent and fail-closed. Double block reuses the unique row without duplicate destructive effects; double unblock returns the already-unblocked state and restores nothing.

# 30. Web UX

The native Web Friends center includes:

- first-time policy/profile/privacy setup;
- Friends, Requests, Search, Privacy, and Blocked tabs;
- incoming accept/decline and sent cancel;
- favorite, mute, remove, block, unblock, and report;
- explicit destructive confirmations;
- report confirmation followed by an optional explicit block prompt;
- loading, empty, retry, and unavailable states;
- Settings deep links and authenticated Profile relationship CTA.

Anonymous Profile behavior remains unchanged except for a safe optional authenticated CTA.

# 31. Android UX

The native Compose Friends screen uses the same authenticated server APIs and contains policy/profile/privacy setup, tab/filter chips, bounded search, Profile cards, request actions, preference actions, block/remove confirmations, report sheets, retry/loading/empty states, and Settings deep links.

It uses no WebView. The trusted community-policy page opens through the existing Custom Tabs approach. FCM/analytics failures remain non-fatal and do not change POP relationship state.

# 32. Privacy Settings

Web and Android expose:

- Allow friend requests;
- Show me in POP friend search;
- Social/friends notification category;
- selected social Profile;
- Blocked users.

Settings remain simple; no custom audience, phone/email discovery, contacts matching, location, or Nearby toggle was introduced.

# 33. Blocked Users

`GET /api/blocks` lists only users the current user blocked and returns safe presentation data plus an opaque block identifier. `DELETE /api/blocks/[blockId]` can remove only the acting user's own block.

People who blocked the current user are never listed. Unblock is available from Web and Android Settings and clearly does not restore friendship.

# 34. Localization / RTL

All new user-visible copy uses the existing English/Arabic localization architecture. Search normalization permits Arabic text, UI direction is inherited rather than hardcoded, and Compose/Web layouts avoid ASCII-only assumptions.

`pnpm i18n:audit` passed with 656 Web keys, 630 Android keys, zero hardcoded candidates, and 14 informational possibly-unused legacy candidates.

# 35. Accessibility

Web controls use native buttons/labels, keyboard-operable tabs/actions, dialog/sheet semantics, explicit status/error content, and full-width actions. Android uses large touch targets, readable destructive labels, accessible non-swipe alternatives, clear tab labels, IME handling, and TalkBack-compatible Compose controls.

Destructive actions always require an explicit accessible choice. No behavior is swipe-only.

# 36. Analytics

The existing privacy-safe Web/Android Firebase analytics wrappers permit only:

`friends_viewed`, `friend_search_used`, `friend_request_sent`, `friend_request_accepted`, `friend_request_rejected`, `friend_removed`, `friend_favorited`, `friend_muted`, `user_blocked`, `user_unblocked`, and `report_submitted`.

Allowed properties are bounded values such as platform, outcome, action type, report category, and relationship state. No target identity, search text, display name, slug, phone, email, report details, User ID, Profile ID, Firebase UID, token, or block direction is emitted.

# 37. Audit

Server AuditLog records privacy-safe events for friendship creation/removal, block/unblock, report submission, moderation status change, and selected abuse-limit events. Metadata is bounded and excludes search text, report free text, names, phones, emails, and Firebase/device/session identifiers.

Favorite/mute/search are intentionally not written as high-volume audit events.

# 38. Security Review

Verified by policy/contract tests and code inspection:

- block-first server enforcement;
- no target-facing block-direction disclosure;
- no raw User IDs/email/phone in Friends DTOs;
- no Firebase ID-token authorization;
- NextAuth or POP Android bearer only;
- same-origin CSRF retained for cookie-authenticated mutations;
- no FRIENDS projection without accepted friendship;
- no ONLY_ME projection to friends;
- immediate loss of derived access after block/remove;
- canonical locks plus unique constraints for races;
- private report/moderation state;
- bounded discovery and abuse controls;
- FCM cannot affect relationship authority.

# 39. Privacy Review

Search text, friend identity, block direction, and report details are excluded from analytics. Search is opt-in and presentation-only. Public projection was not weakened. Friend projection includes only allowed published visibility and rechecks block/current friendship.

No contact-book collection/upload, phone/email directory, background location, Nearby, new messaging, Firestore, or Realtime Database was added.

# 40. APIs

Shared Web/Android authenticated routes:

- `GET /api/friends`
- `GET`, `POST /api/friends/requests`
- `POST /api/friends/requests/[requestId]/accept`
- `POST /api/friends/requests/[requestId]/reject`
- `DELETE /api/friends/requests/[requestId]`
- `GET /api/friends/search`
- `PATCH`, `DELETE /api/friends/[friendKey]`
- `GET`, `PATCH /api/friends/settings`
- `GET`, `POST /api/friends/community-policy`
- `GET /api/friends/relationship`
- `GET`, `POST /api/blocks`
- `DELETE /api/blocks/[blockId]`
- `POST /api/reports`

Routes use the existing shared POP current-user resolver: Web NextAuth or Android POP bearer. Firebase is never POP authorization. Cookie mutations retain trusted-origin CSRF enforcement.

# 41. Prisma Changes

The Prisma schema additively introduces/extends:

- `FriendRequest`;
- `FriendPreference`;
- `FriendsPreference`;
- `FriendNotificationEvent`;
- friend request/source/status enums;
- block source;
- report categories/status lifecycle;
- typed social notification preference;
- community-guidelines legal type;
- Profile revision media visibility;
- indexes and pair/direction uniqueness.

The existing canonical `Friendship`, `UserBlock`, `UserReport`, Profile, consent, and POP User models remain authoritative.

# 42. Migration

**NEW MIGRATION: YES**

`packages/db/prisma/migrations/20260726120000_friends_privacy_abuse_foundation/migration.sql`

The migration is additive/create-only for the Phase I foundation and includes the partial pending-request uniqueness index. It contains no production data rewrite.

**MIGRATION APPLIED: NO**

No local or production migration was applied and no database was modified.

# 43. Legacy Friend Compatibility

Existing Friendship rows remain readable. The server supports historical `legacy_` friendship/request presentation where required without silently declaring ambiguous one-sided data valid.

No production row is deleted, merged, promoted, or selected by the implementation. Ambiguous/block-conflict/duplicate data is left for explicit review.

# 44. Backfill Dry Run

`packages/db/prisma/friends-backfill-report.ts` is a read-only classifier for:

`VALID_MUTUAL`, `ONE_SIDED_LEGACY`, `DUPLICATE`, `BLOCK_CONFLICT`, and `AMBIGUOUS`.

It outputs aggregate counts and one-way opaque hashes only—never names, phones, emails, report content, or raw IDs. **BACKFILL DRY RUN: NOT RUN**, because no database access or mutation was required/authorized in this local phase.

# 45. Automated Tests

- Web: **PASS**, 59 files and 304 tests.
- Android JVM: **PASS**, 85 tests, 0 failures, 0 errors, 0 skipped.
- Friends policy/contract coverage includes state resolution, block-first behavior, discovery bounds, visibility, DTO/push privacy, shared auth and CSRF, Serializable/canonical locking, unique constraints, request roles, block cleanup, policy/setup stages, Arabic/English normalization, safe blocked state, controlled reports, and FCM independence.
- Existing Web publishing/auth/security regressions remain green.
- No live Firebase dependency and no emulator were used.

# 46. Build / Lint

Final local results:

- `pnpm db:generate` — **PASS**
- `pnpm --filter @popwam/db lint` — **PASS**
- `pnpm --filter ./apps/web lint` — **PASS**
- `pnpm --filter ./apps/web test` — **PASS** (59 files, 304 tests)
- `pnpm --filter ./apps/web build` — **PASS** (Next.js production compile, type check, and 157 static pages)
- `pnpm i18n:audit` — **PASS** (0 hardcoded candidates; 14 informational possibly-unused candidates)
- `apps/android/gradlew.bat testDebugUnitTest -Ppopwam.firebase.android.enabled=true` — **PASS** from `apps/android` with the property quoted for PowerShell (85 tests)
- `apps/android/gradlew.bat assembleDebug -Ppopwam.firebase.android.enabled=true` — **PASS**
- `apps/android/gradlew.bat lintDebug -Ppopwam.firebase.android.enabled=true` — **PASS**
- `git diff --check` — **PASS**; Git reports line-ending conversion notices only, not whitespace errors.

Android compilation reports non-blocking deprecated icon/menu-anchor and Gradle-feature warnings. No Phase I build or lint error remains.

# 47. Runtime Device Status

`adb devices` returned an empty attached-device list.

**ANDROID RUNTIME DEVICE TESTS: NOT RUN**

No emulator, AVD, or QEMU process was created, started, or used.

# 48. Remaining Gaps

No local implementation blocker remains. Release/runtime prerequisites and intentionally deferred scope are:

1. Review and later apply the additive Phase I migration through the authorized release process.
2. Publish an approved active/versioned `COMMUNITY_GUIDELINES` LegalDocument; the implementation intentionally does not invent legal text/version.
3. Run physical-device Web/Android end-to-end validation when a real authorized device is available.
4. Run the read-only legacy backfill classifier against the intended non-production/approved data source before any future remediation.
5. FRIENDS media delivery remains fail-closed/deferred pending a dedicated authenticated signed-media contract.
6. Address existing Android/Gradle deprecation warnings during routine maintenance.

# 49. Phase I Exit Criteria

**PHASE I LOCAL IMPLEMENTATION EXIT: PASSED.**

All 29 requested architectural/safety criteria are represented and the requested tests/builds/lints pass. Mutual friendship, controlled requests, race-safe uniqueness, block-first behavior, private directional preferences, versioned policy architecture, explicit discovery, safe projection, reporting/moderation, anti-abuse controls, supplementary FCM, and shared Web/Android server rules are implemented.

This status does not claim production activation. Production use remains conditional on the intentionally unapplied migration and an approved active community-policy document. No production runtime or physical-device result was fabricated.

# 50. Recommended Next Phase

**Recommended next phase: Phase J — Nearby / Opt-in Proximity Discovery Foundation**, only after the Phase I migration/policy are reviewed and Friends privacy has been validated on a real device.

Phase J should remain a separate explicit-consent project: foreground-first, coarse/ephemeral proximity where possible, no background location by default, no exact coordinate exposure, no location-based identity enumeration, block-first filtering, strict retention, kill switches, and no automatic friendship.

Recommended Codex configuration: **GPT-5.6 Sol with max reasoning**. OpenAI's current model guidance identifies `gpt-5.6-sol` as the flagship-capability GPT-5.6 model and documents `max` reasoning for demanding work requiring more exploration and verification. Phase J's combined Android/Web permission, geospatial privacy, abuse, concurrency, and threat-model work warrants that setting. Source: <https://developers.openai.com/api/docs/guides/latest-model>.

Safety closeout:

- NO DEPLOY
- NO PUSH
- NO COMMIT
- NO GIT ADD
- NO PRODUCTION MIGRATION
- NO PRODUCTION DB CHANGE
- NO RAILWAY CHANGE
- NO FIREBASE CONSOLE CHANGE
- NO META CHANGE
- NO NEARBY
- NO CONTACT BOOK UPLOAD
- NO NEW MESSAGING
- NO EMULATOR / AVD / QEMU
