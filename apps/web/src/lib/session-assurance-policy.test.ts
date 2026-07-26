import { describe, expect, it } from "vitest";
import { sessionAssuranceDecision } from "./session-assurance-policy";

describe("server-owned session assurance policy", () => {
  it("requires a passkey reauthentication after long inactivity", () => {
    expect(sessionAssuranceDecision({ lastAuthenticatedAt: new Date("2026-06-01T00:00:00Z"), now: new Date("2026-07-25T00:00:00Z") })).toBe("PASSKEY_REAUTH_REQUIRED");
  });

  it("requires step-up for sensitive actions regardless of normal session age", () => {
    expect(sessionAssuranceDecision({ lastAuthenticatedAt: new Date(), sensitiveAction: true })).toBe("STEP_UP_REQUIRED");
  });
});
