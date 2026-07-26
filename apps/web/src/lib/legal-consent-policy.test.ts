import { describe, expect, it } from "vitest";
import { canRecordLegalConsentForUser, legalConsentDecision, legalConsentRecordDecision } from "./legal-consent-policy";

describe("versioned legal consent policy", () => {
  const now = new Date("2026-07-25T00:00:00.000Z");

  it("accepts an active mandatory document and retains its required distinction", () => {
    expect(legalConsentDecision({ id: "terms-v1", isActive: true, effectiveAt: now, required: true }, now)).toEqual({ allowed: true, required: true });
    expect(legalConsentDecision({ id: "marketing-v1", isActive: true, effectiveAt: now, required: false }, now)).toEqual({ allowed: true, required: false });
  });

  it("keeps duplicate same-document acceptance idempotent while a new version is distinct", () => {
    expect(legalConsentRecordDecision("consent-v1")).toEqual({ kind: "RETURN_EXISTING", consentId: "consent-v1" });
    expect(legalConsentRecordDecision(null)).toEqual({ kind: "CREATE" });
  });

  it("rejects inactive/future documents and never authorizes consent for another user", () => {
    expect(legalConsentDecision({ id: "privacy-v2", isActive: false, effectiveAt: now, required: true }, now)).toEqual({ allowed: false, reason: "LEGAL_DOCUMENT_UNAVAILABLE" });
    expect(legalConsentDecision({ id: "privacy-v3", isActive: true, effectiveAt: new Date(now.getTime() + 1), required: true }, now)).toEqual({ allowed: false, reason: "LEGAL_DOCUMENT_UNAVAILABLE" });
    expect(canRecordLegalConsentForUser("user-1", "user-1")).toBe(true);
    expect(canRecordLegalConsentForUser("user-1", "user-2")).toBe(false);
  });
});
