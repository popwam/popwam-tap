import { describe, expect, it } from "vitest";
import { legalReadyForDocuments } from "./legal-readiness-policy";

const current=(documentType:string, overrides:Record<string, unknown>={}) => ({ documentType, required:true, requiresAcceptance:true, isActive:true, status:"PUBLISHED", effectiveAt:new Date("2025-01-01"), ...overrides });
describe("legal readiness contract", () => {
  it("requires both published and effective Terms and Privacy", () => expect(legalReadyForDocuments([current("TERMS"),current("PRIVACY")],new Date("2026-01-01"))).toBe(true));
  it("rejects drafts, archived, inactive and future documents", () => {
    for(const override of [{status:"DRAFT"},{status:"ARCHIVED"},{isActive:false},{effectiveAt:new Date("2099-01-01")}]) expect(legalReadyForDocuments([current("TERMS"),current("PRIVACY",override)],new Date("2026-01-01"))).toBe(false);
  });
});
