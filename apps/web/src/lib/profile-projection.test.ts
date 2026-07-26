import { describe, expect, it } from "vitest";
import { isPublicProfileReadable } from "./profile-authorization";
import { buildPublicProfileProjection, moduleUsesCanonicalPublicState } from "./profile-projection";

describe("public profile projection compatibility", () => {
  it("uses canonical module visibility when it exists and legacy fallback when absent", () => {
    const canonical = {
      isPublic: true,
      profileKind: "PERSONAL",
      lifecycle: "PUBLISHED",
      modules: [{ enabled: true, visibility: "PUBLIC", moduleDefinition: { key: "CONTACT" } }, { enabled: true, visibility: "ONLY_ME", moduleDefinition: { key: "SOCIAL" } }],
    } as never;
    expect(moduleUsesCanonicalPublicState(canonical, "CONTACT", false)).toBe(true);
    expect(moduleUsesCanonicalPublicState(canonical, "SOCIAL", true)).toBe(false);
    expect(moduleUsesCanonicalPublicState(canonical, "LINKS", true)).toBe(true);
    expect(buildPublicProfileProjection(canonical).publicModuleKeys).toEqual(["CONTACT"]);
  });

  it("keeps legacy public profiles readable while requiring publication for canonical profiles", () => {
    expect(isPublicProfileReadable({ isPublic: true, profileKind: null, lifecycle: "DRAFT" })).toBe(true);
    expect(isPublicProfileReadable({ isPublic: true, profileKind: "PERSONAL", lifecycle: "DRAFT" })).toBe(false);
    expect(isPublicProfileReadable({ isPublic: true, profileKind: "PERSONAL", lifecycle: "PUBLISHED" })).toBe(true);
  });
});
