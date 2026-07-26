import { describe, expect, it } from "vitest";
import { bootstrapRoute, passkeyPromptDecision, postVerificationRoute, resolvePostVerificationEntry } from "./entry-flow-policy";

describe("Phase C entry policy", () => {
  it("does not reveal account state before verification and resolves only afterward", () => {
    expect(resolvePostVerificationEntry(false)).toBe("RETURNING");
    expect(resolvePostVerificationEntry(true)).toBe("NEW_ACCOUNT");
  });

  it("sends only a verified new account to the legal/bootstrap path", () => {
    expect(postVerificationRoute({ isNewUser: true, hasPasskey: false })).toBe("/onboarding/start");
    expect(postVerificationRoute({ isNewUser: false, hasPasskey: true, callbackUrl: "//unsafe" })).toBe("/dashboard");
  });

  it("gates bootstrap on active required legal documents and preserves legacy access", () => {
    expect(bootstrapRoute({ isNewUser: true, hasPrimaryProfile: true, bootstrapComplete: false, legalReady: false, legalAccepted: false })).toBe("LEGAL_UNAVAILABLE");
    expect(bootstrapRoute({ isNewUser: true, hasPrimaryProfile: true, bootstrapComplete: false, legalReady: true, legalAccepted: false })).toBe("LEGAL_CONSENT");
    expect(bootstrapRoute({ isNewUser: false, hasPrimaryProfile: true, bootstrapComplete: false, legalReady: false, legalAccepted: false })).toBe("DASHBOARD");
  });

  it("only shows a passkey prompt after new-account bootstrap", () => {
    expect(passkeyPromptDecision({ isNewUser: true, bootstrapComplete: true, hasPasskey: false })).toBe("SHOW");
    expect(passkeyPromptDecision({ isNewUser: false, bootstrapComplete: true, hasPasskey: false })).toBe("SKIP");
  });
});
