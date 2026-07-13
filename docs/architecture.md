# Architecture

## Token resolution

```text
NFC sticker / QR
      │ fixed public URL only
      ▼
/t/{token}
      │
      ├─ unknown ─────────────► safe not-found page
      ├─ paused/lost/disabled ► safe status page
      └─ active
          ├─ record SCAN + counters
          ├─ PROFILE  ────────► public Profile + PROFILE_VIEW event
          └─ REDIRECT ────────► validated Destination + REDIRECT event
```

No private contact payload is written to the tag. PostgreSQL stores domain data and final object URLs/keys; binary images live in Cloudflare R2.

## Authorization boundary

Browser sessions use Auth.js JWT sessions backed by Prisma user/account records. Every dashboard Server Action obtains the server session again and filters resources by owner. Admin actions require `SystemRole.ADMIN`. Upload routes authenticate server-side and never return credentials.

Organizations are represented independently from system roles. A resource can remain personal with `organizationId = null`, or later be attached to an organization and governed through `Membership` with `OWNER`, `ORG_ADMIN`, or `MEMBER`.

## Android boundary

The future Android app is a separate native client, not embedded in the Next.js project. The `/api/mobile` namespace, `api-auth.ts`, and reusable permission helpers reserve a path for API access/refresh tokens. Its primary NFC responsibility will be writing and optionally locking the public token URL; profile data remains online and mutable.
