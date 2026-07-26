export type EntryResolution = "NEW_ACCOUNT" | "RETURNING";

export function resolvePostVerificationEntry(isNewUser: boolean): EntryResolution {
  return isNewUser ? "NEW_ACCOUNT" : "RETURNING";
}

export function postVerificationRoute(input: { isNewUser: boolean; hasPasskey: boolean; callbackUrl?: string | null }) {
  if (input.isNewUser) return "/onboarding/start";
  const requested = input.callbackUrl || "/dashboard";
  const safe = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";
  return input.hasPasskey ? safe : `/onboarding/passkey?next=${encodeURIComponent(safe)}`;
}

export function passkeyPromptDecision(input: { isNewUser: boolean; hasPasskey: boolean; bootstrapComplete: boolean }) {
  return input.isNewUser && input.bootstrapComplete && !input.hasPasskey ? "SHOW" : "SKIP";
}

export function bootstrapRoute(input: { isNewUser: boolean; hasPrimaryProfile: boolean; bootstrapComplete: boolean; legalReady: boolean; legalAccepted: boolean }) {
  if (!input.isNewUser) return input.hasPrimaryProfile ? "DASHBOARD" : "LEGACY_COMPATIBILITY";
  if (!input.legalReady) return "LEGAL_UNAVAILABLE";
  if (!input.legalAccepted) return "LEGAL_CONSENT";
  return input.bootstrapComplete ? "PASSKEY_PROMPT" : "PROFILE_BOOTSTRAP";
}
