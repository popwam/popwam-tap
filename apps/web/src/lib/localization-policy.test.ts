import { describe, expect, it } from "vitest";
import { ENGLISH_ONLY_LOCALIZATION, publicLocalizationBootstrap, sanitizeLocalizationConfig } from "./localization-policy";

describe("runtime localization authority", () => {
  it("falls back to English only", () => {
    expect(publicLocalizationBootstrap(ENGLISH_ONLY_LOCALIZATION).availableLocales.map(locale => locale.code)).toEqual(["en"]);
  });

  it("exposes exactly enabled and published locales", () => {
    const config = sanitizeLocalizationConfig({
      defaultLocale: "ar",
      translationVersion: 7,
      locales: [
        { code: "en", enabled: true, published: true },
        { code: "ar", enabled: true, published: true, rtl: true },
        { code: "fr", enabled: true, published: false },
      ],
    });
    expect(publicLocalizationBootstrap(config)).toMatchObject({
      defaultLocale: "ar",
      translationVersion: 7,
      availableLocales: [{ code: "en", rtl: false }, { code: "ar", rtl: true }],
    });
  });

  it("never lets a disabled bundled locale become the default", () => {
    const bootstrap = publicLocalizationBootstrap(sanitizeLocalizationConfig({
      defaultLocale: "fr",
      locales: [{ code: "fr", enabled: false, published: false }],
    }));
    expect(bootstrap.defaultLocale).toBe("en");
    expect(bootstrap.availableLocales.map(locale => locale.code)).toEqual(["en"]);
  });
});
