import { describe, expect, it } from "vitest";
import { categoryTemplateCompatibility, defaultModuleKeys, idempotentProfileCreationDecision, primaryProfileDecision, profileModuleDecision, profileQuotaDecision } from "./profile-domain-policy";

describe("Phase B profile domain policy", () => {
  it("creates one primary profile and prevents a duplicate primary", () => {
    expect(primaryProfileDecision({ activePrimaryIds: [], operation: "CREATE_PRIMARY" })).toEqual({ allowed: true });
    expect(primaryProfileDecision({ activePrimaryIds: ["profile-1"], operation: "CREATE_PRIMARY" })).toEqual({ allowed: false, reason: "PRIMARY_PROFILE_ALREADY_EXISTS" });
  });

  it("requires an existing primary before an additional profile and allows a transactional switch target", () => {
    expect(primaryProfileDecision({ activePrimaryIds: [], operation: "CREATE_ADDITIONAL" })).toEqual({ allowed: false, reason: "PRIMARY_PROFILE_REQUIRED" });
    expect(primaryProfileDecision({ activePrimaryIds: ["profile-1"], operation: "CREATE_ADDITIONAL" })).toEqual({ allowed: true });
    expect(primaryProfileDecision({ activePrimaryIds: ["profile-1"], operation: "SET_PRIMARY", targetId: "profile-2", targetArchived: false })).toEqual({ allowed: true });
    expect(primaryProfileDecision({ activePrimaryIds: ["profile-1"], operation: "SET_PRIMARY", targetId: "profile-2", targetArchived: true })).toEqual({ allowed: false, reason: "PRIMARY_PROFILE_TARGET_INVALID" });
  });

  it("enforces additional-profile quota and permits a recorded entitlement increment", () => {
    expect(profileQuotaDecision({ used: 1, baseLimit: 1, entitlementIncrement: 0, requested: 1, profileKind: "PERSONAL", allowBusinessProfiles: false })).toEqual({ allowed: false, reason: "PROFILE_LIMIT_REACHED" });
    expect(profileQuotaDecision({ used: 1, baseLimit: 1, entitlementIncrement: 1, requested: 1, profileKind: "PERSONAL", allowBusinessProfiles: false })).toEqual({ allowed: true });
  });

  it("rejects incompatible business category/template selection", () => {
    expect(categoryTemplateCompatibility({ profileKind: "PERSONAL", categoryKind: "BUSINESS" })).toEqual({ compatible: false, reason: "PROFILE_CATEGORY_INCOMPATIBLE" });
    expect(categoryTemplateCompatibility({ profileKind: "BUSINESS", templateKind: "PERSONAL" })).toEqual({ compatible: false, reason: "PROFILE_TEMPLATE_INCOMPATIBLE" });
    expect(categoryTemplateCompatibility({ profileKind: "BUSINESS", categoryKind: "BUSINESS", templateKind: "BUSINESS", templateCategoryMatches: true })).toEqual({ compatible: true });
  });

  it("initializes required/default modules and keeps profile creation idempotent by key", () => {
    expect(defaultModuleKeys([{ key: "IDENTITY", allowed: true, enabledByDefault: true, required: false }, { key: "ABOUT", allowed: true, enabledByDefault: false, required: true }], ["CONTACT"])).toEqual(["IDENTITY", "ABOUT"]);
    expect(defaultModuleKeys([], ["IDENTITY", "ABOUT", "CONTACT"])).toEqual(["IDENTITY", "ABOUT", "CONTACT"]);
    expect(idempotentProfileCreationDecision({ userId: "user-1", profileId: "profile-1" }, "user-1")).toEqual({ kind: "RETURN_EXISTING", profileId: "profile-1" });
    expect(idempotentProfileCreationDecision({ userId: "user-1", profileId: "profile-1" }, "user-2")).toEqual({ kind: "CONFLICT", reason: "PROFILE_CREATION_KEY_CONFLICT" });
  });

  it("rejects disabled or template-disallowed modules", () => {
    expect(profileModuleDecision({ definitionActive: false, supportsMultiple: false, instanceKey: "default", profileHasTemplate: false, enabled: true, supportsVisibility: true, nonPublicVisibility: false })).toEqual({ allowed: false, reason: "PROFILE_MODULE_DEFINITION_UNAVAILABLE" });
    expect(profileModuleDecision({ definitionActive: true, supportsMultiple: false, instanceKey: "default", profileHasTemplate: true, templateAllows: false, enabled: true, supportsVisibility: true, nonPublicVisibility: false })).toEqual({ allowed: false, reason: "PROFILE_MODULE_NOT_ALLOWED_BY_TEMPLATE" });
  });
});
