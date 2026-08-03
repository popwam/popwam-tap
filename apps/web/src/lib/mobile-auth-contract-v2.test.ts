import { describe, expect, it } from "vitest";
import { nextEnrollmentAction, sessionScopeForNextAction } from "./mobile-auth-contract-v2";

describe("mobile authentication contract v2", () => {
  it("never bypasses mandatory passkey enrollment", () => {
    expect(nextEnrollmentAction({ passkeyEnrolled: false, biometricOutcome: null })).toBe("ENROLL_PASSKEY");
    expect(nextEnrollmentAction({ passkeyEnrolled: false, biometricOutcome: "UNAVAILABLE" })).toBe("ENROLL_PASSKEY");
  });

  it("requires a biometric outcome after passkey enrollment", () => {
    expect(nextEnrollmentAction({ passkeyEnrolled: true, biometricOutcome: null })).toBe("ENROLL_BIOMETRIC");
    expect(nextEnrollmentAction({ passkeyEnrolled: true, biometricOutcome: "ENROLLED" })).toBe("ACCOUNT_CREATED");
    expect(nextEnrollmentAction({ passkeyEnrolled: true, biometricOutcome: "UNAVAILABLE" })).toBe("ACCOUNT_CREATED");
  });

  it("keeps enrollment actions out of full session scope", () => {
    expect(sessionScopeForNextAction("ENROLL_PASSKEY")).toBe("ENROLLMENT");
    expect(sessionScopeForNextAction("ENROLL_BIOMETRIC")).toBe("ENROLLMENT");
    expect(sessionScopeForNextAction("ACCOUNT_CREATED")).toBe("ENROLLMENT");
    expect(sessionScopeForNextAction("PROFILE_SETUP")).toBe("FULL");
    expect(sessionScopeForNextAction("AUTHENTICATED")).toBe("FULL");
  });
});

