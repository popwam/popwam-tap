import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "./api-auth";

export function friendsLocale(value: unknown): "ar" | "en" {
  return value === "ar" ? "ar" : "en";
}

export async function friendsUser(request: Request, mutation = false) {
  if (mutation && !isTrustedPopMutation(request)) return { response: csrfRejected(), user: null };
  const user = await getCurrentPopUser(request);
  return user ? { response: null, user } : { response: unauthorized(), user: null };
}

const exposedErrors = new Set([
  "FRIENDS_POLICY_UNAVAILABLE",
  "FRIENDS_POLICY_REQUIRED",
  "SOCIAL_PROFILE_INVALID",
  "DISCOVERY_REQUIRES_PUBLIC_PROFILE",
  "SEARCH_QUERY_INVALID",
  "RELATIONSHIP_UNAVAILABLE",
  "REQUEST_UNAVAILABLE",
  "FRIEND_REQUEST_LIMITED",
  "FRIEND_REQUEST_COOLDOWN",
  "FRIENDSHIP_REQUIRED",
  "REPORT_INVALID",
  "REPORT_LIMITED",
  "BLOCK_UNAVAILABLE",
]);

export function friendsError(error: unknown) {
  const candidate = error instanceof Error ? error.message : "";
  const code = exposedErrors.has(candidate) ? candidate : "FRIENDS_REQUEST_FAILED";
  const status = code === "FRIENDS_POLICY_REQUIRED" ? 428
    : code === "FRIENDS_POLICY_UNAVAILABLE" ? 503
    : code.endsWith("_LIMITED") || code.endsWith("_COOLDOWN") ? 429
    : code === "FRIENDS_REQUEST_FAILED" ? 500
    : 400;
  return Response.json({ ok: false, error: code }, { status, headers: { "cache-control": "no-store" } });
}

