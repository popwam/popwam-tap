import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mobileProfileOwnerDto } from "./mobile-profile-dto";

describe("profile privacy and immutable sharing contract", () => {
  it("returns an explicit owner DTO without ORM ownership or storage internals", () => {
    const dto = mobileProfileOwnerDto({
      id: "profile", userId: "owner-secret", slug: "pop", type: "PERSONAL", primaryLanguage: "en", displayName: "POP",
      displayNameAr: null, displayNameEn: "POP", firstName: "P", lastName: "O", jobTitleAr: null, jobTitleEn: null,
      company: null, bioAr: null, bioEn: null, organizationNameAr: null, organizationNameEn: null, industryAr: null, industryEn: null,
      descriptionAr: null, descriptionEn: null, avatarUrl: null, logoUrl: null, coverUrl: null, phone: null, alternatePhone: null,
      whatsappBusiness: null, email: null, website: null, locationText: null, addressAr: null, addressEn: null, theme: "CLASSIC_DARK",
      destinations: [], uploads: [{ id: "file", storageKey: "private/key", uploaderUserId: "owner-secret", originalFilename: "a.pdf", displayTitleAr: null, displayTitleEn: null, publicUrl: "https://cdn.example/a.pdf", mimeType: "application/pdf", sizeBytes: 10n, isVisible: true }],
      virtualCard: null,
    } as never);
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("owner-secret");
    expect(serialized).not.toContain("storageKey");
    expect(dto.uploads[0].sizeBytes).toBe("10");
  });

  it("gates current PRIVATE state and public media immediately", () => {
    const projection = readFileSync(new URL("./profile-projection.ts", import.meta.url), "utf8");
    const visibility = readFileSync(new URL("../app/api/profiles/[profileId]/visibility/route.ts", import.meta.url), "utf8");
    const media = readFileSync(new URL("../app/api/public-profile-media/[mediaId]/route.ts", import.meta.url), "utf8");
    expect(projection).toContain('profile.access === "PRIVATE"');
    expect(visibility).toContain('isPublic: body.access !== "PRIVATE"');
    expect(media).toContain('access: { not: "PRIVATE" }');
  });

  it("resolves public share URLs from immutable revision data, never live draft URLs", () => {
    const share = readFileSync(new URL("./share-center.ts", import.meta.url), "utf8");
    const route = readFileSync(new URL("../app/s/[key]/route.ts", import.meta.url), "utf8");
    const product = readFileSync(new URL("../components/public-tag-page.tsx", import.meta.url), "utf8");
    expect(share).toContain("publishedShareDestination");
    expect(route).toContain("redirect(published.url)");
    expect(route).not.toContain("destination.url");
    expect(product).toContain("redirect(published.url)");
  });

  it("does not copy the private account email into a new profile", () => {
    const mobile = readFileSync(new URL("../app/api/mobile/profiles/route.ts", import.meta.url), "utf8");
    expect(mobile).not.toContain("|| user.email");
    expect(mobile).toContain("mobileProfileOwnerDto");
    expect(mobile).toContain('normalizeAndValidate("WEBSITE"');
  });

  it("keeps legacy PATCH fields unchanged when they are omitted", () => {
    const patch = readFileSync(new URL("../app/api/mobile/profiles/[id]/route.ts", import.meta.url), "utf8");
    expect(patch).toContain('has(body, "phone") ? phoneValue(body.phone, countryIso2) : profile.phone');
    expect(patch).toContain('has(body, "email") ? emailValue(body.email) : profile.email');
    expect(patch).toContain('has(body, "primaryLanguage") ? String(body.primaryLanguage) : profile.primaryLanguage');
    expect(patch).toContain('patched(body, "firstName", profile.firstName, 80)');
  });
});
