export const SHARE_SOURCE_VALUES = ["qr", "nfc", "native_share", "card", "copy"] as const;
export const SCRATCH_ATTEMPT_LIMITS = {
  product: 5,
  account: 12,
  context: 8,
  network: 25,
  windowMs: 15 * 60_000,
} as const;

const SOCIAL_DESTINATIONS = new Set([
  "FACEBOOK", "LINKEDIN", "GITHUB", "TIKTOK", "INSTAGRAM", "X", "YOUTUBE", "TELEGRAM", "SOCIAL",
]);

export function shareTargetKind(destinationType: string) {
  if (destinationType === "VCF") return "CONTACT" as const;
  return SOCIAL_DESTINATIONS.has(destinationType) ? "SOCIAL" as const : "LINK" as const;
}

export function shareKeyAfterCompareAndSet(generated: string, updatedCount: number, persisted: string | null) {
  return updatedCount === 1 ? generated : persisted;
}

export function cardCanResolve(status: string) {
  return status === "ACTIVE";
}

export type ActivationClaimGate = "SAME_OWNER" | "UNAVAILABLE" | "COOLDOWN" | "VERIFY_SECRET";

export function activationClaimGate(input: {
  ownerId: string | null;
  userId: string;
  assignmentStatus: string;
  cardStatus: string;
  secretState: string;
  lockoutUntil: Date | null;
  now: Date;
}): ActivationClaimGate {
  if (input.ownerId === input.userId) return "SAME_OWNER";
  if (
    input.ownerId ||
    input.assignmentStatus !== "UNASSIGNED" ||
    !["CREATED", "PROGRAMMED"].includes(input.cardStatus) ||
    !["SCRATCH_READY", "LOCKED"].includes(input.secretState)
  ) return "UNAVAILABLE";
  if (input.lockoutUntil && input.lockoutUntil > input.now) return "COOLDOWN";
  return "VERIFY_SECRET";
}

export function activationRateLimited(counts: { product: number; account: number; context: number; network: number }) {
  return counts.product >= SCRATCH_ATTEMPT_LIMITS.product
    || counts.account >= SCRATCH_ATTEMPT_LIMITS.account
    || counts.context >= SCRATCH_ATTEMPT_LIMITS.context
    || counts.network >= SCRATCH_ATTEMPT_LIMITS.network;
}

export function activationCooldownMs(failedAttempts: number) {
  if (failedAttempts < SCRATCH_ATTEMPT_LIMITS.product) return 0;
  return Math.min(24 * 60 * 60_000, 15 * 60_000 * 2 ** Math.min(10, failedAttempts - SCRATCH_ATTEMPT_LIMITS.product));
}

export function activationIdentifierFrom(value: string, allowedHosts: string[]) {
  const trimmed = value.trim();
  let candidate = trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !allowedHosts.includes(url.host.toLowerCase())) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    candidate = parts.length === 1 ? parts[0] : parts.length === 3 && parts[0] === "activate" && parts[1] === "card" ? parts[2] : "";
  } catch {
    candidate = trimmed;
  }
  const normalized = candidate.toLowerCase();
  return /^[a-z0-9_-]{3,80}$/.test(normalized) ? normalized : null;
}

export function approvedPublicShareUrl(value: string, publicHost = "go.popwam.com") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.host.toLowerCase() !== publicHost.toLowerCase() || url.username || url.password || url.search || url.hash) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    return (
      (parts.length === 1 && /^[A-Za-z0-9_-]{3,80}$/.test(parts[0])) ||
      (parts.length === 2 && ["p", "s"].includes(parts[0]) && /^[A-Za-z0-9_-]{3,120}$/.test(parts[1])) ||
      (parts.length === 3 && parts[0] === "p" && parts[2] === "contact.vcf" && /^[A-Za-z0-9_-]{3,120}$/.test(parts[1]))
    );
  } catch {
    return false;
  }
}
