import { describe, expect, it } from "vitest";
import { activeOnboardingPlatforms, mergeOnboardingData, nextOnboardingStep } from "./onboarding";

describe("resumable onboarding", () => {
  it("preserves previous answers while advancing one step", () => {
    expect(mergeOnboardingData({ displayName: "Mina" }, { website: "https://example.test" })).toEqual({ displayName: "Mina", website: "https://example.test" });
    expect(nextOnboardingStep(3)).toBe(4);
  });

  it("never advances past the final step", () => expect(nextOnboardingStep(6)).toBe(6));

  it("shows an admin-created active platform in configured order", () => {
    const result = activeOnboardingPlatforms([{ slug: "website", isActive: true, sortOrder: 20 }, { slug: "anghami", isActive: true, sortOrder: 10 }, { slug: "disabled", isActive: false, sortOrder: 1 }]);
    expect(result.map(platform => platform.slug)).toEqual(["anghami", "website"]);
  });
});
