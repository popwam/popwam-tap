import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APPROVED_PROFILE_TEMPLATES } from "./profile-templates";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("PASS 5B templates 07-10 fidelity contracts", () => {
  const publicProfile = source("../components/public-profile.tsx");
  const styles = source("../app/globals.css");
  const pass5b = APPROVED_PROFILE_TEMPLATES.slice(6, 10);

  it("keeps the four approved source files on their canonical renderers", () => {
    expect(pass5b.map(({ source, slug }) => ({ source, slug }))).toEqual([
      { source: 7, slug: "business-horizon" },
      { source: 8, slug: "agency-idea-studio" },
      { source: 9, slug: "brand-bloom" },
      { source: 10, slug: "tech-link" },
    ]);
    expect(pass5b.every(item => item.configuration.sourceFile === `${item.source}.html`)).toBe(true);
  });

  it("keeps each composition independently scoped and responsive", () => {
    for (const template of pass5b) expect(styles).toContain(`[data-template="${template.slug}"]`);
    expect(styles).toContain("/* 07 — Business Horizon */");
    expect(styles).toContain("/* 08 — Agency Idea Studio */");
    expect(styles).toContain("/* 09 — Brand Bloom */");
    expect(styles).toContain("/* 10 — Tech Link */");
    expect(styles).toContain("@media (max-width:760px)");
  });

  it("renders contact and in-page discovery actions without commerce or CRM", () => {
    expect(publicProfile).toContain("businessFidelityTemplate");
    expect(publicProfile).toContain("connectContact.url");
    expect(publicProfile).toContain('href="#services"');
    expect(publicProfile).not.toMatch(/Request Quote|Request Demo|Add to Cart|Checkout|CRM/i);
  });

  it("does not introduce fake source metrics and preserves empty sections", () => {
    expect(`${publicProfile}\n${styles}`).not.toMatch(/500\+|200\+|100\+|98%/);
    expect(publicProfile).toContain("visibleServices.length>0");
    expect(publicProfile).toContain("!!media.length");
    expect(publicProfile).toContain("!!socials.length");
    expect(publicProfile).toContain("!!contacts.length");
  });

  it("preserves safe published-data, URL, and direction boundaries", () => {
    expect(publicProfile).toContain("isSafeDestinationUrl");
    expect(publicProfile).toContain('dir={ar?"rtl":"ltr"}');
    expect(styles).toContain('[lang="ar"] [data-template="tech-link"]');
    for (const route of ["../app/p/[slug]/page.tsx", "../app/p/id/[profileId]/page.tsx"]) {
      const routeSource = source(route);
      expect(routeSource).not.toContain("template-preview-fixture");
      expect(routeSource).not.toContain("adminPreviewContext");
    }
  });
});
