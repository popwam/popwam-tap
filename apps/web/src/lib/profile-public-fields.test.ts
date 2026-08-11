import { describe, expect, it } from "vitest";
import { publicProfileFieldRows } from "./profile-public-fields";

describe("public structured profile fields", () => {
  it("renders validated localized category fields without dumping raw JSON", () => {
    const rows = publicProfileFieldRows({
      kind: "BUSINESS",
      categoryKey: "restaurant",
      locale: "en",
      entries: [
        { id: "cuisine", moduleKey: "ABOUT", fieldKey: "cuisine", value: "Levantine" },
        { id: "menu", moduleKey: "CATALOG", fieldKey: "menu_url", value: "menu.example/path" },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ id: "cuisine", label: "Cuisine", primary: "Levantine", href: null }),
      expect.objectContaining({ id: "menu", label: "Menu URL", primary: "https://menu.example/path", href: "https://menu.example/path", direction: "ltr" }),
    ]);
  });

  it("fails closed for unknown, private/trust, malformed, and mismatched-module fields", () => {
    expect(publicProfileFieldRows({
      kind: "BUSINESS",
      categoryKey: "clinic",
      locale: "en",
      entries: [
        { id: "evidence", moduleKey: "ABOUT", fieldKey: "medicalRegistration", value: "secret" },
        { id: "bad", moduleKey: "LINKS", fieldKey: "booking_url", value: "javascript:alert(1)" },
        { id: "wrong-module", moduleKey: "ABOUT", fieldKey: "city", value: "Chisinau" },
        { id: "specialty", moduleKey: "ABOUT", fieldKey: "specialty", value: "Cardiology" },
      ],
    })).toEqual([expect.objectContaining({ id: "specialty", primary: "Cardiology" })]);
  });
});
