import { describe, expect, it } from "vitest";
import { FIGMA_TEMPLATES } from "./figma-templates";

describe("Figma template catalog", () => {
  it("ships the six source layouts with unique slugs and previews", () => {
    expect(FIGMA_TEMPLATES).toHaveLength(6);
    expect(new Set(FIGMA_TEMPLATES.map(template => template.slug)).size).toBe(6);
    expect(FIGMA_TEMPLATES.every(template => template.previewImageUrl.endsWith(".png"))).toBe(true);
  });

  it("uses materially different layout signatures", () => {
    const signatures = FIGMA_TEMPLATES.map(template => {
      const config = template.configuration;
      return [config.templateVariant, config.linkLayout, config.avatarPosition, config.coverStyle, config.contactLayout, config.desktopLayout].join("|");
    });
    expect(new Set(signatures).size).toBe(6);
  });

  it("contains personal and business designs with plan gates", () => {
    expect(FIGMA_TEMPLATES.some(template => template.category === "Personal")).toBe(true);
    expect(FIGMA_TEMPLATES.some(template => template.category === "Business")).toBe(true);
    expect(FIGMA_TEMPLATES.some(template => template.minimumPlan === "free")).toBe(true);
    expect(FIGMA_TEMPLATES.some(template => template.minimumPlan === "business")).toBe(true);
  });
});
