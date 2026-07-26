import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./dynamic-onboarding-client.tsx", import.meta.url), "utf8");

describe("Web dynamic onboarding renderer contract", () => {
  it("renders server steps through the approved registry without category-specific JSX", () => {
    expect(source).toContain("APPROVED_ONBOARDING_QUESTION_TYPES");
    expect(source).toContain("visibleQuestions(current, answers).map");
    expect(source).not.toContain('categoryKey === "restaurant"');
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });

  it("supports Back, Continue, explicit save/resume, and completion routing", () => {
    expect(source).toContain('save("BACK")');
    expect(source).toContain('save("CONTINUE")');
    expect(source).toContain('save("STAY")');
    expect(source).toContain('fetch("/api/onboarding/complete"');
    expect(source).toContain('router.push("/dashboard")');
  });

  it("starts or resumes through the server and applies locale direction", () => {
    expect(source).toContain('fetch("/api/onboarding/start"');
    expect(source).toContain('dir={locale === "ar" ? "rtl" : "ltr"}');
    expect(source).toContain("result.fields");
  });
});
