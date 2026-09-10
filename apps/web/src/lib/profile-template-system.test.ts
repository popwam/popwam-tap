import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public profile template integration", () => {
  const publicProfile=readFileSync(new URL("../components/public-profile.tsx",import.meta.url),"utf8");
  const selection=readFileSync(new URL("../app/catalog-actions.ts",import.meta.url),"utf8");

  it("renders only visible public collections and hides empty service sections", () => {
    expect(publicProfile).toContain("profile.services.filter(x=>x.isVisible)");
    expect(publicProfile).toContain("profile.destinations.filter(x=>x.isVisible&&x.isActive");
    expect(publicProfile).toContain("profile.uploads.filter(x=>x.isVisible)");
  });

  it("does not add storefront checkout, cart, payment, or shipping behavior", () => {
    expect(publicProfile.toLowerCase()).not.toMatch(/checkout|add to cart|shipping/);
    expect(publicProfile).toContain("storefrontContactChannels(storefrontPolicy");
    expect(publicProfile).toContain("selectStorefrontItems(allVisibleServices,storefrontPolicy)");
    expect(publicProfile).toContain("profile.services.filter(x=>x.isVisible)");
  });

  it("persists selection to the profile draft and keeps the published revision explicit", () => {
    expect(selection).toContain("prisma.profile.update");
    expect(selection).toContain("templateId: template.id");
    expect(selection).toContain("previousPublicRevisionPreserved: true");
    expect(selection).toContain("PROFILE_TEMPLATE_INCOMPATIBLE");
  });
});
