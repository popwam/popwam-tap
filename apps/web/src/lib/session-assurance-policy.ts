export const LONG_INACTIVITY_DAYS = 30;

/** Server policy foundation. This deliberately uses server-owned session/login
 * timestamps; clients never decide whether a sensitive action is assured. */
export function sessionAssuranceDecision(input: { lastAuthenticatedAt: Date | null; now?: Date; sensitiveAction?: boolean }) {
  if (input.sensitiveAction) return "STEP_UP_REQUIRED" as const;
  if (!input.lastAuthenticatedAt) return "PASSKEY_OR_OTP_REQUIRED" as const;
  const now = input.now || new Date();
  const inactiveDays = (now.getTime() - input.lastAuthenticatedAt.getTime()) / 86_400_000;
  return inactiveDays >= LONG_INACTIVITY_DAYS ? "PASSKEY_REAUTH_REQUIRED" as const : "SESSION_CONTINUES" as const;
}
