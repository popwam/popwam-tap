/** Shared server-owned policy for whether a registration ceremony may begin.
 * It deliberately receives the resolved DeviceSession context, never JWT time. */
export function passkeyRegistrationEligibility(input: {
  activePasskeyCount: number;
  authMethod: string;
  lastAuthenticatedAt: Date | null;
  now?: Date;
}) {
  const now = input.now || new Date();
  const freshnessSatisfied = Boolean(
    input.lastAuthenticatedAt &&
    input.lastAuthenticatedAt.getTime() > now.getTime() - 10 * 60_000 &&
    input.authMethod !== "LEGACY",
  );
  const hasExistingPasskey = input.activePasskeyCount > 0;
  // A freshly verified OTP session is recovery proof for a replacement. Existing credentials
  // remain active until a new registration has been fully verified and stored.
  const stepUpRequired = !freshnessSatisfied;
  return { hasExistingPasskey, freshnessSatisfied, stepUpRequired, passkeyEnrollmentEligible: !stepUpRequired };
}
