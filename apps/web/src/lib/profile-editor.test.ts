import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moduleUpdateDecision, profileEditorMutationDecision, PROFILE_EDITOR_MODULE_KEYS, templateAllowsModule } from "./profile-editor";

const server = readFileSync(new URL("./profile-editor.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/profiles/[profileId]/editor/route.ts", import.meta.url), "utf8");

describe("Phase F profile editor contract", () => {
  it("authorizes management and rejects stale or archived draft writes", () => {
    expect(profileEditorMutationDecision({ currentRevision: 4, expectedRevision: 4, lifecycle: "DRAFT", canManage: true })).toEqual({ allowed: true });
    expect(profileEditorMutationDecision({ currentRevision: 5, expectedRevision: 4, lifecycle: "DRAFT", canManage: true })).toEqual({ allowed: false, error: "STALE_DRAFT" });
    expect(profileEditorMutationDecision({ currentRevision: 4, expectedRevision: 4, lifecycle: "ARCHIVED", canManage: true })).toEqual({ allowed: false, error: "PROFILE_ARCHIVED" });
    expect(profileEditorMutationDecision({ currentRevision: 4, expectedRevision: 4, lifecycle: "DRAFT", canManage: false })).toEqual({ allowed: false, error: "PROFILE_NOT_FOUND" });
  });

  it("keeps the editor registry code-owned and excludes future engines", () => {
    expect(PROFILE_EDITOR_MODULE_KEYS).toEqual(["IDENTITY", "ABOUT", "CONTACT", "SOCIAL", "LINKS", "SERVICES", "PORTFOLIO", "GALLERY", "BRANCHES", "CATALOG"]);
    expect(PROFILE_EDITOR_MODULE_KEYS).not.toContain("BOOKING");
    expect(PROFILE_EDITOR_MODULE_KEYS).toContain("CATALOG");
    expect(server).not.toContain("dangerouslySetInnerHTML");
  });

  it("rejects unsupported, disallowed, or required-module disable operations", () => {
    expect(moduleUpdateDecision({ key: "BOOKING", supported: false, allowed: true, required: false, enabled: true })).toEqual({ allowed: false, error: "MODULE_UNSUPPORTED" });
    expect(moduleUpdateDecision({ key: "SERVICES", supported: true, allowed: false, required: false, enabled: true })).toEqual({ allowed: false, error: "MODULE_NOT_ALLOWED" });
    expect(moduleUpdateDecision({ key: "IDENTITY", supported: true, allowed: true, required: true, enabled: false })).toEqual({ allowed: false, error: "MODULE_REQUIRED" });
  });

  it("keeps exposed Professional PORTFOLIO and Restaurant CATALOG capabilities persistable", () => {
    const template = { moduleRules: [{ moduleDefinition: { key: "IDENTITY" }, allowed: true }] };
    expect(templateAllowsModule({ templateId: "template", template, profileKind: "PERSONAL", category: { slug: "professional" } }, "PORTFOLIO")).toBe(true);
    expect(templateAllowsModule({ templateId: "template", template, profileKind: "BUSINESS", category: { slug: "restaurant" } }, "CATALOG")).toBe(true);
    expect(templateAllowsModule({ templateId: "template", template: { moduleRules: [...template.moduleRules, { moduleDefinition: { key: "CATALOG" }, allowed: false }] }, profileKind: "BUSINESS", category: { slug: "restaurant" } }, "CATALOG")).toBe(false);
  });

  it("returns selector primary markers, server quota context, and safe additional-profile gating", () => {
    expect(server).toContain("isPrimary: profile.isPrimary");
    expect(server).toContain("profileLimitIncrement");
    expect(server).toContain("quotaAllowsAdditional");
    expect(server).toContain('onboardingSupported: false');
    expect(server).toContain('"ONBOARDING_PROGRESS_USER_SCOPED"');
  });

  it("uses one shared owner/team editor projection and POP authorization route", () => {
    expect(server).toContain("managedProfileWhere(userId, profileId)");
    expect(server).toContain("OrgRole.ORG_ADMIN");
    expect(route).toContain("getCurrentPopUser");
    expect(route).toContain("isTrustedPopMutation");
    expect(route).not.toContain("Firebase");
  });

  it("keeps identity, about, and contact writes bounded and draft-only", () => {
    expect(server).toContain('case "IDENTITY_SAVE"');
    expect(server).toContain('case "ABOUT_SAVE"');
    expect(server).toContain('case "CONTACT_SAVE"');
    expect(server).toContain("draftRevision: { increment: 1 }");
    expect(server).not.toContain("profilePublication.update");
  });

  it("provides owned link, service, and branch CRUD without cross-profile IDs", () => {
    expect(server).toContain('case "LINK_UPSERT"');
    expect(server).toContain('case "SERVICE_UPSERT"');
    expect(server).toContain('case "BRANCH_UPSERT"');
    expect(server).toContain("where: { id, profileId");
    expect(server).toContain("editableDestinationTypes");
  });

  it("persists code-owned typed structured entries with exact optimistic mutations", () => {
    expect(server).toContain('case "SECTION_ENTRY_UPSERT"');
    expect(server).toContain('case "SECTION_ENTRY_DELETE"');
    expect(server).toContain('case "SECTION_ENTRY_REORDER"');
    expect(server).toContain("validateProfileStructuredValue");
    expect(server).toContain("profileSectionEntry");
    expect(server).toContain("fieldCapabilities:");
    expect(server).toContain("structuredEntries:");
    expect(server).toContain("completion:");
    expect(server).toContain("buildVerificationProjection");
  });

  it("validates module and item order on the server", () => {
    expect(server).toContain("uniqueStringList");
    expect(server).toContain('case "MODULE_REORDER"');
    expect(server).toContain("keys.length !== profile.modules.length");
    expect(server).toContain("rows.length !== ids.length");
  });

  it("integrates field, module, and media visibility conservatively", () => {
    expect(server).toContain("showPhone: booleanVisibility");
    expect(server).toContain('case "MODULE_UPDATE"');
    expect(server).toContain('case "MEDIA_VISIBILITY"');
    expect(server).toContain('visibility: "ONLY_ME"');
  });

  it("uses a serializable locked compare-and-increment mutation", () => {
    expect(server).toContain('FOR UPDATE');
    expect(server).toContain("expectedRevision");
    expect(server).toContain("Prisma.TransactionIsolationLevel.Serializable");
    expect(route).toContain('code === "STALE_DRAFT" ? 409');
  });

  it("calculates section-level draft changes against the published revision", () => {
    expect(server).toContain("changedEditorSections");
    expect(server).toContain(".filter((item) => item.isActive)");
    expect(server).toContain("loadPublishedRevision(profileId)");
    expect(server).toContain("changedSections");
    expect(server).toContain("draftChanged");
  });

  it("preserves legacy editing without migration-on-load", () => {
    expect(server).toContain('profile.profileKind || (profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL")');
    expect(server).not.toContain("migrateLegacy");
    expect(server).not.toContain("createMany({ data: profile");
  });
});
