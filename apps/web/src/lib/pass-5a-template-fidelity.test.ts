import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APPROVED_PROFILE_TEMPLATES } from "./profile-templates";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("PASS 5A templates 01-06 fidelity contracts", () => {
  const publicProfile = source("../components/public-profile.tsx");
  const styles = source("../app/globals.css");
  const pass5a = APPROVED_PROFILE_TEMPLATES.slice(0, 6);

  it("resolves the six approved source files without changing their canonical slugs", () => {
    expect(pass5a.map(({ source, slug }) => ({ source, slug }))).toEqual([
      { source: 1, slug: "personal-sunrise" },
      { source: 2, slug: "professional-noir" },
      { source: 3, slug: "professional-editorial" },
      { source: 4, slug: "personal-rose-paper" },
      { source: 5, slug: "personal-lavender" },
      { source: 6, slug: "personal-botanical" },
    ]);
    expect(pass5a.every(item => item.configuration.sourceFile === `${item.source}.html`)).toBe(true);
  });

  it("keeps each corrected visual variant scoped to its own data-template selector", () => {
    for (const template of pass5a) {
      expect(styles).toContain(`[data-template="${template.slug}"]`);
    }
  });

  it("preserves empty-section hiding and makes the CV action conditional", () => {
    for (const condition of ["!!contacts.length", "!!socials.length", "!!destinations.length", "!!fields.length", "!!media.length", "!!files.length"]) {
      expect(publicProfile).toContain(condition);
    }
    expect(publicProfile).toContain("cvFile&&<a");
    expect(publicProfile).not.toContain("fixture.pdf");
  });

  it("preserves safe URL filtering for actions, fields, links, media and the CV", () => {
    expect(publicProfile).toContain("isSafeDestinationUrl");
    expect(publicProfile).toContain("const cvFile=files[0]");
    expect(publicProfile).toContain("profile.media.filter(x=>x.visibility===\"PUBLIC\"&&isSafeDestinationUrl(x.publicUrl))");
    expect(publicProfile).toContain("rel=\"noreferrer\"");
  });

  it("sets deterministic RTL/LTR semantics only for Admin preview while public data remains canonical", () => {
    expect(publicProfile).toContain('dir={ar?"rtl":"ltr"}');
    expect(publicProfile).toContain("adminPreviewContext?");
    for (const route of ["../app/p/[slug]/page.tsx", "../app/p/id/[profileId]/page.tsx"]) {
      const routeSource = source(route);
      expect(routeSource).not.toContain("template-preview-fixture");
      expect(routeSource).not.toContain("adminPreviewContext");
    }
  });
});
