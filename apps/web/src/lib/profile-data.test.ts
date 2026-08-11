import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PROFILE_DATA_FIELD_INVENTORY,
  allowedStructuredModuleKeys,
  profileDataClassification,
  profileFieldCapabilities,
  validateProfileStructuredValue,
} from "./profile-data-capabilities";
import { buildVerificationProjection, evaluateProfileCompletion, verificationTransitionDecision } from "./profile-data";

describe("profile data and trust foundation", () => {
  it.each([
    ["PERSONAL", "personal", ["city", "country", "additional_languages"], ["working_hours", "catalog_url"]],
    ["PERSONAL", "professional", ["skills", "education", "work_experience", "portfolio_url"], ["catalog_url"]],
    ["PERSONAL", "creator", ["featured_content_url", "business_inquiry_email", "portfolio_url"], ["working_hours"]],
    ["BUSINESS", "company", ["trade_name", "working_hours", "catalog_url", "service_area"], ["specialty"]],
    ["BUSINESS", "restaurant", ["cuisine", "menu_url", "order_url", "reservation_url"], ["specialty"]],
    ["BUSINESS", "clinic", ["provider_type", "specialty", "doctor", "booking_url"], ["cuisine"]],
  ] as const)("maps %s/%s to its code-owned field set", (kind, category, included, excluded) => {
    const keys = profileFieldCapabilities(kind, category, "en").map((item) => item.key);
    expect(keys).toEqual(expect.arrayContaining([...included]));
    for (const key of excluded) expect(keys).not.toContain(key);
  });

  it("surfaces category capabilities without exposing private or trust fields", () => {
    const clinic = profileFieldCapabilities("BUSINESS", "clinic", "en");
    expect(clinic.map((item) => item.key)).toEqual(expect.arrayContaining(["specialty", "doctor", "booking_url", "working_hours"]));
    expect(clinic.every((item) => item.classification === "PUBLIC_PROFILE")).toBe(true);
    expect(clinic.map((item) => item.key)).not.toContain("medicalRegistration");
    expect(profileDataClassification("medicalRegistration")).toBe("TRUST_VERIFICATION");
    expect(profileDataClassification("accountEmail")).toBe("ACCOUNT_PRIVATE");
    expect(allowedStructuredModuleKeys("BUSINESS", "restaurant").has("CATALOG")).toBe(true);
  });

  it("keeps the classification inventory unique and code-owned", () => {
    const keys = PROFILE_DATA_FIELD_INVENTORY.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(() => validateProfileStructuredValue("PERSONAL", "professional", "identityEvidence", "secret")).toThrow("PROFILE_FIELD_NOT_ALLOWED");
  });

  it("normalizes supported structured values and rejects malformed values", () => {
    expect(validateProfileStructuredValue("BUSINESS", "restaurant", "menu_url", "menu.example/path").value).toBe("https://menu.example/path");
    expect(validateProfileStructuredValue("PERSONAL", "professional", "skills", ["Kotlin", "Kotlin"]).value).toEqual(["Kotlin"]);
    expect(() => validateProfileStructuredValue("BUSINESS", "restaurant", "working_hours", { monday: { open: "25:00", close: "18:00" } })).toThrow("PROFILE_FIELD_INVALID");
    expect(() => validateProfileStructuredValue("PERSONAL", "personal", "specialty", "Cardiology")).toThrow("PROFILE_FIELD_NOT_ALLOWED");
  });

  it("keeps completion separate from publishing, visibility, and verification", () => {
    const base = {
      displayName: "Dr Pop",
      profileKind: "BUSINESS" as const,
      type: "ORGANIZATION" as const,
      category: { slug: "clinic" },
      profession: "DOCTOR",
      organizationNameAr: null,
      organizationNameEn: "POP Clinic",
      jobTitleAr: null,
      jobTitleEn: null,
      customProfession: null,
      sectionEntries: [] as Array<{ fieldKey: string; value: unknown }>,
    };
    expect(evaluateProfileCompletion(base)).toEqual(expect.objectContaining({ complete: false }));
    expect(evaluateProfileCompletion({ ...base, sectionEntries: [{ fieldKey: "specialty", value: "Cardiology" }] })).toEqual({ complete: true, issues: [] });
  });

  it("projects only safe verification status and forbids owner self-approval", () => {
    const projection = buildVerificationProjection("PERSONAL", "professional", [{
      kind: "IDENTITY", status: "VERIFIED", reasonCode: null,
      verifiedAt: new Date("2026-01-01T00:00:00.000Z"), expiresAt: null,
    }], new Date("2026-02-01T00:00:00.000Z"));
    expect(projection.submissionSupported).toBe(false);
    expect(projection.signals[0]).toEqual(expect.objectContaining({ status: "VERIFIED", publicBadge: true }));
    expect(JSON.stringify(projection)).not.toMatch(/evidence|provider|document/i);
    expect(verificationTransitionDecision("OWNER", "VERIFIED")).toEqual({ allowed: false, error: "VERIFICATION_SERVER_AUTHORITY_REQUIRED" });
    expect(verificationTransitionDecision("SYSTEM", "VERIFIED")).toEqual({ allowed: false, error: "VERIFICATION_REVIEW_AUTHORITY_REQUIRED" });
    expect(verificationTransitionDecision("ADMIN", "VERIFIED")).toEqual({ allowed: true });
  });

  it("uses an additive migration with no inferred trust state", () => {
    const migration = readFileSync(new URL("../../../../packages/db/prisma/migrations/20260809190000_profile_data_trust_foundation/migration.sql", import.meta.url), "utf8");
    expect(migration).toContain('CREATE TABLE "ProfileSectionEntry"');
    expect(migration).toContain('CREATE TABLE "ProfileVerificationCase"');
    expect(migration).toContain('UPDATE "ProfileRevision" AS revision');
    expect(migration).toContain('revision."profileId" = profile."id"');
    expect(migration).not.toMatch(/DELETE FROM|DROP TABLE|UPDATE "ProfileVerificationCase"/);
  });
});
