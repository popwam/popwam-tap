import { describe, expect, it } from "vitest";
import { authoritativeCountryCatalog, countryFlag, isCatalogCountry } from "./country-catalog";

describe("country catalogue", () => {
  it("uses the package catalogue without a hardcoded total", () => { const rows = authoritativeCountryCatalog(); expect(rows.length).toBeGreaterThan(200); expect(rows.find(item => item.iso2 === "EG")?.dialCode).toBe("+20"); });
  it("validates ISO-2 and derives flags", () => { expect(isCatalogCountry("FR")).toBe(true); expect(isCatalogCountry("ZZ")).toBe(false); expect(countryFlag("AE")).toBe("🇦🇪"); });
});
