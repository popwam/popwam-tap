import { describe, expect, it } from "vitest";
import { ENGLISH_ONLY_LOCALIZATION, publicLocalizationBootstrap, publicLocalizationPack, sanitizeLocalizationConfig } from "./localization-policy";

describe("runtime localization authority", () => {
  it("keeps English as a non-selectable local fallback when no language is configured", () => {
    expect(publicLocalizationBootstrap(ENGLISH_ONLY_LOCALIZATION).availableLocales).toEqual([]);
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
      availableLocales: [
        { code: "en", rtl: false, revision: 7 },
        { code: "ar", rtl: true, revision: 7 },
      ],
    });
    expect(publicLocalizationBootstrap(config).availableLocales[0]).not.toHaveProperty("translations");
    expect(publicLocalizationPack(config, "ar")).toEqual({ code: "ar", revision: 7, translations: {} });
  });

  it("never lets a disabled bundled locale become the default", () => {
    const bootstrap = publicLocalizationBootstrap(sanitizeLocalizationConfig({
      defaultLocale: "fr",
      locales: [{ code: "fr", enabled: false, published: false }],
    }));
    expect(bootstrap.defaultLocale).toBe("en");
    expect(bootstrap.availableLocales).toEqual([]);
  });
});
