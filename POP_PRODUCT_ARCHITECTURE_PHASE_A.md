# 1. Executive Summary

POP should evolve from a card-first product into a profile-first product: `User -> Profile -> ProfileTemplate/Category -> enabled Modules -> public presence and sharing artifacts`. PostgreSQL `User.id` remains the sole application identity. Firebase UIDs remain supplementary external identities, phone OTP remains verification/recovery, passkeys become the preferred repeat authenticator, NextAuth remains the web-session authority, and POP access/rotating-refresh tokens remain the Android-session authority.

The repository already has an additive foundation for this direction: `Profile`, `VirtualCard`, `Destination`, `ProfileField`, `UploadedFile`, `ProfileService`, `ProfileBranch`, `ProfileTemplate`, plans, connected accounts, friends, chats, device/session records, and physical-card activation. The main problem is not the absence of a profile table; it is that the current data and routes divide one user-facing identity across `Profile`, `VirtualCard`, `Card`, and card-oriented names.

Recommendation: evolve the existing `Profile` table into the canonical logical POP profile; do not create a parallel `UserProfile` table. Add a controlled relational profile-module layer and progressively point physical cards, QR, NFC, HCE, wallets, and share links at profiles or destinations. Keep existing public and activation URLs working during an additive, backfilled migration.

## Decision table: Card vs. Profile relationship

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| A. Rename `Card` to `Profile` | Familiar name in old UI; fewer apparent concepts | Loses physical inventory, serial, production, activation, NFC, and transfer meaning; breaks URLs and integrations | Very high, destructive | Reject |
| B. Make `Card` only a profile presentation | Reduces one relation | Cannot represent unassigned stock or a single product changing its destination/profile | High | Reject |
| C. Keep card-centric ownership | Reuses current flows unchanged | Preserves the false `User -> Card` product definition and blocks profile-only users | Low now, high later | Reject |
| D. Keep `Card` as a physical/digital sharing artifact bound to a `Profile` or `Destination` | Matches current serial/activation/inventory data; supports profile-only users and many cards per profile | Requires additive bindings and UI terminology cleanup | Medium, additive | Adopt |

# 2. Current Product Architecture

The current authoritative implementation is a Next.js web application, Android Compose client, Prisma/PostgreSQL schema, Cloudflare R2-compatible public storage, and Railway-oriented application execution. The schema contains 80+ models and already makes PostgreSQL the system of record for product, profile, plan, social, and operational data.

Current identity and session flows are sound in principle:

- `User.id` is a CUID primary key. Phone fields and `phoneVerifiedAt` are stored on `User`.
- Web OTP creates/updates a POP user, records a short-lived `AuthTicket`, and enters the existing NextAuth flow. Android OTP issues a 15-minute bearer token and a rotating, hashed `MobileRefreshToken` with a 30-day expiry.
- Passkeys are stored in `PasskeyCredential`; challenges are hashed, expiring, single-use `PasskeyChallenge` records.
- Firebase Phase 1/2 added an optional `ExternalIdentity` mapping. The reports explicitly preserve POP user, OTP, passkeys, NextAuth, and mobile tokens as authorities. Firebase guest identity does not create a POP user.

The current profile/public-presentment path is `User -> Profile -> VirtualCard -> Destination/Card/Tag`. `Profile` stores identity, contacts, public-visibility booleans, media URLs, and some social URLs. `VirtualCard` is a one-to-one presentation record for a profile (`profileId @unique`) and supplies a selected template and default-card flag. `Card` separately stores physical-product facts and optional links to a profile, virtual card, or destination. `Tag` is a parallel legacy share artifact.

The existing public routes `/p/[slug]`, `/p/id/[profileId]`, `/[shortCode]`, and `/t/[token]` resolve public profiles or physical/legacy tags. The public tag page already resolves an active destination, supports profile or redirect modes, and records card/tag opens. Android lists profiles and cards separately, can select a profile during activation, and writes/reads a permanent public-card URL through NFC/HCE.

# 3. New POP Product Definition

POP is a digital-presence platform. A POP user receives one primary profile and may receive additional profiles through plans, products, entitlements, subscriptions, or administrator grants. A physical card, QR code, wallet pass, NFC tag, HCE URL, and individual link are share mechanisms for a profile or destination; none defines the user’s product identity.

Logical target:

```text
POP User (authoritative PostgreSQL identity)
  └─ Profiles (one primary; zero or more additional)
      ├─ type: PERSONAL or BUSINESS
      ├─ category/purpose and template
      ├─ enabled profile modules
      ├─ draft and published presentation
      ├─ public/friends/private visibility policy
      └─ sharing bindings
          ├─ physical cards/tags/NFC/HCE
          ├─ QR and native share
          ├─ wallet pass
          └─ selected links/destinations
```

`Organization` and `Membership` remain useful when a business needs multiple staff managers. They must not be a prerequisite for every business profile: an owner can first own a business profile directly, then attach an organization/team when needed.

# 4. Current Card-Centric Assumptions

The repository has several assumptions to unwind gradually:

1. Profile creation calls its user-facing type `cardType`, creates a `VirtualCard`, and creates profile/VCF destinations in one transaction.
2. `VirtualCard.profileId` is unique, so every existing profile is represented as exactly one virtual card.
3. `Card` assignment selects the first personal profile and its virtual card; activation binds a card to one selected profile.
4. Android exposes separate Cards, Profiles, NFC, HCE, Wallet, and Links routes rather than a unified profile/share center.
5. `CardImportedField` imports data into a `VirtualCard`, not the profile/module where the data is rendered.
6. Public reads combine profile details with card/tag routing. Card open analytics are recorded on public visits.
7. Plans have both `maxProfiles` and `maxVirtualCards`, although the current one-to-one rule makes those quotas partially duplicated.

These are names and coupling points, not a reason to delete working data. Existing `Card` fields (`serialNumber`, `publicSlug`, `publicToken`, activation hash, batch/production links, inventory and assignment status, locks, transfer and status history) prove that it should remain a physical-product entity.

# 5. Recommended User → Profile Architecture

Use the existing `Profile` record as the canonical profile aggregate and extend it additively. Every profile has a stable internal CUID, owner user, optional organization/team owner, kind (`PERSONAL`/`BUSINESS`), category/template, display label, public name, mutable slug, lifecycle state, primary designation, and sharing relations.

Recommended ownership rules:

- `Profile.userId` is the accountable POP user and authorization root.
- `Profile.organizationId` is optional collaboration/administration scope, not a substitute for `userId`.
- Add `isPrimary` (enforced as one current primary per user in service logic and database constraint strategy), `profileKind`, `categoryId`, `templateId`, `status`, `publishedAt`, `archivedAt`, and `entitlementSourceId`/grant relation later.
- Retain `displayLabel` as a mutable user-facing selector name. Keep public `displayName` distinct from internal ID and optional public slug.
- A physical `Card` and legacy `Tag` bind to a profile and, optionally, a specific share target. A profile may have no card; it may also have many cards/tags.

Avoid using `User.defaultSharingCardId` as the conceptual primary profile. Migrate its semantic successor to a `primaryProfileId` or a profile-scoped default share binding after backfill, while preserving the old field/routes until consumers are moved.

# 6. Profile Model

Keep normalized columns for universal identity and routing data: owner, labels/names, slug, type/category/template identifiers, avatar/logo/cover references, lifecycle, primary flag, public settings, timestamps, and audit ownership. Move profession-specific optional content out of the ever-growing `Profile` row into modules and module-owned relations.

The present `Profile` is an appropriate seed but has many nullable, display-specific columns (`facebook`, `linkedin`, `github`, `tiktok`, individual phone toggles, individual media toggles). Do not immediately remove them. Mark them as legacy write/read fields, introduce canonical module records, dual-read/dual-write only where necessary, backfill, then retire old writes after all clients read modules.

Use IDs, database enums for stable security/lifecycle states, and localized rows or `{nameAr, nameEn}` where the product currently uses Arabic/English. Do not put arbitrary user content into a general profile JSON column.

# 7. Primary and Additional Profiles

Every new POP user should receive one primary profile during onboarding. The profile is not a card and should exist even if the user owns no physical product.

Recommended fields and rules:

| Concept | Recommendation |
| --- | --- |
| Internal ID | Stable CUID, never user-facing or mutable |
| Primary | `isPrimary`; exactly one non-archived primary profile per user |
| Selector label | Mutable `displayLabel`, e.g. “Mamdouh – freelance” |
| Public name | Mutable public display name separate from selector label |
| Slug | Mutable unique public slug with a slug-history/redirect policy before changing current URLs |
| Status | `DRAFT`, `PUBLISHED`, `PAUSED`, `ARCHIVED`; preserve existing `isPublic` until migrated |
| Entitlement | A `ProfileEntitlement`/grant provenance relation instead of inferring rights from a card |

The existing `Plan.maxProfiles`, `UserPlan`, and `UserLimitOverride` can enforce the first additional-profile limit. Reconcile `maxVirtualCards` with `maxProfiles`: after virtual cards become a presentation/share compatibility layer, profile count should be authoritative and virtual-card limits should be treated as legacy until retired. Purchases or administrator grants should create a durable entitlement/grant record with source type, source ID, active period, and audit event rather than permanently changing quota fields.

# 8. Profile Modules Architecture

Introduce a relational `ProfileModule` instance model. It is required because neither the present wide `Profile` table nor an uncontrolled JSON document can support composable personal and business profiles safely.

Recommended model outline:

```text
ProfileModuleDefinition (controlled catalogue: kind, schema version, capability flags)
ProfileModule          (profileId, kind, enabled, visibility, sortOrder, status, configurationVersion)
ProfileModuleRule      (template/category allowed/required/default rules)
```

Each module uses typed relational content where the data is queried, secured, ordered, or shared: `ProfileContactMethod`, `Destination`/future `ProfileLink`, gallery media joins, `Catalog`, `Branch`, and portfolio entries. A small schema-versioned `configuration` JSON object is permitted only for presentation choices or tightly validated module settings; it must have a published JSON schema, size limit, allowlisted keys, validation on every write, and no PII/content source of truth.

Module kinds should include `IDENTITY`, `ABOUT`, `CONTACT`, `SOCIAL`, `LINKS`, `GALLERY`, `SERVICES`, `PORTFOLIO`, `BRANCHES`, `CATALOG`, `BOOKING`, `OFFERS`, and `CUSTOM`. `CUSTOM` means a controlled custom-field or approved module definition, not executable HTML, arbitrary forms, or arbitrary remote data sources.

## Decision table: Profile modules, relational models vs. JSON configuration

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| One profile JSON document | Fast prototype; flexible | Poor constraints, querying, privacy, publication, auditing, and migration; silent schema drift | Low initially, extreme later | Reject |
| Wide profile with nullable columns | Simple reads | Unbounded schema growth, profession coupling, awkward visibility | Medium repeatedly | Reject for new content |
| Fully generic EAV for all fields | Flexible schemas | Weak types/integrity, slow complex queries, difficult publishing | High | Reject |
| Relational module instances plus typed relations and bounded configuration JSON | Composable, queryable, auditable, localized, template-driven | More entities and validation work | Medium, additive | Adopt |

# 9. Personal Profile Templates

Personal templates should configure purpose and module defaults, not create separate data schemas. Initial purposes can include ordinary personal, digital business card, freelancer, professional, portfolio, and creator.

Examples: a personal profile enables Identity, About, Contact, Links, and Social; a freelancer adds Services and Portfolio; a creator adds Gallery, Social, and Portfolio. Interests, skills, profession, and custom content should be module-owned structured fields. Existing `ProfessionType` is a small, useful legacy vocabulary; extend with a managed category/purpose table rather than continually adding enum values for every profession.

`ProfileTemplate.configuration` currently exists and can remain as controlled template presentation/configuration. Add relational template-module rules and onboarding-definition references so the JSON does not become the authoritative module/data model.

# 10. Business Profile Templates

Business profiles use `CATEGORY -> TEMPLATE -> MODULES`. Restaurant, clinic, salon, supermarket, agency, company, and other categories share a profile shell but activate different module combinations.

Examples:

- Restaurant: Identity, Contact, Hours, Branches, Gallery, Catalog/Menu.
- Clinic: Identity, Contact, Hours, Branches, Services, Gallery; Booking is listed but disabled until built.
- Salon: Identity, Contact, Hours, Branches, Services/Pricing, Gallery; Booking later.
- Retail: Identity, Contact, Branches, Catalog, Offers placeholder; ordering/delivery later.

## Decision table: Business templates

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| Separate hardcoded form/page per category | Fast for one category | Duplicated logic, no scalable category addition, inconsistent privacy/publishing | Low first, very high later | Reject |
| Fully schema-driven UI and behavior | Maximum admin flexibility | Complex validation, security and localization; hard to test and version | High | Do not start here |
| Hybrid: product-owned component library with server-configured template/module/question definitions | Reusable UI, safe allowed components, configurable category flow and localization | Requires disciplined definition/versioning layer | Medium | Adopt |

# 11. Dynamic Onboarding Engine

The current onboarding is a fixed 15-step frontend wizard. `OnboardingProgress.data` is useful for resumability but currently holds an unversioned generic JSON blob, assumes a default virtual card, and writes directly to a profile during each step. It cannot safely express per-category branching without accumulating frontend conditions.

Adopt the hybrid model above:

1. Backend-managed, versioned `OnboardingDefinition` selects flows by profile kind, category, template, locale, and plan.
2. Each `OnboardingStep`/`Question` uses allowlisted input types and validation keys, optional visibility rules, translation keys, and mapping targets to typed profile/module fields.
3. Clients render only approved components and do server-side validation/mapping; they never execute arbitrary definition code.
4. `OnboardingProgress` gains definition/version/profile scope and stores only resumable answer state that is needed before the typed final write. Completed answers are persisted to typed module relations.

First successful login flow: phone verification, required consent, account determination, creation/selection of one primary draft profile, kind/category selection, dynamic questions, initial modules, optional links/socials, then optional passkey enrollment. Returning users go through passkey-first entry and do not repeat onboarding.

# 12. Branch Architecture

The existing `ProfileBranch` proves branches are anticipated but is too small for business operations: it contains name, address, phone, map URL, visibility, and sort order only. Evolve it additively into `Branch` owned by a business profile.

Recommended normalized relations:

- `Branch`: profile, labels, address, map coordinates/place reference, public phone/contact, visibility/status, timezone, delivery capability, media policy.
- `BranchBusinessHours`: day-of-week, open/close ranges, closed/special-date override.
- `BranchCatalogAssignment` and `BranchServiceAssignment`: assignment, availability, price/availability override where justified.
- `BranchMedia` and `BranchModuleOverride`: explicit module-level override/enablement relationship.

Inheritance should be explicit. Business-profile data is the default; a branch only stores data it overrides. For each overridable relation use an assignment/override row with `inheritFromProfile`/`overrideMode`, rather than copying all services or catalog items. Contact and address are naturally branch-owned. Do not use ambiguous null semantics to mean both “inherit” and “intentionally empty.”

# 13. Catalog / Menu / Services Architecture

Do not reuse the current `Product`, `ProductVariant`, inventory, purchase, and order tables as business-profile menus. They represent POP’s own store and physical inventory (`Product` belongs to a global `ProductCategory`, and production/inventory/order relations are administrative). Reuse its ideas—localized name, variants, prices, images, availability—but not its ownership model.

Recommended hybrid content-commerce model:

```text
Catalog (profileId, kind: MENU | SERVICES | PRODUCTS, branch applicability, lifecycle)
  -> CatalogSection
      -> CatalogItem (itemKind, localized name/description, image, availability, price policy)
          -> CatalogItemVariant
          -> CatalogOptionGroup -> CatalogOption
```

The typed core supports a burger size, salon add-on, freelance service package, and retail product variant. `CatalogItem` must not imply payment, stock ledger, delivery, booking, or ordering in MVP. Those become later bounded capabilities attached to catalog/service records. The existing small `ProfileService` can migrate into a `SERVICES` catalog, retaining IDs through a mapping table/legacy relation until all consumers move.

## Decision table: Menu / catalog / services

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| One generic commerce model for all content and POP store inventory | Maximum reuse | Mixes POP operations with customer business data; forces inventory/order semantics | High and risky | Reject |
| Separate menu, services, and product schemas | Clear per-domain UX | Repeats sections, variants, pricing, media, visibility, publishing | Medium and grows per category | Reject |
| Hybrid shared catalog core, typed kind/capabilities, separate booking/order/inventory later | Reuses common structures without false capabilities | Needs careful item/price vocabulary | Medium, additive | Adopt |

# 14. Social / Connected Account Architecture

`ConnectedAccount` should remain user-owned provider authorization/source metadata. Meta and other providers remain connected accounts, not POP primary-auth providers. Keep encrypted provider tokens, scopes, sync status, and account metadata at this layer.

Replace the card-specific presentation relationship gradually: `CardImportedField` currently links a connected account to `VirtualCard`. Add a profile/module-targeted `ImportedProfileValue` (or evolve the relation with a new nullable target plus backfill) recording source account, target module/item, field type, imported value/version, sync mode, provenance, and user approval. A connected account can supply suggested data, but only a profile/module record is the canonical display value.

Manual links should create one canonical link/destination record associated with the selected profile and Social/Business/Personal/Media/Financial/Contact category. Do not create the same URL in `Profile.facebook`, `Destination`, and imported data. Existing direct social columns are legacy display fields to backfill into `Destination`/Social module records. OAuth import must always preview and require explicit selection; no provider can automatically overwrite profile content.

# 15. Profile Visibility / Privacy

Use a layered visibility policy:

- Profile level controls discoverability and publication: `PUBLIC`, `UNLISTED`, `PRIVATE`/paused.
- Module level controls broad audience: `PUBLIC`, `FRIENDS`, `ONLY_ME`, and narrowly defined `BUSINESS_PUBLIC` when a business-specific audience distinction is genuinely needed.
- Field/item level is required only for sensitive values inside a visible module: phone, email, location, social link, interest, later birthday. It should default to the module’s policy and explicitly override only when needed.

Current `Profile.isPublic` and `show*` booleans are sufficient for the current public page but are not a scalable privacy model. `Destination.isVisible` is useful and should evolve to an audience enum. `FriendPrivacyRule` currently selects destinations as JSON; move selected share targets to a join table when friend/privacy work resumes. Public queries should select only renderable fields; current public profile includes `user.email` even though it is not a required public datum.

# 16. Draft / Publish Architecture

Current profile, service, branch, destination, and upload writes become public immediately when `isPublic`/visibility permits. That is acceptable for a simple personal profile but is unsafe for incomplete business menu, price, and branch edits.

Target behavior: autosave drafts, explicitly publish coherent profile changes, and retain the last published version on failure. Model a profile publication state and revision metadata; module/content records belong to a draft workset or published revision. Publishing validates template-required modules, links, media access, and branch/catalog references, then atomically advances the published revision. Public routes read only the published workset.

MVP may initially use explicit publish only for catalog/branch/module changes while preserving live editing for basic personal identity. Do not fake publishing by copying arbitrary JSON blobs. The later revision data model should be normalized for queryable content and may use a small immutable revision manifest only as an audit/render cache, never as the sole source of truth.

## Decision table: Profile editor publishing

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| Direct live editing everywhere | Simplest existing behavior | Incomplete business data becomes public; no coherent review/recovery | Low | Keep only for limited legacy personal edits |
| Per-page manual save with no drafts | Familiar UI | Loses cross-module atomicity and history | Medium | Insufficient |
| Autosave draft plus explicit publish revision | Safe public state, recovery, audit, business readiness | More state and migration work | Medium-high | Adopt, staged by module |

# 17. Authentication UX Compatibility

The future single phone-entry screen is compatible with the current architecture. It must not ask “sign in or register”: normalize the phone, send/verify OTP, locate or create the POP user, then route to consent/onboarding or the existing account. Preserve current server OTP controls: hashes, expiration, single use, attempt limit, resend cooldown, hourly send limit, and rate limits.

Use passkeys first for returning web users once an account is identifiable. On Android, platform passkeys should be added through the existing POP passkey authority when the client support/UX is ready; OTP remains recovery, new-device verification, and exceptional proof. Firebase anonymous or verified identities must never be substituted for a POP session or `User.id`.

The current web passkey verification already validates challenge consumption, credential counter, active user status, user verification, and creates a short-lived auth ticket. The existing mobile bearer is 15 minutes, not 30 days; the 30-day value is a hashed, rotating refresh credential. Preserve that separation.

# 18. Consent / Legal Audit Model

There is no versioned terms/privacy acceptance model in the current schema. The repository has `/terms` and `/privacy` pages and onboarding progress, but no `termsVersion`, `privacyVersion`, consent timestamp, or immutable acceptance evidence.

Add:

```text
LegalDocument (documentType, version, locale, contentHash, effectiveAt, required)
UserLegalConsent (userId, documentId, acceptedAt, source, policyVersionSnapshot, audit metadata)
```

Enforce required Terms and Privacy acceptance in the first-account transaction after phone verification and before full onboarding. Keep optional marketing, contacts, nearby, community/friends, and analytics choices as separate consent types with their own purpose/version/revocation history. Store the acceptance audit in PostgreSQL; Firebase is not a legal-record authority. Do not backdate consent for existing users—choose a version and prompt on their next relevant sign-in.

# 19. Passkey / Reauthentication Policy

Adopt assurance levels rather than a long-lived bearer credential:

- Initial account proof: phone OTP.
- Normal returning web authentication: passkey preferred; OTP recovery/new device.
- Normal Android API access: 15-minute POP bearer plus rotated refresh family; passkey/OTP establishes or elevates the session.
- Long inactivity: request a fresh passkey, with OTP recovery.
- Sensitive actions: require a short-lived, purpose-bound POP step-up proof (passkey preferred; OTP recovery only where policy permits).

Sensitive actions include phone change, account deletion, passkey add/revoke, recovery changes, session/device revocation, security-setting changes, and linked-device approval. Add an auditable `AuthenticationEvent`/`StepUpGrant` with method, purpose, issued/expiry, session/device relation, and consumed time. Do not use Firebase tokens or a client timestamp as step-up proof.

# 20. Home / Profile Editor Architecture

The current dashboard has reusable profile editor foundations: profile content/actions, profile fields, destinations, uploads, services, branches, templates, and public-profile renderer. The dashboard’s profile and profiles pages should evolve into Home rather than be thrown away.

Home should select the active profile, render the same server-side profile presentation used publicly but in editor mode, and provide section-specific edit affordances. The editor reads the same module data as public rendering, while draft/publish status is visible. Avoid a separate “preview DTO” that drifts from public output. The existing `VirtualCard` template selection can remain a legacy presentation compatibility feature until template/profile association moves directly onto `Profile`.

# 21. Navigation Architecture

Current web navigation exposes many separate areas: profiles, profile details, cards/links, products, tags, wallet, templates, plans, transfers, friends, chats, integrations, passkeys, ideas, and settings. Android similarly exposes card, profile, NFC/HCE, and portal routes. This demonstrates useful capability coverage but is too card-centric for the future product.

Target information architecture is three primary destinations:

- **Home**: profile selector, public-style preview, edit/publish modules.
- **Share**: active sharing products, full-profile/selected-target sharing, QR, NFC/HCE compatibility, native share, activation.
- **Menu**: friends, messages, security, settings, appearance, privacy, devices, plan, connected accounts, and administration where applicable.

Do not rename or delete current routes in Phase B. Add navigation aliases/redirects only after their successor is working and retain deep links.

# 22. Share Center Architecture

A share target is an explicit, revocable object—not an inferred card field. Add a profile-scoped `ShareTarget`/binding concept for full profile, selected module/item, destination/link, VCF, catalog, or physical product. It carries visibility, public token/slug where needed, QR intent, active state, and analytics identity.

Physical `Card.activeDestinationId`, legacy `Tag.activeDestinationId`, and `Destination` already demonstrate destination resolution and can be reused during the transition. Share Center should list card/tag status, activate or pause a product, choose what it resolves to, show QR, initiate native OS share, and select HCE’s currently compatible public URL. It must not depend on NFC/HCE for universal sharing; QR and native share are mandatory fallbacks.

# 23. Physical Product Activation Security

Current activation has good foundations: activation values are hashed for `Card`, claims are short-lived and hashed, OTP is required, ownership update is serialized and single-claim guarded, activation is audited, and the card activation token is rotated after consumption. `ProducedTag.activationCode` is sealed for operational export rather than stored as an obvious plaintext value.

Gap: current activation starts from the activation QR/token itself, then verifies phone. The desired visible QR/NFC identifier plus separate shipped secret is a stronger ownership proof. Also, failed token attempts are recorded, but the rate-limit check occurs after a successful token match and attempts do not carry sufficient requester/IP/device audit data or durable cooldown state.

Target flow:

```text
visible QR/NFC permanent identifier -> server identifies unclaimed product
  -> user enters separate scratch secret -> server verifies slow hash
  -> rate/attempt/lockout checks -> authenticated POP user and selected profile
  -> atomic single ownership claim -> secret marked consumed -> audit event
```

Store only a salted slow hash (Argon2id or equivalent) of the scratch secret, its state/consumed timestamp, attempt counters/window/lockout, and a secret-version/key identifier. Never store or routinely decrypt it. Log protected request fingerprints/IP hash and product/user/profile result in activation audit records. Enforce a single ownership claim with a conditional transaction and make retries idempotent. QR/NFC public IDs must remain non-secret and replayable only as identifiers, never proof of ownership.

Between 4 and 6 digits, choose **6 digits** at minimum: 1,000,000 combinations vs 10,000. It still requires strict per-product, per-IP/account/device rate limits, exponential cooldown/lock, low global velocity limits, monitoring, and secure recovery support. A longer random alphanumeric scratch code is preferable in a future packaging/security review, but 4 digits is not appropriate for remote activation.

# 24. QR / NFC / HCE Architecture

Keep the permanent public card URL model. Android `PermanentUrlPolicy` explicitly permits only HTTPS `go.popwam.com/<single-slug>` URLs; NFC verification validates host/path; HCE emulates a minimal NFC Forum Type 4 NDEF URI record and intentionally implements no payment, identity, or private-data protocol. This is safe and should remain.

HCE is an optional presentation channel. Compatibility varies across Android devices/readers and iOS/reader behavior; it must not be advertised as direct universal URL exchange. The Share Center always provides QR and native share. A future HCE selection should point to an approved public share target/URL, retain the current local device selection, and never carry private profile content, activation secrets, or bearer credentials.

# 25. Settings Architecture

Current web settings are limited to PWA/privacy notes and optional Google link; appearance redirects to templates. Android has local language selection and a small settings screen. Split future settings by authority:

| Setting | Authority | Notes |
| --- | --- | --- |
| Theme, language preference, Arabic/English font preference, text scale intent | PostgreSQL user/profile preference; device may override locally | Store a syncable preference only if user expects cross-device behavior; respect OS accessibility scale |
| Current device theme/locale and temporary UI state | Local device/browser | Do not overwrite OS/accessibility settings |
| Notifications preference | PostgreSQL policy plus device token | OS permission is only observable/requestable on device |
| Camera, NFC, location, contacts, notification permission state | OS/device only | Server stores user intent or feature setting, not a claimed OS grant |
| Profile privacy/discoverability/blocked users | PostgreSQL | Audit material changes |
| Passkeys, devices, sessions, recovery | PostgreSQL POP auth models | Firebase is supplementary only |
| Phone, plan, data export/deletion | PostgreSQL and audited workflows | Step-up required for sensitive changes |

# 26. Devices and Sessions

The current schema includes `Session` (NextAuth), `MobileRefreshToken`, `DeviceSession`, `PasskeyCredential`, `DevicePushToken`, and `ExternalIdentity`. `DeviceSession` is presently unused by application code, so it is not yet a unified device inventory. Current logout-all revokes mobile refresh tokens and deletes NextAuth sessions; this is a sound start but does not present individual browser/device sessions.

Build a unified **UX**, not a merged authentication authority. Add a logical device/session inventory that relates a privacy-minimized device label/platform/app/browser, created/last-seen/revoked timestamps, session authority/type, and optional passkey/push-token relations. Keep NextAuth session tokens, refresh-token families, passkey credentials, Firebase identities, and FCM registrations as separate technical credentials with their own revocation semantics. Revoke individual device sessions by revoking the relevant NextAuth session or mobile refresh family; “sign out all others” excludes the current authenticated session and requires step-up.

# 27. Friends Architecture

The repository already has `Friendship` with canonical user pairs and statuses, per-side favorite, request/block ownership; `FriendPrivacyRule`; `UserBlock`; reports; and web friend actions. It also requires an accepted friendship before starting a direct chat. This is a foundation, not a complete launch-ready friends system.

Before expanding it, add community/friends-policy acceptance, invitation records/abuse controls, separate durable block semantics, selected profile/share target relation, request/accept/reject timestamps, rate limits, notification preference, mute, report categorization, and moderator workflow. Friend-card responses must be projection queries of approved profile/module data—not a copied profile snapshot containing contact data. Do not use nearby discovery or contacts upload as implicit friendship proof.

## Decision table: Friends storage

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| Firestore as primary | Realtime client SDK | Duplicates relational ownership, block, consent, moderation, and reporting data; rules become security-critical | High | Reject |
| PostgreSQL as primary, realtime notifications separately | Existing data/models/audit/transactions; referential integrity | Need a websocket/notification delivery layer later | Low-medium | Adopt |

# 28. Nearby Discovery Architecture

Current `NearbyPreference` is an opt-in TTL preference (`enabled`, `visibleUntil`, selected virtual card/audience); no presence/location storage or discovery query exists. This is a healthy non-implementation baseline.

For a later foreground-only MVP, default discoverability off. On explicit Nearby open, request foreground approximate/coarse location, transform it server-side/client-side into a coarse geohash/H3 cell, store a short-lived presence with expiry, selected profile projection, consent/audience, and no precise coordinate available to other users. Query neighboring cells, filter by blocks/friends/audience, return approximate distance/bucket rather than coordinates, and expire records aggressively. Do not request background location in this phase.

## Decision table: Nearby presence

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| PostgreSQL TTL/geohash rows as primary | Existing authority/audit/relationships; adequate for low-frequency foreground use | Less efficient for high-frequency live presence | Low-medium | Adopt for first Nearby release |
| Firebase Realtime Database as primary | Low-latency ephemeral listeners | Separate security/rules/data lifecycle; duplicates consent/relationship filtering | Medium-high | Defer; consider only for high-frequency ephemeral fan-out while PostgreSQL remains authoritative |

# 29. Messaging Architecture

Current messaging uses PostgreSQL `Chat`, `ChatMember`, `Message`, and `MessageReport`; chat creation requires an accepted friendship. This satisfies the “no unsolicited conversation” direction only for the existing direct-chat path, but it lacks an explicit conversation-request state, edits/deletion, content type controls, delivery/read detail, retention policy, and secure private media.

Initial recommended model is **TLS in transit + encryption at rest + controlled, audited POP server access**. It supports moderation, abuse response, reports, deletion/retention policy, search limits, migrations, and delivery. Do not market it as E2EE. True E2EE would require independent device key lifecycle, multi-device synchronization, recovery, metadata decisions, attachment encryption, key verification, and materially changes moderation/recovery; defer it.

Add `ConversationRequest`/conversation state, only create active conversations after acceptance, and add message type (`TEXT`, `IMAGE` initially), lifecycle (`sent`, `edited`, `deleted`), `editedAt`, `deletedAt`, sender/recipient read state, and immutable moderation/retention records. Permit edit/delete only while unread and before ten minutes; user-visible deletion becomes a tombstone. Any legal/security retention must be documented as policy and stored in protected retention/audit paths.

## Decision table: Messaging storage

| Option | Advantages | Disadvantages | Migration Cost | Recommendation |
| --- | --- | --- | --- | --- |
| Firestore as primary | Realtime subscriptions | Duplicates existing relational chat/moderation/access model, complicated retention and reporting | High | Reject |
| PostgreSQL as authoritative, realtime delivery transport separately | Existing models, transactions, audit, retention controls | Need scalable event/websocket layer later | Medium | Adopt |

# 30. Messaging Media / R2 Security

Current `UploadedFile` uses `publicUrl` and `uploadPublicFile`; chat currently allows an attachment selected from the user’s general uploads and displays its public URL. This is not acceptable for future private chat images. Existing validation allowlists image/PDF/text/VCF file types for general uploads, but it does not make chat media private, scan it, strip metadata, or constrain chat to images.

Create separate private chat-media storage and metadata records. Upload through authenticated, scoped, short-lived signed URLs or application proxy; authorize every retrieval against active conversation membership. Validate claimed MIME plus decoded image content, enforce small image-only limits, reject documents/audio/video/executables, normalize/re-encode images where practical, strip EXIF/location metadata, run malware/image safety scanning appropriate to the platform, and quarantine failures. Maintain object keys separate from public assets, retention/deletion state, and orphan cleanup. R2 remains suitable, but the current public bucket URL design must not be reused.

# 31. Linked Device / Web Companion Architecture

This is device pairing, not OAuth and not a provider login. Current web NextAuth and mobile POP sessions provide the authorities to build it but no pairing model/route exists.

Recommended flow: browser creates a short-lived opaque `DeviceLinkRequest` and displays QR plus browser/device information; mobile authenticated user scans it, server resolves only an expiry-bound request, mobile shows the browser information, user approves with fresh step-up, and a single-use approval creates/binds the appropriate web session. Store request hash, browser-generated nonce/public key if needed, status, expiry, approver, target device metadata, consumed timestamp, and audit records. Never put a POP bearer/refresh token in the QR. Allow reject/expiry/revocation and show the linked browser in Security.

Personal web scope can initially emphasize friends, messages, security/devices, and viewing. Business scope can later add full profile, branch, catalog, service, and publication management. Authorization remains profile/team/role scoped, not device type alone.

# 32. Firebase Responsibility Boundaries

The Firebase Phase 1/2 reports support the following boundary:

- Firebase Auth: optional anonymous/external-identity assistance only. `ExternalIdentity` verifies that a Firebase subject maps at most once; it does not grant POP business/API access.
- Firebase Analytics: privacy-safe behavioral telemetry with centralized safe property filtering; no PII, OTP, phone, tokens, or raw stream copied to PostgreSQL/R2.
- FCM: push transport; POP user/device ownership and consent remain PostgreSQL-backed.
- Crashlytics: crash telemetry only.
- Firestore: not implemented; do not add for product data merely because Firebase is enabled.
- Realtime Database: not implemented; only a possible later ephemeral-presence accelerator.

Firebase must never replace `User.id`, POP OTP, passkey, NextAuth, or POP mobile authorization.

# 33. PostgreSQL Responsibility Boundaries

PostgreSQL is authoritative for POP users, profiles, templates, module content, business data, plans/entitlements, physical products/activation, connected-account metadata, legal consents, privacy and blocks, friends, conversations/messages, session/device metadata, audit logs, publish state, moderation, and durable analytics aggregates. Use transactions and foreign keys for ownership claims, plan limits, privacy decisions, conversation activation, and publication.

Firebase identities, FCM tokens, and external delivery events may be referenced but are not authoritative replacements. PostgreSQL may retain coarse/TTL nearby presence for the initial foreground discovery service; it should not retain precise historical movement by default.

# 34. R2 Responsibility Boundaries

R2 stores binary media/files only. PostgreSQL stores ownership, purpose, MIME, size, visibility, storage key, retention, and authorization metadata. Public profile images/gallery assets can use a public delivery path when the associated profile item is public. Private chat media, future documents, account export, moderation evidence, and original sensitive uploads need separate private prefixes/buckets and authenticated delivery.

Do not put application business records, session material, OTPs, provider tokens, activation secrets, legal consent records, or raw analytics streams in R2.

# 35. Analytics Event Architecture

Firebase Analytics is the client/session telemetry layer; server audit logs are the authoritative security/administration trail. Maintain a versioned event registry with owner, trigger, allowed properties, data classification, retention, and dashboard consumer. Existing Phase 2 safe-property gates already allow bounded non-sensitive context.

Future events include `guest_started`, `phone_entered`, `otp_verified`, `onboarding_started`, `account_type_selected`, `onboarding_completed`, `profile_viewed`, `profile_edited`, `share_opened`, `qr_viewed`, `product_activation_started`, `product_activation_completed`, `friend_request_sent`, `friend_request_accepted`, and `conversation_started`. Client events describe UI intent/view; server events confirm security-sensitive outcomes such as activation, consent, session revocation, publish, or friendship acceptance. Never send phone/email, OTP, raw slug where it identifies a person, private message body, precise location, token, cookie, provider access token, or secret code.

# 36. Existing Models — KEEP / EXTEND / REPLACE Matrix

| Model | Decision | Rationale / future action |
| --- | --- | --- |
| `User` | KEEP + EXTEND | Remains POP identity; add primary-profile/consent/preference relations, not Firebase identity replacement |
| `Profile` | KEEP + EXTEND | Canonical logical presence; add kind/category/template/lifecycle/primary/module relations and retire wide legacy content gradually |
| `VirtualCard` | RENAME LATER / DEPRECATE AS CORE | Keep compatibility/presentation/wallet bindings; migrate conceptual ownership to Profile |
| `Card` | KEEP + EXTEND | Physical/digital sharing product, inventory, activation, NFC/QR; bind to profile/share target |
| `Tag`, `TagAlias`, `TagEvent` | KEEP + EXTEND | Legacy/physical share compatibility; converge routing onto share targets later |
| `Destination` | KEEP + EXTEND | Strong link/share-target foundation; add audience/module/profile ownership semantics and category |
| `ProfileField` | EXTEND / REPLACE LATER | Useful controlled custom fields; evolve into module-owned attributes/contacts |
| `ProfileService` | EXTEND then MIGRATE | Seed of services; migrate to hybrid catalog item records |
| `ProfileBranch` | EXTEND then RENAME LATER | Seed of Branch; add hours, assignments, overrides, delivery/media |
| `ProfileTemplate` | KEEP + EXTEND | Controlled template/catalogue; add relational module and onboarding rules |
| `OnboardingProgress` | KEEP + EXTEND | Keep resumability; scope/version it and avoid using its JSON as canonical data |
| `ConnectedAccount` | KEEP | User-owned provider source with encrypted tokens; never primary POP auth |
| `CardImportedField` | REPLACE GRADUALLY | Move import provenance/targets from virtual card to profile module data |
| `ExternalIdentity` | KEEP | Firebase supplementary subject mapping only |
| `PasskeyCredential`, `PasskeyChallenge` | KEEP + EXTEND | Preferred repeat authentication; add audit/device presentation relation |
| `Session`, `MobileRefreshToken` | KEEP + EXTEND | Distinct web/mobile authorities; expose through unified UX only |
| `DeviceSession` | EXTEND / ACTIVATE | Present but unused; redesign as device/session inventory rather than assuming it is operational |
| `DevicePushToken` | KEEP + EXTEND | POP-owned FCM delivery registration; add device/session relation and consent metadata |
| `OtpChallenge`, `OtpSendLog`, `AuthTicket` | KEEP | Secure OTP/auth foundations; preserve limits and short TTLs |
| `ActivationClaimSession`, `ActivationAttempt` | EXTEND | Add secret-attempt/cooldown/request fingerprint/audit separation for scratch-code flow |
| `ProducedTag` | EXTEND | Retain production links; replace routine reversible activation-code use with scratch-secret verifier state |
| `UserPlan`, `Plan`, `UserLimitOverride` | KEEP + EXTEND | Existing quota foundation; add durable profile entitlement grants/source provenance |
| `Friendship`, `FriendPrivacyRule`, `UserBlock`, `UserReport` | KEEP + EXTEND | Good relational base; add community consent, invite/abuse, selected-profile and moderation detail |
| `Chat`, `ChatMember`, `Message`, `MessageReport` | REWORK BEFORE LAUNCH | Existing base, but add conversation request, lifecycle, retention and private-media relations |
| `NearbyPreference` | KEEP + EXTEND | Keep opt-in TTL; add separate ephemeral coarse presence later |
| `UploadedFile` | SPLIT BY PURPOSE | Keep public/profile file metadata; do not reuse public URL model for chat/private media |
| `ContentEntry`, `ContentPublication` | EVALUATE / MIGRATE | Potential portfolio/content seed, but virtual-card relation needs profile/module ownership |
| `AuditLog` | KEEP + EXTEND | Central audit foundation; add action taxonomy/correlation/request context without secrets |

# 37. New Models Required

Add only in approved additive migrations, in this approximate dependency order:

1. `ProfileCategory`, `ProfileTemplateModule`, `ProfileModuleDefinition`, `ProfileModule`, and controlled module configuration/versioning.
2. `ProfileEntitlement`/grant source and profile lifecycle/publication/revision metadata.
3. `LegalDocument` and `UserLegalConsent`.
4. `ProfileContactMethod`, `ProfileLink`/destination audience and import-provenance target relation as current direct profile fields are migrated.
5. Expanded `Branch`, `BranchBusinessHours`, `BranchCatalogAssignment`, `BranchServiceAssignment`, `BranchMedia`, and explicit overrides.
6. `Catalog`, `CatalogSection`, `CatalogItem`, `CatalogItemVariant`, `CatalogOptionGroup`, and `CatalogOption`.
7. `ShareTarget`/binding and share analytics identity.
8. `StepUpGrant`/`AuthenticationEvent` and a device inventory/session mapping model.
9. `DeviceLinkRequest` for web companion pairing.
10. `ConversationRequest`, message lifecycle/read/deletion records, and private `ChatMedia` metadata.
11. `NearbyPresence` with coarse cell, expiry, audience, and no exposed exact coordinates.
12. Activation scratch-secret verifier/lockout/audit extension, preferably separated from public product identifiers.

# 38. Existing Routes That Can Be Reused

| Existing route / capability | Future use |
| --- | --- |
| `/p/[slug]`, `/p/id/[profileId]` | Preserve as public profile routes; point at published profile modules |
| `/[shortCode]`, `/t/[token]` and tag resolver | Preserve old QR/NFC links; resolve a profile/share target through legacy binding |
| `/api/mobile/profiles` and `/api/mobile/profiles/[id]` | Evolve into profile selector/editor APIs with versioned module endpoints |
| `/api/mobile/cards`, `/api/mobile/cards/[id]` | Share Center physical-product inventory/status APIs |
| `/api/mobile/activation/inspect`, `/claim`, `/api/activation/start` | Retain route families; introduce visible-ID + scratch-secret steps without changing existing URLs abruptly |
| `/api/mobile/nfc/verify` and Android permanent URL policy/HCE service | Retain as NFC safety/compatibility mechanisms |
| `/api/otp/*`, `/api/mobile/auth/otp/*`, `/api/passkeys/*` | Preserve OTP/passkey authorities; add UX and step-up policy around them |
| `/api/auth/logout-all`, `/api/mobile/auth/logout-all` | Build Security device/session actions on these existing revocation semantics |
| `/api/integrations/*` | Preserve provider connection; retarget selected imports to profile modules |
| Current dashboard profiles/profile/templates/cards/tags pages | Gradually compose into Home and Share with stable route compatibility |

# 39. Routes Likely Required Later

Examples of later API families, subject to endpoint/versioning conventions at implementation time:

- `/api/profiles/[id]/modules`, `/modules/[moduleId]`, `/publish`, `/revisions`.
- `/api/profiles/[id]/branches`, `/catalogs`, `/share-targets`.
- `/api/onboarding/definitions/[id]`, `/api/onboarding/progress`.
- `/api/legal/documents`, `/api/legal/consents`.
- `/api/security/step-up/*`, `/api/security/devices`, `/api/security/sessions/[id]`.
- `/api/device-link/requests`, `/api/device-link/approve`, `/api/device-link/reject`.
- `/api/friends/invites`, `/requests`, `/blocks`, `/reports`.
- `/api/nearby/presence`, `/discover`.
- `/api/conversation-requests`, `/api/chats/[id]/messages`, `/read`, `/media`, `/report`.

Do not make these routes now. Preserve current route contracts while introducing versioned APIs and contract tests in the implementation phases.

# 40. Legacy Data Migration Strategy

Use additive, reversible stages:

1. Inventory current profile/virtual-card/card/tag/destination data and verify cardinalities before any schema change.
2. Add nullable new profile/module/template/category/entitlement fields and relations. Do not rename existing columns/tables/routes.
3. Backfill a `ProfileModule` instance for existing identity, contact, social/links, uploads/gallery, services, and branches. Maintain an explicit source mapping for every backfilled row.
4. Backfill profile primary status from existing default virtual card/creation order, with a report for ambiguities—not silent arbitrary changes.
5. Backfill profile/share bindings from `Card.profileId`, `Card.virtualCardId`, `Card.activeDestinationId`, `Tag.profileId`, and tag destinations. Preserve legacy routes/IDs.
6. Dual-read public rendering (new module first with safe legacy fallback), then dual-write only for data under active migration.
7. Move connected-account imports to module targets while keeping `CardImportedField` read compatibility.
8. Migrate `ProfileService`/`ProfileBranch` into the new shapes only after comparison reports and idempotent retries exist.
9. Cut write paths over module by module; retain legacy reads for a defined release window; archive/deprecate only after verified backfill and rollback window.

No migration in this audit was created, applied, or tested against a database.

# 41. Backward Compatibility Strategy

Existing cards, public links, products, connected accounts, activations, wallet passes, NFC links, HCE URLs, and profile URLs continue to work. A physical card keeps its serial/public slug/public token and resolves its existing active destination. Old `/p`, `/t`, and short-code pages become compatibility resolvers rather than redirects that lose analytics or status behavior.

Do not change a public slug or NFC URL as part of profile migration. Maintain old destination IDs and profile IDs as foreign-key-compatible targets. Use optional new relations, idempotent backfills, read fallback, contract tests for current mobile routes, metrics for legacy access, and an announced deprecation window. Never delete a card simply because its owner has no published profile; render an existing safe fallback/status instead.

# 42. Security Risks

1. **Activation ownership proof:** the present activation QR/token begins the flow; a separate hashed scratch secret, bounded attempts, lockout/cooldown, and source-aware audit are required before product activation is expanded.
2. **Public/private media confusion:** current `UploadedFile.publicUrl` cannot be reused for private chat images or future sensitive files.
3. **Session assurance gaps:** `DeviceSession` is not active code, and sensitive operations need purpose-bound step-up rather than trusting a long-lived session/refresh token.
4. **Module/configuration abuse:** arbitrary JSON, remote embeds, or custom HTML would bypass validation, privacy, rendering safety, and schema migration discipline.
5. **Provider and Firebase boundary creep:** external identities/connected accounts must not become implicit primary authentication or authorization paths.

Additional controls: strict authorization per profile/team/module/share target; CSRF/origin controls on web mutations; idempotency/transactions for publish, activation and links; rate limits for OTP, activation, invitations, messages and pairing; encryption/key management for tokens; structured audit logs without secrets; dependency/upload security testing.

# 43. Privacy Risks

1. Current wide profile fields and public URLs make it easy to publish a phone, email, location, social link, or file accidentally; add layered audience policy and safe defaults.
2. Public-profile queries must minimize selected data, especially owner email and provider metadata.
3. Nearby must never disclose precise/live coordinates, default off, or retain location history without an explicit, narrowly documented policy.
4. Friends projections must reveal only approved module fields and must respect block/remove changes immediately.
5. Firebase Analytics, FCM, Crashlytics, provider imports, and audit logs require a data-classification guard to prevent PII, tokens, messages, or secrets from flowing into telemetry.

# 44. Abuse / Spam Risks

OTP requests, product secret guessing, QR pairing, invitation/friend requests, profile links, contact discovery, nearby queries, messages, image upload, reports, and catalog content all need abuse controls. Use per-account/device/network limits, cooldowns, canonical pair constraints, invitation quotas, block-first enforcement, content/report queues, trusted moderation tooling, attachment quotas, and anomaly monitoring. Do not launch contact uploads, open discovery, or unaccepted chat messages in MVP.

# 45. Scalability Risks

Public tag/profile opens currently trigger PostgreSQL card/tag counters and daily upserts; high traffic needs batching/queueing or carefully bounded analytics writes. Dynamic module render queries require purpose-built indexes and stable public read projections. Draft/public revision reads must avoid N+1 module/media/catalog queries. Realtime chat and nearby should use an event delivery layer only when usage proves it necessary; do not prematurely duplicate durable data into Firestore. Large galleries/catalogs need pagination, image derivatives/CDN, and lifecycle cleanup. Product activation and plan limits require serializable/idempotent transactional code as current claims already demonstrate.

# 46. Features That Must NOT Be Built Yet

- Full booking/calendar engine.
- Ordering, delivery, payment processing, stock/ERP for customer business catalogs.
- True end-to-end encrypted messaging.
- Background/exact location tracking and advanced nearby matching.
- Contact import/discovery by default.
- Audio/video/documents in chat.
- Arbitrary custom modules, executable embeds, or arbitrary schema-driven frontend rendering.
- Broad Firestore/Realtime Database product-data duplication.
- Destructive card/profile/URL renaming or a big-bang database migration.

# 47. Recommended MVP Scope

**MVP NOW (Phase B foundation):** evolve the current Profile canonically; primary/additional-profile rules and entitlement linkage; category/template/module definitions; Identity/About/Contact/Links/Social/Gallery modules; controlled personal and initial business templates; legal-consent audit; profile lifecycle/publish foundations; Home/Share API contracts; legacy card/profile/share bindings; public-route compatibility and migration tests.

**NEXT:** simplified phone-first entry UX over current secure OTP/passkey authorities; dynamic onboarding; Home editor/preview; Share Center using existing cards/QR/NFC; Security/devices/session UX.

**LATER:** expanded branches/catalog, friends hardening, nearby, messaging/private media, web companion, booking/order/payment/advanced business systems.

# 48. Phase B Implementation Scope

Phase B is **Core Profile/Data Foundation**, not a UI redesign. It should introduce the minimum additive schema and services that let a user own a primary profile independently of a card and let templates enable controlled modules. It includes consent storage because account creation/onboarding cannot correctly enforce future required policies without it. It does not change production URLs, migrate production, deploy, or remove the current card/virtual-card flow in one release.

Exit criteria: module/template validation, primary-profile invariant, profile quota/entitlement checks, versioned consent records, legacy-to-new mapping/backfill tooling designed and tested in an isolated environment, public resolver fallback tests, migration dry-run/report, and no dependency on Firebase for POP authorization.

# 49. Later Product Phases

| Phase | Goal | Database changes | Backend changes | Web changes | Android changes | Firebase changes | Security considerations | Tests | Migration risk | Reasoning level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B | Core profile/data foundation | Additive profile/category/template/module/consent/entitlement bindings | Validation, dual-read services, migration reports | No redesign; compatibility contracts | API contract preparation only | None | Ownership, privacy defaults, no Firebase auth authority | Unit/integration/migration dry-run | Medium | Extra High |
| C | Phone-first login, consent, passkey UX | Consent/assurance events if not B | Preserve OTP controls, passkey-first/step-up policy | Simple entry and consent flow | Equivalent phone/passkey flow | Analytics safe events only | Recovery, CSRF, session assurance | Auth policy and regression tests | Low-medium | High |
| D | Dynamic onboarding | Definition/version/progress relations | Definition validation and typed answer mapping | Guided localized flow | Native renderer for approved controls | Safe funnel events | No arbitrary dynamic code; consent gating | Branching/localization tests | Medium | High |
| E | Home/profile editor | Draft/publish revision/module content as enabled | Publish transaction and public projection | Preview/editor affordances | Mobile-first module editing | Profile events only | Authorization and publication safety | Contract/public-render tests | Medium | High |
| F | Share, QR, NFC, activation | Share bindings and scratch-secret state | Resolver, activation verifier/rate limit | Share Center | QR/native share/NFC/HCE selection | Analytics only | Secret hashing, replay/claim protection | Security/concurrency/NFC policy tests | Medium | Extra High |
| G | Settings/security/devices | Device/session and step-up metadata | Individual revoke/link policies | Security/settings views | Device permission/settings surface | FCM ownership only | Step-up, session revocation | Session/device tests | Medium | High |
| H | Friends | Extend friendship/privacy/moderation records | Invite/request/block/report services | Friends UX | Friends access/notifications | FCM notifications | Consent, spam, block enforcement | Authorization/abuse tests | Medium | High |
| I | Nearby | Coarse TTL presence | Geohash discovery and expiry | Privacy controls | Foreground coarse permission UX | None initially; RTDB only if justified | No exact/background tracking | TTL/privacy/load tests | Low-medium | Extra High |
| J | Messaging | Conversation requests, lifecycle, private media | Delivery/moderation/retention services | Chat UX | Chat UX | FCM notifications | Private storage, abuse, no false E2EE claim | Access/retention/upload tests | Medium | Extra High |
| K | Advanced business modules | Catalog/branch expansion; later booking/order tables | Business capability services | Business web management | Mobile management | Analytics as needed | Pricing/permissions/audit | Domain/integration tests | Medium-high | High |

# 50. Exact Implementation Order

1. Freeze and document the current schema/route contracts and collect a non-production data-shape report; establish migrations only after approval.
2. Add profile category/template/module definitions, primary profile lifecycle fields, entitlement provenance, and versioned legal-consent records in one additive Phase B migration sequence.
3. Build server-side profile/module authorization and validation services; create no new hardcoded category forms.
4. Add dual-read public/profile projection with legacy column/virtual-card fallback; test existing `/p`, tag, card, mobile profile, and NFC routes unchanged.
5. Create an idempotent backfill/dry-run report for existing profile fields, destinations, uploads, services, branches, virtual cards, cards, tags, and imported fields. Review discrepancies before applying anywhere.
6. Introduce primary/additional-profile quota and entitlement checks, then profile selector API contract behind compatibility paths.
7. Implement the phone-first consent/passkey UX on top of existing OTP/passkey/session security; add short-lived step-up proofs for security-sensitive actions.
8. Implement server-configured hybrid onboarding and typed module writes.
9. Implement Home preview/editor and staged draft/publish, then Share Center preserving existing share URLs.
10. Harden activation to visible identifier plus separate hashed scratch secret before expanding physical-product activation.
11. Add devices/security, then friends, nearby, messaging, and advanced business capabilities only in their later phases.

The exact next implementation phase is **Phase B: Core Profile/Data Foundation**, with **Extra High** reasoning level. It is the dependency boundary that makes later UX work safe, additive, and compatible.
