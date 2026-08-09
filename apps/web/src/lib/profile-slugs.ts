import { RESERVED_SHORT_CODES } from "@popwam/shared";

const RESERVED_PROFILE_SLUGS = new Set([
  ...RESERVED_SHORT_CODES,
  "api", "admin", "dashboard", "login", "logout", "onboarding", "p", "t",
  "privacy", "terms", "community-guidelines", "settings", "support", "www",
]);

export function normalizeProfileSlug(value: string) {
  return value.normalize("NFKC").trim().toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export function validateProfileSlug(value: string) {
  const slug = normalizeProfileSlug(value);
  if (slug.length < 3) return { ok: false as const, error: "SLUG_TOO_SHORT" };
  if (RESERVED_PROFILE_SLUGS.has(slug)) return { ok: false as const, error: "SLUG_RESERVED" };
  return { ok: true as const, slug };
}

/** Produces the initial owner-facing draft link. The random component is
 * supplied by the server so clients can never claim or predict uniqueness. */
export function defaultProfileSlug(displayName: string, randomValue: string) {
  const suffix = normalizeProfileSlug(randomValue).replace(/-/g, "").slice(0, 8) || "profile";
  const maximumBaseLength = Math.max(3, 63 - suffix.length - 1);
  const base = normalizeProfileSlug(displayName).slice(0, maximumBaseLength).replace(/-$/g, "") || "pop";
  return `${base}-${suffix}`;
}
