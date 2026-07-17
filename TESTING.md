# POP by POPWAM online testing checklist

Run `pnpm install`, `pnpm db:generate`, `pnpm test`, and `pnpm build` before deployment. Apply committed migrations with `pnpm db:deploy`; never use `prisma db push` in production. Existing installations should then run the idempotent `pnpm db:repair`.

Before testing, deploy migrations, run `pnpm seed`, and confirm `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` match the active test deployment.

## Availability and authentication

- [ ] Open `/health`; confirm `{ "ok": true, "app": "POP by POPWAM" }`.
- [ ] Open `/login` and sign in with the seeded admin credentials.
- [ ] Confirm `/admin`, `/admin/users`, and `/admin/tags` load.
- [ ] Sign out and sign in with the seeded demo-user credentials.
- [ ] Confirm `/dashboard` loads and `/admin` redirects back to the dashboard.

## Profile and storage

- [ ] Open `/dashboard/profile` and edit the profile.
- [ ] If R2 is configured, upload a JPEG/PNG/WebP avatar and save the profile.
- [ ] Confirm an unsupported type or oversized image is rejected.
- [ ] If R2 is not configured, paste a safe HTTPS `avatarUrl` or `coverUrl` and save.
- [ ] Open `/p/mamdouh` and confirm public fields and Save Contact render.

## Destinations and tags

- [ ] Open `/dashboard/cards`; create, edit, and delete a test destination.
- [ ] Confirm bare websites, phone, email, and Egyptian WhatsApp numbers normalize correctly.
- [ ] Confirm `javascript:`, `data:`, and `file:` URLs are rejected.
- [ ] Open `/dashboard/tags` and the `Mamdouh Main Smart Card` detail.
- [ ] Copy the permanent QR URL and download the QR PNG.
- [ ] Open `/t/mamdouh`; confirm the profile appears and scan count increments.
- [ ] Switch the tag to `REDIRECT` and select `WhatsApp Business`.
- [ ] Open `/t/mamdouh`; confirm it redirects to WhatsApp.
- [ ] Switch the tag back to `PROFILE`.
- [ ] Set the status to `LOST`; confirm `/t/mamdouh` shows the lost safe page.
- [ ] Restore the status to `ACTIVE`; confirm the public profile works again.
- [ ] Repeat with `PAUSED` and restore it.

## Admin lifecycle

- [ ] As admin, create a user and confirm a default profile and personal organization are created.
- [ ] Create a tag, assign it to the test user, and confirm it appears in that user's dashboard.
- [ ] Change owner and verify incompatible profile/destination bindings are cleared.
- [ ] Set programmed and locked flags and verify their timestamps are retained.
- [ ] Set `DISABLED`; confirm its public token shows the disabled safe page.
