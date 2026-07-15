import { describe, expect, it } from "vitest";
import { templateCssVariables, templateLayoutClass } from "./profile-templates";

describe("profile template rendering", () => {
  it("changes public visual tokens and link layout", () => {
    expect(templateCssVariables({ background: "#101010", accent: "#ffcc00", radius: "2rem" })).toEqual(expect.objectContaining({ "--profile-bg": "#101010", "--profile-accent": "#ffcc00", "--profile-radius": "2rem" }));
    expect(templateLayoutClass({ linkLayout: "grid", avatarPosition:"center", desktopLayout:"wide" })).toContain("template-grid template-avatar-center");
  });

  it("rejects arbitrary CSS values from catalog JSON", () => {
    expect(templateCssVariables({ background: "url(javascript:alert(1))", radius: "expression(x)" })).toEqual({});
  });
});
