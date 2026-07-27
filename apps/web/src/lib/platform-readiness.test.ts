import { describe, expect, it } from "vitest";
import { derivePlatformReadiness } from "./platform-readiness-policy";

describe("platform readiness", () => {
  it("is ready only when default, countries and every published locale legal requirement are valid", () => {
    expect(derivePlatformReadiness({ defaultValid: true, enabledCountries: 1, localeLegal: [{ code: "en", ready: true }], translationWarnings: 0 }).ready).toBe(true);
  });
  it("reports legal and country blockers but translation fallback as a warning", () => {
    const result = derivePlatformReadiness({ defaultValid: false, enabledCountries: 0, localeLegal: [{ code: "ar", ready: false }], translationWarnings: 2 });
    expect(result.ready).toBe(false); expect(result.issues.filter(issue => issue.level === "BLOCKER")).toHaveLength(3); expect(result.issues.some(issue => issue.level === "WARNING")).toBe(true);
  });
});
