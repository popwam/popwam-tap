import { describe, expect, it } from "vitest";
import { revisionToPublicProfile, type DraftProfileData, type PublishedRevisionData } from "./profile-publishing";
import { changedEditorSections } from "./profile-editor";

describe("PASS 6 published revision isolation", () => {
  const profile = { id: "p", lifecycle: "PUBLISHED", access: "PUBLIC", draftRevision: 5, template: { slug: "store-lume" }, services: [{ id: "s", nameEn: "Draft item", price: "99.00" }] } as unknown as DraftProfileData;
  const revision = { id: "r", sourceDraftRevision: 4, templateSlug: "store-first", templateConfiguration: {}, profileKind: "BUSINESS", modules: [{ key: "SERVICES", enabled: true, visibility: "PUBLIC" }], destinations: [], sectionEntries: [], media: [], services: [{ sourceId: "s", itemType: "PRODUCT", nameEn: "Published item", price: null, currency: null, imageUrl: "/api/public-profile-media/m?revision=r", featured: false }] } as unknown as PublishedRevisionData;
  it("draft template and item edits cannot affect the public projection", () => {
    const published = revisionToPublicProfile(profile, revision);
    expect(published.virtualCard?.template?.slug).toBe("store-first");
    expect(published.services[0]).toMatchObject({ nameEn: "Published item", price: null, featured: false, imageUrl: "/api/public-profile-media/m?revision=r" });
    const furtherEdits = { ...profile, template: { slug: "store-techzone" }, services: [] } as unknown as DraftProfileData;
    expect(revisionToPublicProfile(furtherEdits, revision).services).toEqual(published.services);
  });
  it("a new published snapshot exposes the new template and item values", () => {
    const next = { ...revision, sourceDraftRevision: 5, templateSlug: "store-lume", services: [{ ...revision.services[0], nameEn: "Draft item", price: "99.00", featured: true }] } as unknown as PublishedRevisionData;
    const published = revisionToPublicProfile(profile, next);
    expect(published.virtualCard?.template?.slug).toBe("store-lume");
    expect(published.services[0]).toMatchObject({ nameEn: "Draft item", price: "99.00", featured: true });
    expect(changedEditorSections(profile, next)).toEqual([]);
  });
});
