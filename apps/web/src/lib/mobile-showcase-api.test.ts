import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), entitlements: vi.fn(), owned: vi.fn(), projection: vi.fn(),
  templateFind: vi.fn(), catalogFind: vi.fn(), transaction: vi.fn(),
}));
vi.mock("./mobile-auth", () => ({ getMobileUser: mocks.user, mobileUnauthorized: () => Response.json({ ok: false }, { status: 401 }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ unauthorized: () => { throw new Error("HTTP_401"); }, notFound: () => { throw new Error("HTTP_404"); } }));
vi.mock("@/components/public-profile", () => ({ PublicProfile: () => null }));
vi.mock("./plans", () => ({ getUserEntitlements: mocks.entitlements, assertWithinLimitLocked: vi.fn() }));
vi.mock("./profile-publishing", async importOriginal => ({ ...await importOriginal<typeof import("./profile-publishing")>(), getOwnedDraft: mocks.owned, legacyDraftToPublicProfile: mocks.projection }));
vi.mock("@popwam/db", async importOriginal => ({ ...await importOriginal<typeof import("@popwam/db")>(), prisma: {
  profileTemplate: { findUnique: mocks.templateFind, findMany: mocks.catalogFind }, $transaction: mocks.transaction,
} }));

import { GET as catalog } from "../app/api/mobile/templates/route";
import { mobileDraftPreview } from "./mobile-draft-preview";
import { mutateProfileEditor } from "./profile-editor";
import MobileDraftPreviewPage from "../app/mobile-preview/[profileId]/page";

const effective = { allowThemes: true, storefrontEnabled: true, storefrontProductsEnabled: true, storefrontServicesEnabled: true, storefrontMaxItems: null, storefrontWhatsappOrder: true, storefrontEmailOrder: true };
const template = { id: "t", slug: "store-first", nameAr: "First", nameEn: "First", profileKind: "BUSINESS", minimumPlan: "business", isActive: true, moduleRules: [], configuration: {} };
function draft() { return { id: "p", userId: "owner", profileKind: "BUSINESS", type: "ORGANIZATION", lifecycle: "PUBLISHED", draftRevision: 4, services: [] as Array<Record<string, unknown>>, mediaAssets: [], modules: [], sectionEntries: [], template, organization: null, virtualCard: { template }, categoryId: null }; }
function transaction(profile = draft()) {
  const tx = {
    $queryRaw: vi.fn(), profile: { findFirst: vi.fn().mockResolvedValueOnce(profile).mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(profile), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    profileTemplate: { findFirst: vi.fn().mockResolvedValue(template) }, virtualCard: { updateMany: vi.fn() }, auditLog: { create: vi.fn() },
    profileService: { create: vi.fn().mockResolvedValue({ id: "new" }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }), count: vi.fn().mockResolvedValue(profile.services.length), findMany: vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]), update: vi.fn() },
  };
  mocks.transaction.mockImplementation(async fn => fn(tx));
  return tx;
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "owner" }); mocks.entitlements.mockResolvedValue({ plan: { slug: "business" }, effective });
  mocks.templateFind.mockResolvedValue(template); mocks.catalogFind.mockResolvedValue([template]); mocks.owned.mockResolvedValue(draft()); mocks.projection.mockReturnValue({});
});
describe("PASS 6 mobile catalogue and owner preview", () => {
  it("executes anonymous preview authorization before reading any draft", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(MobileDraftPreviewPage({ params: Promise.resolve({ profileId: "p" }), searchParams: Promise.resolve({ templateId: "t" }) })).rejects.toThrow("HTTP_401");
    expect(mocks.owned).not.toHaveBeenCalled();
  });
  it("rejects anonymous catalog access before reading metadata", async () => {
    mocks.user.mockResolvedValue(null); expect((await catalog(new Request("https://pop.popwam.com/api/mobile/templates"))).status).toBe(401); expect(mocks.catalogFind).not.toHaveBeenCalled();
  });
  it("returns safe metadata without implementation configuration", async () => {
    const result = await catalog(new Request("https://pop.popwam.com/api/mobile/templates"));
    const body = await result.json();
    // DB select is an allowlist, and the wire DTO must not trust unexpected DB fields.
    expect(mocks.catalogFind.mock.calls[0][0].select.configuration).toBeUndefined();
    expect(body.templates[0].family).toBe("storefront"); expect(body.templates[0].allowed).toBe(true);
    expect(body.templates[0]).not.toHaveProperty("configuration");
  });
  it("denies another owner and missing drafts", async () => {
    mocks.owned.mockResolvedValue({ ...draft(), userId: "someone-else" });
    await expect(mobileDraftPreview("owner", "p", "t")).rejects.toThrow("PROFILE_NOT_FOUND");
    expect(mocks.templateFind).not.toHaveBeenCalled();
    mocks.owned.mockResolvedValue(null); await expect(mobileDraftPreview("owner", "p", "t")).rejects.toThrow("PROFILE_NOT_FOUND");
  });
  it("validates preview template type and plan without a transaction or publication write", async () => {
    const preview = await mobileDraftPreview("owner", "p", "t"); expect(preview.draftRevision).toBe(4);
    expect(mocks.transaction).not.toHaveBeenCalled();
    mocks.templateFind.mockResolvedValue({ ...template, slug: "personal-sunrise", profileKind: "PERSONAL" });
    await expect(mobileDraftPreview("owner", "p", "t")).rejects.toThrow("PROFILE_TEMPLATE_INCOMPATIBLE");
    mocks.templateFind.mockResolvedValue(template); mocks.entitlements.mockResolvedValue({ plan: { slug: "free" }, effective });
    await expect(mobileDraftPreview("owner", "p", "t")).rejects.toThrow("PROFILE_TEMPLATE_PLAN_REQUIRED");
  });
  it("preview page rejects anonymous requests and has noindex/no-store headers", () => {
    const page = readFileSync(new URL("../app/mobile-preview/[profileId]/page.tsx", import.meta.url), "utf8");
    const config = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
    expect(page).toContain("if (!user) unauthorized()"); expect(page).not.toContain("template-preview-fixture");
    expect(config).toContain('source: "/mobile-preview/:path*"'); expect(config).toContain("noindex, nofollow, noarchive");
  });
});
describe("PASS 6 actual editor transactions", () => {
  it("selects template into a new draft revision and mirrors the card", async () => {
    const tx = transaction(); const result = await mutateProfileEditor("owner", "p", 4, { type: "TEMPLATE_SELECT", templateId: "t" });
    expect(result.draftRevision).toBe(5); expect(tx.profile.update).toHaveBeenCalledWith({ where: { id: "p" }, data: { templateId: "t" } });
    expect(tx.virtualCard.updateMany).toHaveBeenCalledWith({ where: { profileId: "p" }, data: { themeId: "t" } });
    expect(tx.profile.updateMany).toHaveBeenCalledWith({ where: { id: "p", draftRevision: 4 }, data: { draftRevision: { increment: 1 } } });
  });
  it("enforces owner, stale revision, type, and Plan on the mutation path", async () => {
    transaction({ ...draft(), userId: "other" }); await expect(mutateProfileEditor("owner", "p", 4, { type: "TEMPLATE_SELECT", templateId: "t" })).rejects.toThrow("PROFILE_NOT_FOUND");
    transaction(); await expect(mutateProfileEditor("owner", "p", 3, { type: "TEMPLATE_SELECT", templateId: "t" })).rejects.toThrow("STALE_DRAFT");
    const tx = transaction(); tx.profileTemplate.findFirst.mockResolvedValue({ ...template, slug: "personal-sunrise" });
    await expect(mutateProfileEditor("owner", "p", 4, { type: "TEMPLATE_SELECT", templateId: "t" })).rejects.toThrow("PROFILE_TEMPLATE_INCOMPATIBLE");
    transaction(); mocks.entitlements.mockResolvedValue({ plan: { slug: "business" }, effective: { ...effective, allowThemes: false } });
    await expect(mutateProfileEditor("owner", "p", 4, { type: "TEMPLATE_SELECT", templateId: "t" })).rejects.toThrow("PROFILE_TEMPLATE_PLAN_REQUIRED");
  });
  it("creates optional-price PRODUCT and SERVICE in the existing collection", async () => {
    for (const itemType of ["PRODUCT", "SERVICE"]) {
      const tx = transaction(); await mutateProfileEditor("owner", "p", 4, { type: "SERVICE_UPSERT", nameEn: "Item", itemType, price: null, featured: true, visibility: "ONLY_ME" });
      expect(tx.profileService.create.mock.calls[0][0].data).toMatchObject({ profileId: "p", itemType, price: null, featured: true, isVisible: false });
    }
  });
  it("rejects limits, disabled item types, foreign item IDs, private foreign media and invalid visibility", async () => {
    const action = { type: "SERVICE_UPSERT" as const, nameEn: "Item", itemType: "PRODUCT", visibility: "PUBLIC" };
    transaction(); mocks.entitlements.mockResolvedValue({ plan: { slug: "business" }, effective: { ...effective, storefrontMaxItems: 0 } });
    await expect(mutateProfileEditor("owner", "p", 4, action)).rejects.toThrow("STOREFRONT_LIMIT_REACHED");
    transaction(); mocks.entitlements.mockResolvedValue({ plan: { slug: "business" }, effective: { ...effective, storefrontProductsEnabled: false } });
    await expect(mutateProfileEditor("owner", "p", 4, action)).rejects.toThrow("STOREFRONT_PLAN_REQUIRED");
    mocks.entitlements.mockResolvedValue({ plan: { slug: "business" }, effective });
    transaction(); await expect(mutateProfileEditor("owner", "p", 4, { ...action, id: "foreign" })).rejects.toThrow("ITEM_NOT_FOUND");
    transaction(); await expect(mutateProfileEditor("owner", "p", 4, { ...action, imageUrl: "/api/profiles/other/media/image" })).rejects.toThrow("SHOWCASE_IMAGE_INVALID");
    transaction(); await expect(mutateProfileEditor("owner", "p", 4, { ...action, visibility: "FRIENDS" })).rejects.toThrow("VISIBILITY_INVALID");
  });
  it("deletes only within the owned profile and reorders scoped IDs", async () => {
    const tx = transaction(); await mutateProfileEditor("owner", "p", 4, { type: "SERVICE_DELETE", id: "a" });
    expect(tx.profileService.deleteMany).toHaveBeenCalledWith({ where: { id: "a", profileId: "p" } });
    transaction({ ...draft(), services: [{ id: "a" }, { id: "b" }] }); await mutateProfileEditor("owner", "p", 4, { type: "SERVICE_REORDER", ids: ["b", "a"] });
  });
});
