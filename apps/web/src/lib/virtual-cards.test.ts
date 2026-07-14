import { describe, expect, it } from "vitest";
import { canCreateVirtualCard, profileTypeForVirtualCard, templateAllowed } from "./virtual-cards";

describe("virtual card plan rules", () => {
  it("allows creation up to, but not beyond, the configured count", () => {
    const plan = { maxVirtualCards: 3, allowBusinessCards: false };
    expect(canCreateVirtualCard(plan, 2, "PROFESSIONAL")).toEqual({ allowed: true });
    expect(canCreateVirtualCard(plan, 3, "PERSONAL")).toEqual({ allowed: false, reason: "VIRTUAL_CARD_LIMIT_REACHED" });
  });

  it("never permits a FREE-style entitlement to create a business card", () => {
    expect(canCreateVirtualCard({ maxVirtualCards: 1, allowBusinessCards: false }, 0, "BUSINESS"))
      .toEqual({ allowed: false, reason: "BUSINESS_CARD_PLAN_REQUIRED" });
    expect(profileTypeForVirtualCard("BUSINESS")).toBe("ORGANIZATION");
  });

  it("unlocks templates by plan rank", () => {
    expect(templateAllowed("pro", "personal")).toBe(true);
    expect(templateAllowed("free", "business")).toBe(false);
  });
});
