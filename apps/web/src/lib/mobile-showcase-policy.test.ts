import { describe, expect, it } from "vitest";
import { templateSelectionError, showcaseWriteError, showcasePrice, showcaseCurrency, showcaseImage, safeTemplateThumbnail, type ShowcaseEntitlements } from "./mobile-showcase-policy";
import { APPROVED_PROFILE_TEMPLATES } from "./profile-templates";

const policy: ShowcaseEntitlements = { storefrontEnabled: true, storefrontProductsEnabled: true, storefrontServicesEnabled: true, storefrontMaxItems: null, storefrontWhatsappOrder: true, storefrontEmailOrder: true };
describe("PASS 6 shared template and showcase validation", () => {
  it("exposes only safe image references in the mobile catalogue", () => {
    expect(safeTemplateThumbnail("/templates/image.png")).toBe("/templates/image.png");
    expect(safeTemplateThumbnail("https://images.example.com/image.png")).toBe("https://images.example.com/image.png");
    for (const value of [null, "file:///private", "content://private", "javascript:alert(1)", "//evil.example/image", "/templates/../../private", "https://user:secret@example.com/image"]) expect(safeTemplateThumbnail(value)).toBeNull();
  });
  it("accepts the 17 registry templates only for their account kind and eligible plan", () => {
    for (const approved of APPROVED_PROFILE_TEMPLATES) {
      const template = { ...approved, isActive: true };
      expect(templateSelectionError(template, approved.profileKind, "business", { allowThemes: true, storefrontEnabled: true })).toBeNull();
      expect(templateSelectionError(template, approved.profileKind === "PERSONAL" ? "BUSINESS" : "PERSONAL", "business", { allowThemes: true, storefrontEnabled: true })).toBe("PROFILE_TEMPLATE_INCOMPATIBLE");
      expect(templateSelectionError({ ...template, isActive: false }, approved.profileKind, "business", { allowThemes: true, storefrontEnabled: true })).toBe("PROFILE_TEMPLATE_INCOMPATIBLE");
    }
  });
  it("enforces plan rank, theme entitlement, and storefront entitlement", () => {
    const template = { ...APPROVED_PROFILE_TEMPLATES[10], isActive: true };
    expect(templateSelectionError(template, "BUSINESS", "free", { allowThemes: true, storefrontEnabled: true })).toBe("PROFILE_TEMPLATE_PLAN_REQUIRED");
    expect(templateSelectionError(template, "BUSINESS", "business", { allowThemes: false, storefrontEnabled: true })).toBe("PROFILE_TEMPLATE_PLAN_REQUIRED");
    expect(templateSelectionError(template, "BUSINESS", "business", { allowThemes: true, storefrontEnabled: false })).toBe("TEMPLATE_STOREFRONT_REQUIRED");
  });
  it.each(["PRODUCT", "SERVICE"])("validates %s and nullable limits", type => {
    expect(showcaseWriteError(policy, "BUSINESS", type, 999, true)).toBeNull();
    expect(showcaseWriteError({ ...policy, storefrontMaxItems: 0 }, "BUSINESS", type, 0, true)).toBe("STOREFRONT_LIMIT_REACHED");
    expect(showcaseWriteError({ ...policy, storefrontMaxItems: 3 }, "BUSINESS", type, 3, true)).toBe("STOREFRONT_LIMIT_REACHED");
    expect(showcaseWriteError({ ...policy, storefrontMaxItems: 3 }, "BUSINESS", type, 3, false)).toBeNull();
    expect(showcaseWriteError({ ...policy, storefrontEnabled: false }, "BUSINESS", type, 0, true)).toBe("STOREFRONT_PLAN_REQUIRED");
    expect(showcaseWriteError(policy, "PERSONAL", type, 0, true)).toBe("PROFILE_TYPE_NOT_AVAILABLE");
  });
  it("handles product-only, service-only and neither", () => {
    expect(showcaseWriteError({ ...policy, storefrontServicesEnabled: false }, "BUSINESS", "SERVICE", 0, true)).toBe("STOREFRONT_PLAN_REQUIRED");
    expect(showcaseWriteError({ ...policy, storefrontProductsEnabled: false }, "BUSINESS", "PRODUCT", 0, true)).toBe("STOREFRONT_PLAN_REQUIRED");
    for (const type of ["PRODUCT", "SERVICE"]) expect(showcaseWriteError({ ...policy, storefrontProductsEnabled: false, storefrontServicesEnabled: false }, "BUSINESS", type, 0, true)).toBe("STOREFRONT_PLAN_REQUIRED");
    expect(showcaseWriteError(policy, "BUSINESS", "STOCK", 0, true)).toBe("SHOWCASE_TYPE_INVALID");
  });
  it("preserves absent versus explicit zero price and rejects precision, negative, overflow and exponent notation", () => {
    expect(showcasePrice(null)).toBeNull(); expect(showcasePrice("")).toBeNull();
    expect(showcasePrice("0")).toBe("0"); expect(showcasePrice("120.50")).toBe("120.50");
    for (const price of ["-1", "1.234", "1e3", "NaN", "1000000000000"]) expect(() => showcasePrice(price)).toThrow("SHOWCASE_PRICE_INVALID");
    expect(showcaseCurrency("egp")).toBe("EGP"); expect(showcaseCurrency(null)).toBeNull();
    expect(() => showcaseCurrency("US")).toThrow("SHOWCASE_CURRENCY_INVALID");
  });
  it("allows private owner media references or safe HTTPS images", () => {
    expect(showcaseImage("/api/profiles/p1/media/m1")).toBe("/api/profiles/p1/media/m1");
    expect(showcaseImage("https://images.example.com/photo.jpg")).toContain("https:");
    for (const value of ["javascript:alert(1)", "file:///photo", "http://example.com/a", "https://u:p@example.com/x", "/api/profiles/p1/media/../../secret"]) expect(() => showcaseImage(value)).toThrow("SHOWCASE_IMAGE_INVALID");
  });
});
