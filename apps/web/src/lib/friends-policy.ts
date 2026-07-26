export const FRIEND_SEARCH_MIN_LENGTH = 2;
export const FRIEND_SEARCH_MAX_LENGTH = 64;
export const FRIEND_SEARCH_PAGE_SIZE = 20;
export const FRIEND_PENDING_OUTGOING_LIMIT = 100;
export const FRIEND_REQUEST_HOURLY_LIMIT = 20;
export const FRIEND_REQUEST_NEW_ACCOUNT_HOURLY_LIMIT = 5;
export const FRIEND_REQUEST_DAILY_LIMIT = 50;
export const FRIEND_RECIPIENT_HOURLY_LIMIT = 100;
export const FRIEND_REJECTION_COOLDOWN_MS = 7 * 24 * 60 * 60_000;
export const FRIEND_REPORT_DAILY_LIMIT = 10;
export const FRIEND_REPORT_DETAILS_MAX_LENGTH = 500;

export const friendReportCategories = [
  "SPAM",
  "HARASSMENT",
  "IMPERSONATION",
  "INAPPROPRIATE_CONTENT",
  "SCAM",
  "PRIVACY",
  "OTHER",
] as const;

export type FriendRelationshipState =
  | "NONE"
  | "OUTGOING_PENDING"
  | "INCOMING_PENDING"
  | "FRIENDS"
  | "BLOCKED_BY_ME"
  | "BLOCKED_ME";

export type RelationshipFacts = {
  viewerId: string;
  otherId: string;
  accepted: boolean;
  pendingRequesterId?: string | null;
  blockerIds?: string[];
};

export function canonicalFriendPair(first: string, second: string) {
  const [low, high] = first < second ? [first, second] : [second, first];
  return { userAId: low, userBId: high, pairKey: `${low}:${high}` };
}

export function relationshipState(facts: RelationshipFacts): FriendRelationshipState {
  const blockers = new Set(facts.blockerIds || []);
  if (blockers.has(facts.viewerId)) return "BLOCKED_BY_ME";
  if (blockers.has(facts.otherId)) return "BLOCKED_ME";
  if (facts.accepted) return "FRIENDS";
  if (facts.pendingRequesterId === facts.viewerId) return "OUTGOING_PENDING";
  if (facts.pendingRequesterId === facts.otherId) return "INCOMING_PENDING";
  return "NONE";
}

/** A blocked recipient never learns whether the other account blocked them. */
export function publicRelationshipState(state: FriendRelationshipState) {
  return state === "BLOCKED_ME" ? "UNAVAILABLE" : state;
}

export function normalizeFriendSearch(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalized.length < FRIEND_SEARCH_MIN_LENGTH || normalized.length > FRIEND_SEARCH_MAX_LENGTH) return null;
  return normalized;
}

export function parseSocialKey(value: unknown) {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return /^[a-z0-9_-]{10,80}$/i.test(key) ? key : null;
}

export function parseFriendsSettingsPatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(["socialProfileSlug", "allowFriendRequests", "discoverableByProfileSearch", "locale"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  const output: { socialProfileSlug?: string; allowFriendRequests?: boolean; discoverableByProfileSearch?: boolean } = {};
  if ("socialProfileSlug" in input) {
    if (typeof input.socialProfileSlug !== "string" || input.socialProfileSlug.length > 100) return null;
    output.socialProfileSlug = input.socialProfileSlug.trim().toLocaleLowerCase();
  }
  for (const key of ["allowFriendRequests", "discoverableByProfileSearch"] as const) {
    if (key in input) {
      if (typeof input[key] !== "boolean") return null;
      output[key] = input[key];
    }
  }
  return output;
}

export function parseFriendPreferencePatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "favorite" && key !== "muted")) return null;
  const output: { favorite?: boolean; muted?: boolean } = {};
  if ("favorite" in input) {
    if (typeof input.favorite !== "boolean") return null;
    output.favorite = input.favorite;
  }
  if ("muted" in input) {
    if (typeof input.muted !== "boolean") return null;
    output.muted = input.muted;
  }
  return Object.keys(output).length ? output : null;
}

export function parseReportInput(category: unknown, details: unknown) {
  if (typeof category !== "string" || !friendReportCategories.includes(category as never)) return null;
  if (details != null && typeof details !== "string") return null;
  const clean = typeof details === "string" ? details.normalize("NFKC").trim() : "";
  if (clean.length > FRIEND_REPORT_DETAILS_MAX_LENGTH || /<\s*\/?\s*[a-z][^>]*>/i.test(clean)) return null;
  return { category: category as typeof friendReportCategories[number], details: clean || null };
}

export function profileAccessForFriend(access: string, accepted: boolean, blocked: boolean) {
  if (blocked || !accepted || access === "PRIVATE") return false;
  return access === "PUBLIC" || access === "UNLISTED";
}

export function canReadModuleForAudience(visibility: string, audience: "PUBLIC" | "FRIEND" | "OWNER") {
  if (audience === "OWNER") return true;
  if (visibility === "PUBLIC") return true;
  return audience === "FRIEND" && visibility === "FRIENDS";
}

export function notificationDeliveryAllowed(input: { socialEnabled: boolean; muted: boolean; blocked: boolean }) {
  return input.socialEnabled && !input.muted && !input.blocked;
}
