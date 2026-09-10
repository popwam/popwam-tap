import { describe, expect, it } from "vitest";
import {
  legalCountryScope,
  resolveLegalCandidate,
  resolveLocalizedLegalCandidate,
} from "./legal-country-policy";

const candidate = (mode: string, countries: string[], days = 0) => ({
  locale: "en",
  countryTargetMode: mode,
  countries: countries.map((countryIso2) => ({ countryIso2 })),
  effectiveAt: new Date(2026, 0, 1 + days),
  publishedAt: new Date(2026, 0, 1 + days),
});

describe("legal country targeting", () => {
  it("normalizes a deterministic selected-country scope", () =>
    expect(legalCountryScope("SELECTED", ["eg", "AE", "EG"])).toEqual({
      mode: "SELECTED",
      countries: ["AE", "EG"],
      scopeKey: "SELECTED:AE,EG",
    }));
  it("prefers an exact single-country override over multi-country and global", () =>
    expect(
      resolveLegalCandidate(
        [
          candidate("GLOBAL", []),
          candidate("SELECTED", ["EG", "AE"], 2),
          candidate("SELECTED", ["EG"], 1),
        ],
        "eg",
      )?.countries,
    ).toEqual([{ countryIso2: "EG" }]));
  it("falls back to all-supported then global", () =>
    expect(
      resolveLegalCandidate(
        [candidate("GLOBAL", []), candidate("ALL_SUPPORTED", [])],
        "FR",
      )?.countryTargetMode,
    ).toBe("ALL_SUPPORTED"));
  it("does not apply country-targeted documents without a country", () =>
    expect(
      resolveLegalCandidate(
        [candidate("SELECTED", ["EG"]), candidate("GLOBAL", [])],
        null,
      )?.countryTargetMode,
    ).toBe("GLOBAL"));
  it("uses a country locale fallback before the requested-locale global", () => {
    const globalAr = { ...candidate("GLOBAL", []), locale: "ar" };
    const egyptEn = { ...candidate("SELECTED", ["EG"]), locale: "en" };
    expect(
      resolveLocalizedLegalCandidate([globalAr, egyptEn], "ar", "en", "EG"),
    ).toBe(egyptEn);
  });
});
