import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectImageContentType } from "@popwam/storage";
import {
  evaluateProfileReadiness,
  type DraftProfileData,
} from "./profile-publishing";
import {
  defaultProfileSlug,
  normalizeProfileSlug,
  validateProfileSlug,
} from "./profile-slugs";

function draft(overrides: Partial<DraftProfileData> = {}) {
  return {
    id: "profile-1",
    userId: "user-1",
    displayName: "POP User",
    profileKind: "PERSONAL",
    categoryId: "category-1",
    templateId: "template-1",
    lifecycle: "DRAFT",
    access: "PUBLIC",
    slug: "pop-user",
    draftRevision: 4,
    mediaAssets: [],
    fields: [],
    uploads: [],
    destinations: [],
    services: [],
    branches: [],
    modules: [
      {
        moduleDefinitionId: "identity",
        moduleDefinition: { id: "identity", key: "IDENTITY" },
        enabled: true,
        visibility: "PUBLIC",
      },
    ],
    template: {
      moduleRules: [
        {
          moduleDefinitionId: "identity",
          required: true,
          moduleDefinition: { key: "IDENTITY" },
        },
      ],
    },
    ...overrides,
  } as unknown as DraftProfileData;
}

describe("profile publishing policy", () => {
  it("supports first publish for complete PERSONAL and BUSINESS drafts", () => {
    expect(evaluateProfileReadiness(draft()).ready).toBe(true);
    expect(
      evaluateProfileReadiness(draft({ profileKind: "BUSINESS" })).ready,
    ).toBe(true);
  });

  it("returns structured readiness issues without requiring optional menu or booking content", () => {
    const result = evaluateProfileReadiness(
      draft({ displayName: "", access: "PRIVATE", slug: null }),
    );
    expect(result.ready).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "DISPLAY_NAME_REQUIRED",
        "VISIBILITY_REQUIRED",
        "SLUG_REQUIRED",
      ]),
    );
    expect(
      result.issues.every(
        (item) => item.path && item.messageKey && item.blocking,
      ),
    ).toBe(true);
    expect(result.issues.map((item) => item.code)).not.toContain(
      "MENU_REQUIRED",
    );
    expect(result.issues.map((item) => item.code)).not.toContain(
      "BOOKING_REQUIRED",
    );
  });

  it("blocks a required missing or disabled template module", () => {
    expect(
      evaluateProfileReadiness(draft({ modules: [] })).issues,
    ).toContainEqual(
      expect.objectContaining({
        code: "REQUIRED_MODULE_MISSING",
        path: "modules.IDENTITY",
      }),
    );
    const disabled = draft({
      modules: [
        {
          moduleDefinitionId: "identity",
          moduleDefinition: { id: "identity", key: "IDENTITY" },
          enabled: false,
          visibility: "PUBLIC",
        },
      ] as never,
    });
    expect(evaluateProfileReadiness(disabled).issues).toContainEqual(
      expect.objectContaining({ code: "REQUIRED_MODULE_DISABLED" }),
    );
  });

  it("applies account-type requirements only when a policy is supplied", () => {
    const policy = {
      key: "BUSINESS",
      nameAr: "أعمال",
      nameEn: "Business",
      nameFr: "Entreprise",
      enabled: true,
      modules: { IDENTITY: "REQUIRED", SERVICES: "REQUIRED" },
      requireVerification: false,
      requireAvatar: true,
      requireCover: false,
    } as const;
    const profile = draft({
      profileKind: "BUSINESS",
      avatarUrl: null,
      logoUrl: null,
    });
    expect(evaluateProfileReadiness(profile).ready).toBe(true);
    expect(
      evaluateProfileReadiness(profile, policy).issues.map((item) => item.code),
    ).toEqual(
      expect.arrayContaining([
        "ACCOUNT_TYPE_MODULE_REQUIRED",
        "ACCOUNT_TYPE_AVATAR_REQUIRED",
      ]),
    );
  });

  it("normalizes slugs conservatively and rejects reserved names", () => {
    expect(normalizeProfileSlug("  POP_User  ")).toBe("pop-user");
    expect(validateProfileSlug("api")).toEqual({
      ok: false,
      error: "SLUG_RESERVED",
    });
    expect(validateProfileSlug("my-profile")).toEqual({
      ok: true,
      slug: "my-profile",
    });
  });

  it("builds a stable default link candidate from the profile name and server randomness", () => {
    expect(defaultProfileSlug("Sarah Studio", "A1B2-C3D4")).toBe(
      "sarah-studio-a1b2c3d4",
    );
    expect(defaultProfileSlug("عيادة", "ABC12345")).toBe("pop-abc12345");
    expect(defaultProfileSlug("a".repeat(100), "12345678")).toHaveLength(63);
  });

  it("tracks public profile appearance in draft readiness fingerprints", () => {
    const source = readFileSync(
      new URL("./profile-publishing.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      "primaryLanguage: profile.primaryLanguage, theme: profile.theme",
    );
  });

  it("keeps create and archive ownership server-derived and mutations trusted", () => {
    const createRoute = readFileSync(
      new URL("../app/api/profiles/route.ts", import.meta.url),
      "utf8",
    );
    const archiveRoute = readFileSync(
      new URL("../app/api/profiles/[profileId]/route.ts", import.meta.url),
      "utf8",
    );
    expect(createRoute).toContain("userId: user.id");
    expect(createRoute).not.toContain("body.userId");
    expect(createRoute).toContain("isTrustedPopMutation(request)");
    expect(archiveRoute).toContain("archiveProfile(user.id, profileId");
    expect(archiveRoute).not.toContain("body.userId");
    expect(archiveRoute).toContain("isTrustedPopMutation(request)");
  });

  it("exposes the mobile create POST contract with canonical profile kinds", () => {
    const createRoute = readFileSync(
      new URL("../app/api/profiles/route.ts", import.meta.url),
      "utf8",
    );
    expect(createRoute).toContain("export async function POST");
    expect(createRoute).toContain(
      'body.profileKind !== "PERSONAL" && body.profileKind !== "BUSINESS"',
    );
    expect(createRoute).toContain("categorySlug: body.categorySlug");
    expect(createRoute).toContain("templateId: body.templateId");
    expect(createRoute).toContain("profileId: profile.id");
  });

  it("requires a live template and initializes core modules for legacy catalogues without rules", () => {
    const domain = readFileSync(
      new URL("./profile-domain.ts", import.meta.url),
      "utf8",
    );
    expect(domain).toContain("resolveInitialTemplate");
    expect(domain).not.toContain('throw new Error("PROFILE_TEMPLATE_REQUIRED")');
    expect(domain).toContain("templateCandidates.length > 0");
    expect(domain).toContain("CORE_MODULE_KEYS");
    expect(domain).toContain(
      'archivedAt: null, lifecycle: { not: "ARCHIVED" }',
    );
    expect(domain).toContain("timeout: 30_000");
  });

  it("keeps archived profiles out of legacy mobile selection and active quota", () => {
    const mobile = readFileSync(
      new URL("../app/api/mobile/profiles/route.ts", import.meta.url),
      "utf8",
    );
    const selector = readFileSync(
      new URL("./profile-editor.ts", import.meta.url),
      "utf8",
    );
    expect(mobile).toContain(
      'archivedAt: null, lifecycle: { not: "ARCHIVED" }',
    );
    expect(selector).toContain(
      'archivedAt: null, lifecycle: { not: "ARCHIVED" }',
    );
  });

  it("keeps PRIVATE visibility independent from publication readiness and returns the new revision", () => {
    const route = readFileSync(
      new URL(
        "../app/api/profiles/[profileId]/visibility/route.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const transactionEnd = route.indexOf(
      '}, { isolationLevel: "Serializable" });',
    );
    const readinessEvaluation = route.indexOf(
      "evaluateProfileReadiness(updated)",
    );
    expect(transactionEnd).toBeGreaterThan(0);
    expect(readinessEvaluation).toBeGreaterThan(transactionEnd);
    expect(route).toContain("draftRevision: body.expectedDraftRevision! + 1");
  });

  it("repairs category defaults with an idempotent additive migration", () => {
    const migration = readFileSync(
      new URL(
        "../../../../packages/db/prisma/migrations/20260809133000_profile_category_default_templates/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain('UPDATE "ProfileCategory" AS category');
    expect(migration).toContain(
      'category."defaultTemplateId" IS DISTINCT FROM template."id"',
    );
    expect(migration).not.toContain("DELETE FROM");
    expect(migration).not.toContain("DROP TABLE");
  });

  it("checks slug conflicts against published drafts and history on the server", () => {
    const route = readFileSync(
      new URL(
        "../app/api/profiles/[profileId]/visibility/route.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(route).toContain(
      "{ slug: normalizedSlug }, { draftSlug: normalizedSlug }",
    );
    expect(route).toContain("profileSlugHistory.findUnique");
    expect(route).toContain("FEATURE_CUSTOM_SLUG_REQUIRED");
  });

  it("detects actual image bytes rather than trusting client MIME", () => {
    expect(
      detectImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    ).toBe("image/jpeg");
    expect(
      detectImageContentType(
        new TextEncoder().encode("<script>alert(1)</script>"),
      ),
    ).toBeNull();
  });

  it("uses immutable normalized children and an atomic publication pointer", () => {
    const source = readFileSync(
      new URL("./profile-publishing.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("profileRevision.create");
    expect(source).toContain("profilePublication.upsert");
    expect(source).toContain('isolationLevel: "Serializable"');
    expect(source).not.toContain("projection:");
  });

  it("snapshots PUBLIC and FRIENDS modules while keeping anonymous media and projection public-only", () => {
    const source = readFileSync(
      new URL("./profile-publishing.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      'item.enabled && (item.visibility === "PUBLIC" || item.visibility === "FRIENDS")',
    );
    expect(source).toContain(
      'snapshotModules.filter((item) => item.visibility === "PUBLIC")',
    );
    expect(source).toContain("profile.fields.filter((item) => item.isVisible)");
    expect(source).toContain(
      "profile.destinations.filter((item) => item.isActive && item.isVisible)",
    );
  });

  it("preserves old published content until the publication pointer changes", () => {
    const source = readFileSync(
      new URL("./profile-projection.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("loadPublishedRevision(profile.id)");
    expect(source).toContain("revisionToPublicProfile");
    expect(source).toContain("profile.profileKind == null && profile.isPublic");
  });

  it("keeps pause, resume, archive, stale retry and idempotency server-owned", () => {
    const source = readFileSync(
      new URL("./profile-publishing.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('throw new Error("STALE_DRAFT")');
    expect(source).toContain(
      "publishedRevision.draftFingerprint === fingerprint",
    );
    expect(source).toContain('action === "archive"');
    expect(source).toContain('action === "pause" ? "PAUSED" : "PUBLISHED"');
    expect(source).toContain("maxWait: 10_000, timeout: 30_000");
  });

  it("keeps draft media private and exposes it only through the current published revision", () => {
    const media = readFileSync(
      new URL(
        "../app/api/profiles/[profileId]/media/route.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const publishing = readFileSync(
      new URL("./profile-publishing.ts", import.meta.url),
      "utf8",
    );
    const delivery = readFileSync(
      new URL(
        "../app/api/public-profile-media/[mediaId]/route.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(media).toContain("isDraftStorageEnabled");
    expect(media).toContain("detectImageContentType");
    expect(publishing).toContain('item.visibility === "PUBLIC"');
    expect(delivery).toContain("currentFor");
    expect(delivery).toContain("readDraftObject");
  });
});
