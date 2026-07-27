import { describe, expect, it } from "vitest";
import { passkeyRegistrationEligibility } from "./passkey-registration-policy";

const now = new Date("2026-07-27T12:00:00.000Z");

describe("passkey registration eligibility", () => {
  it("permits a first passkey immediately after OTP authentication", () => {
    expect(passkeyRegistrationEligibility({
      activePasskeyCount: 0,
      authMethod: "OTP",
      lastAuthenticatedAt: new Date(now.getTime() - 9 * 60_000),
      now,
    })).toMatchObject({ freshnessSatisfied: true, stepUpRequired: false, passkeyEnrollmentEligible: true });
  });

  it("requires step-up for a stale or legacy session", () => {
    expect(passkeyRegistrationEligibility({ activePasskeyCount: 0, authMethod: "OTP", lastAuthenticatedAt: new Date(now.getTime() - 10 * 60_000), now }))
      .toMatchObject({ freshnessSatisfied: false, stepUpRequired: true, passkeyEnrollmentEligible: false });
    expect(passkeyRegistrationEligibility({ activePasskeyCount: 0, authMethod: "LEGACY", lastAuthenticatedAt: now, now }))
      .toMatchObject({ freshnessSatisfied: false, stepUpRequired: true, passkeyEnrollmentEligible: false });
  });

  it("permits replacement enrollment after fresh OTP while retaining the existing credential", () => {
    expect(passkeyRegistrationEligibility({ activePasskeyCount: 1, authMethod: "OTP", lastAuthenticatedAt: now, now }))
      .toMatchObject({ hasExistingPasskey: true, freshnessSatisfied: true, stepUpRequired: false, passkeyEnrollmentEligible: true });
  });
});
