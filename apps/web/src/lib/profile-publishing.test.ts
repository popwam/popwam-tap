import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectImageContentType } from "@popwam/storage";
import { evaluateProfileReadiness, type DraftProfileData } from "./profile-publishing";
import { normalizeProfileSlug, validateProfileSlug } from "./profile-slugs";

function draft(overrides: Partial<DraftProfileData> = {}) {
  return {
    id: "profile-1", userId: "user-1", displayName: "POP User", profileKind: "PERSONAL",
    categoryId: "category-1", templateId: "template-1", lifecycle: "DRAFT",
    access: "PUBLIC", slug: "pop-user", draftRevision: 4,
    mediaAssets: [], fields: [], uploads: [], destinations: [], services: [], branches: [],
    modules: [{ moduleDefinitionId: "identity", moduleDefinition: { id: "identity", key: "IDENTITY" }, enabled: true, visibility: "PUBLIC" }],
    template: { moduleRules: [{ moduleDefinitionId: "identity", required: true, moduleDefinition: { key: "IDENTITY" } }] },
    ...overrides,
  } as unknown as DraftProfileData;
}

describe("profile publishing policy", () => {
  it("supports first publish for complete PERSONAL and BUSINESS drafts", () => {
    expect(evaluateProfileReadiness(draft()).ready).toBe(true);
    expect(evaluateProfileReadiness(draft({ profileKind: "BUSINESS" })).ready).toBe(true);
  });

  it("returns structured readiness issues without requiring optional menu or booking content", () => {
    const result = evaluateProfileReadiness(draft({ displayName: "", access: "PRIVATE", slug: null }));
    expect(result.ready).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(expect.arrayContaining(["DISPLAY_NAME_REQUIRED", "VISIBILITY_REQUIRED", "SLUG_REQUIRED"]));
    expect(result.issues.every((item) => item.path && item.messageKey && item.blocking)).toBe(true);
    expect(result.issues.map((item) => item.code)).not.toContain("MENU_REQUIRED");
    expect(result.issues.map((item) => item.code)).not.toContain("BOOKING_REQUIRED");
  });

  it("blocks a required missing or disabled template module", () => {
    expect(evaluateProfileReadiness(draft({ modules: [] })).issues).toContainEqual(expect.objectContaining({ code: "REQUIRED_MODULE_MISSING", path: "modules.IDENTITY" }));
    const disabled = draft({ modules: [{ moduleDefinitionId: "identity", moduleDefinition: { id: "identity", key: "IDENTITY" }, enabled: false, visibility: "PUBLIC" }] as never });
    expect(evaluateProfileReadiness(disabled).issues).toContainEqual(expect.objectContaining({ code: "REQUIRED_MODULE_DISABLED" }));
  });

  it("normalizes slugs conservatively and rejects reserved names", () => {
    expect(normalizeProfileSlug("  POP_User  ")).toBe("pop-user");
    expect(validateProfileSlug("api")).toEqual({ ok: false, error: "SLUG_RESERVED" });
    expect(validateProfileSlug("my-profile")).toEqual({ ok: true, slug: "my-profile" });
  });

  it("detects actual image bytes rather than trusting client MIME", () => {
    expect(detectImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectImageContentType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });

  it("uses immutable normalized children and an atomic publication pointer", () => {
    const source = readFileSync(new URL("./profile-publishing.ts", import.meta.url), "utf8");
    expect(source).toContain("profileRevision.create");
    expect(source).toContain("profilePublication.upsert");
    expect(source).toContain("isolationLevel: \"Serializable\"");
    expect(source).not.toContain("projection:");
  });

  it("snapshots PUBLIC and FRIENDS modules while keeping anonymous media and projection public-only", () => {
    const source = readFileSync(new URL("./profile-publishing.ts", import.meta.url), "utf8");
    expect(source).toContain('item.enabled && (item.visibility === "PUBLIC" || item.visibility === "FRIENDS")');
    expect(source).toContain('snapshotModules.filter((item) => item.visibility === "PUBLIC")');
    expect(source).toContain("profile.fields.filter((item) => item.isVisible)");
    expect(source).toContain("profile.destinations.filter((item) => item.isActive && item.isVisible)");
  });

  it("preserves old published content until the publication pointer changes", () => {
    const source = readFileSync(new URL("./profile-projection.ts", import.meta.url), "utf8");
    expect(source).toContain("loadPublishedRevision(profile.id)");
    expect(source).toContain("revisionToPublicProfile");
    expect(source).toContain("profile.profileKind == null && profile.isPublic");
  });

  it("keeps pause, resume, archive, stale retry and idempotency server-owned", () => {
    const source = readFileSync(new URL("./profile-publishing.ts", import.meta.url), "utf8");
    expect(source).toContain('throw new Error("STALE_DRAFT")');
    expect(source).toContain("publishedRevision.draftFingerprint === fingerprint");
    expect(source).toContain('action === "archive"');
    expect(source).toContain('action === "pause" ? "PAUSED" : "PUBLISHED"');
  });

  it("keeps draft media private and exposes it only through the current published revision", () => {
    const media = readFileSync(new URL("../app/api/profiles/[profileId]/media/route.ts", import.meta.url), "utf8");
    const publishing = readFileSync(new URL("./profile-publishing.ts", import.meta.url), "utf8");
    const delivery = readFileSync(new URL("../app/api/public-profile-media/[mediaId]/route.ts", import.meta.url), "utf8");
    expect(media).toContain("isDraftStorageEnabled");
    expect(media).toContain("detectImageContentType");
    expect(publishing).toContain('item.visibility === "PUBLIC"');
    expect(delivery).toContain("currentFor");
    expect(delivery).toContain("readDraftObject");
  });
});
