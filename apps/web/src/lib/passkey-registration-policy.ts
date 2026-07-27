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
  const stepUpRequired = hasExistingPasskey || !freshnessSatisfied;
  return { hasExistingPasskey, freshnessSatisfied, stepUpRequired, passkeyEnrollmentEligible: !stepUpRequired };
}
