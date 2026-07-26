import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "./api-auth";

export function nearbyLocale(value: unknown): "ar" | "en" {
  return value === "ar" ? "ar" : "en";
}

export function nearbyChannel(request: Request): "WEB" | "ANDROID" {
  return request.headers.get("authorization")?.startsWith("Bearer ") ? "ANDROID" : "WEB";
}

export async function nearbyUser(request: Request, mutation = false) {
  if (mutation && !isTrustedPopMutation(request)) return { response: csrfRejected(), user: null };
  const user = await getCurrentPopUser(request);
  return user ? { response: null, user } : { response: unauthorized(), user: null };
}

const exposed = new Set([
  "NEARBY_UNAVAILABLE",
  "NEARBY_COMMUNITY_REQUIRED",
  "NEARBY_CONSENT_UNAVAILABLE",
  "NEARBY_CONSENT_REQUIRED",
  "NEARBY_PROFILE_REQUIRED",
  "NEARBY_PRESENCE_REQUIRED",
  "NEARBY_SESSION_STALE",
  "NEARBY_LOCATION_INVALID",
  "NEARBY_RATE_LIMITED",
  "NEARBY_MOVEMENT_LIMITED",
]);

export function nearbyError(error: unknown) {
  const candidate = error instanceof Error ? error.message : "";
  const code = exposed.has(candidate) ? candidate : "NEARBY_REQUEST_FAILED";
  const status = code === "NEARBY_UNAVAILABLE" || code === "NEARBY_CONSENT_UNAVAILABLE" ? 503
    : code === "NEARBY_COMMUNITY_REQUIRED" || code === "NEARBY_CONSENT_REQUIRED" || code === "NEARBY_PROFILE_REQUIRED" || code === "NEARBY_PRESENCE_REQUIRED" ? 428
    : code === "NEARBY_SESSION_STALE" ? 409
    : code === "NEARBY_RATE_LIMITED" || code === "NEARBY_MOVEMENT_LIMITED" ? 429
    : code === "NEARBY_REQUEST_FAILED" ? 500
    : 400;
  return Response.json({ ok: false, error: code }, { status, headers: { "cache-control": "no-store" } });
}
