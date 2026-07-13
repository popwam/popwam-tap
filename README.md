# POPWAM Tap

POPWAM Tap is an online-first smart NFC/QR card platform. A sticker or printed QR contains only one permanent URL:

```text
https://go.popwam.com/t/{token}
```

The tag never stores a person's private contact data. The platform resolves the token at scan time, records the scan, and either displays a public profile, redirects to a validated destination, or shows a safe paused/lost/disabled page. The owner can change this behavior without rewriting the physical NFC tag.

## Monorepo

```text
apps/
  web/       Next.js App Router application
  android/   Documentation-only placeholder for the future native app
packages/
  db/        Prisma schema, client singleton, and seed
  shared/    Shared constants, destination metadata, and tag URL helpers
  storage/   Cloudflare R2 helpers using the AWS S3-compatible SDK
  auth/      Client-independent role/ownership primitives
docs/        Architecture notes
```

The repository uses pnpm workspaces and Turborepo. The MVP dashboard is personal-workspace focused, while `Organization` and `Membership` are already part of the domain model.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Auth.js / NextAuth with Prisma Adapter, Credentials, and optional Google OAuth
- Prisma with Neon PostgreSQL
- Cloudflare R2 via AWS SDK v3 (optional at runtime)
- Server Actions and authenticated Route Handlers
- Canvas-based QR rendering and PNG download

## Local setup

Requirements: Node.js 20+ and pnpm 10+.

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate -- --name init
pnpm seed
pnpm dev
```

On PowerShell, use `Copy-Item .env.example .env`. Replace every example secret before using a shared or production environment. `.env`, `.env.*`, and the pre-existing `.evn` typo are ignored; only `.env.example` is committed.

For local development, create the `.env` file at the monorepo root. For Railway or Vercel deployments, set the same environment variables in the hosting provider dashboard.

Useful commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate -- --name descriptive_name
pnpm db:deploy
pnpm seed
```

## Neon and Prisma

Set `DATABASE_URL` to the Neon pooled PostgreSQL connection for application traffic. Set `DIRECT_DATABASE_URL` to a direct Neon connection for migrations. Both must use TLS as shown in `.env.example`.

For a new database:

```bash
pnpm db:migrate -- --name init
pnpm seed
```

For production after migrations are committed:

```bash
pnpm db:deploy
pnpm seed
```

The seed is idempotent. It upserts the admin, demo account, personal organizations, profiles, destinations, and the `mamdouh` demo tag. It hashes credentials with bcrypt; production passwords must be supplied in environment variables.

## Authentication

Credentials login always works when the database and `NEXTAUTH_SECRET` are configured. Google is added only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are non-empty, so missing Google configuration never breaks the build.

Create a Google OAuth web application and add this callback URL:

```text
https://YOUR_APP_HOST/api/auth/callback/google
```

Use the same deployed base URL for `NEXTAUTH_URL`. A first-time Google user receives role `USER`, a default empty personal profile, and a personal organization. Existing roles are never overwritten.

## Cloudflare R2

Create an R2 bucket and an API token with object read/write permissions. Configure:

- `R2_ENDPOINT` as the account S3 endpoint
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` as a public custom domain or R2 public-development URL
- `R2_PUBLIC_FOLDER`, upload size, and allowed MIME types as needed

Storage is enabled only when every required value, including the public base URL, exists. Secrets stay server-side. Uploads go to:

```text
public/users/{userId}/avatar/{timestamp}-{safeFilename}
public/users/{userId}/cover/{timestamp}-{safeFilename}
```

If R2 is not configured, the application still builds and the profile editor keeps manual `avatarUrl` and `coverUrl` fields available.

## Deploy to Vercel

Recommended monorepo configuration:

1. Import the Git repository into Vercel.
2. Keep **Root Directory** at the repository root so all workspace packages are available.
3. Set the framework preset to Next.js and the build command to:

   ```bash
   pnpm db:generate && pnpm --filter @popwam/web build
   ```

4. Set the output directory to `apps/web/.next` only if Vercel does not detect it automatically.
5. Add all production environment variables from `.env.example` in Vercel Project Settings.
6. Run committed migrations from CI or a trusted terminal with production variables: `pnpm db:deploy`.
7. Seed once (the command is safe to repeat): `pnpm seed`.

Alternative: set **Root Directory** to `apps/web`, enable access to files outside the root directory, and use `pnpm --filter @popwam/web build`. The repository-root setup is less surprising for workspace packages.

For first testing, `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` can both be the Vercel URL. With custom domains later, use `https://app.popwam.com` for authentication and `https://go.popwam.com` for public token URLs.

## Routes

Public:

- `/health` — JSON health check
- `/t/{token}` — token resolver, scan tracking, profile/redirect/safe state
- `/p/{slug}` and `/p/id/{profileId}` — public profile
- `/login` — Credentials and optional Google sign-in

User dashboard:

- `/dashboard`
- `/dashboard/profile`
- `/dashboard/cards`
- `/dashboard/tags`
- `/dashboard/tags/{id}`

Admin:

- `/admin`
- `/admin/users`
- `/admin/tags`
- `/admin/resources` — all profiles and destination cards

Reserved for Android: `/api/mobile` and the server-side API auth/permission modules.

## Demo

- Admin email: `ADMIN_EMAIL` (default example `admin@popwam.com`)
- Demo email: `DEMO_USER_EMAIL` (default example `mmdoh@popwam.com`)
- Passwords: `ADMIN_PASSWORD` and `DEMO_USER_PASSWORD`
- Public demo token: `${NEXT_PUBLIC_APP_URL}/t/mamdouh`

Never use the example passwords in production.

See [TESTING.md](./TESTING.md) for the full online acceptance checklist and [docs/architecture.md](./docs/architecture.md) for the request flow and future Android boundary.
