import { describe, expect, it } from "vitest";
import { selectPrimaryProfileCandidate, summarizeProfileModuleBackfill } from "./profile-backfill";

describe("Phase B dry-run planning", () => {
  it("reports profile module mappings without exposing legacy values", () => {
    const summary = summarizeProfileModuleBackfill({ profileId: "profile-1", hasDisplayName: true, hasAbout: false, contactCount: 2, directSocialCount: 1, socialDestinationCount: 1, linkCount: 3, uploadCount: 0, serviceCount: 1, branchCount: 0, unsupportedFieldCount: 2 });
    expect(summary.mapped).toEqual(expect.arrayContaining(["IDENTITY", "CONTACT", "SOCIAL", "LINKS", "SERVICES"]));
    expect(summary.missing).toEqual(expect.arrayContaining(["ABOUT", "GALLERY", "BRANCHES"]));
    expect(summary.duplicate).toContain("SOCIAL");
    expect(JSON.stringify(summary)).not.toContain("phone");
  });

  it("marks conflicting primary evidence ambiguous rather than choosing silently", () => {
    const candidate = selectPrimaryProfileCandidate({ userId: "user-1", profiles: [
      { id: "profile-1", isPrimary: false, createdAt: new Date("2026-01-01"), virtualCardIds: ["card-1"], defaultVirtualCard: true },
      { id: "profile-2", isPrimary: true, createdAt: new Date("2026-02-01"), virtualCardIds: ["card-2"], defaultVirtualCard: false },
    ], defaultSharingCardId: "card-1" });
    expect(candidate.status).toBe("AMBIGUOUS");
  });
});
