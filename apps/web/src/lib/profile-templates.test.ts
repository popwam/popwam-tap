import { describe, expect, it } from "vitest";
import { APPROVED_PROFILE_TEMPLATES, resolveApprovedTemplate, templateCssVariables, templateEligible, templateLayoutClass } from "./profile-templates";

describe("profile template rendering", () => {
  it("changes public visual tokens and link layout", () => {
    expect(templateCssVariables({ background: "#101010", accent: "#ffcc00", radius: "2rem" })).toEqual(expect.objectContaining({ "--profile-bg": "#101010", "--profile-accent": "#ffcc00", "--profile-radius": "2rem" }));
    expect(templateLayoutClass({ linkLayout: "grid", avatarPosition:"center", desktopLayout:"wide" })).toContain("template-grid template-avatar-center");
  });

  it("rejects arbitrary CSS values from catalog JSON", () => {
    expect(templateCssVariables({ background: "url(javascript:alert(1))", radius: "expression(x)" })).toEqual({});
  });

  it("registers each of the 17 approved sources exactly once in the required families", () => {
    expect(APPROVED_PROFILE_TEMPLATES).toHaveLength(17);
    expect(new Set(APPROVED_PROFILE_TEMPLATES.map(item => item.slug)).size).toBe(17);
    expect(APPROVED_PROFILE_TEMPLATES.map(item => item.source)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(APPROVED_PROFILE_TEMPLATES.filter(item => item.family === "storefront").map(item => item.source)).toEqual([11,12,13,14,15,16,17]);
  });

  it("uses deterministic kind-safe fallbacks and prevents cross-kind selection", () => {
    expect(resolveApprovedTemplate({ slug: "store-glowup", profileKind: "PERSONAL" }).slug).toBe("personal-sunrise");
    expect(resolveApprovedTemplate({ slug: "missing", profileKind: "BUSINESS" }).slug).toBe("business-horizon");
    expect(templateEligible({ slug: "professional-noir", profileKind: "PERSONAL", planSlug: "personal" })).toBe(true);
    expect(templateEligible({ slug: "professional-noir", profileKind: "BUSINESS", planSlug: "business" })).toBe(false);
  });

  it("keeps storefront templates as showcase configuration without commerce actions", () => {
    const serialized=JSON.stringify(APPROVED_PROFILE_TEMPLATES.filter(item=>item.family==="storefront")).toLowerCase();
    expect(serialized).not.toMatch(/cart|checkout|payment|shipping|buy now|add to cart/);
  });
});
