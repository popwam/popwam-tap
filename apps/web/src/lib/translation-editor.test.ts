import { describe, expect, it } from "vitest";
import { filterTranslationKeys, translationCoverage } from "./translation-editor";
import type { RuntimeLocale } from "./localization-policy";

const locale = (code: string, translations: Record<string, string>): RuntimeLocale => ({ code, name: code, nativeName: code, rtl: code === "ar", enabled: true, published: true, displayOrder: 0, translations });
describe("translation key editor policy", () => {
  it("counts empty values as missing and supports arbitrary locales", () => {
    expect(translationCoverage(["auth.title", "auth.continue"], locale("de", { "auth.title": "Willkommen", "auth.continue": "" }))).toEqual({ total: 2, translated: 1, missing: 1, percentage: 50 });
  });
  it("filters by namespace, missing locale and source/translated value", () => {
    const keys=["auth.title","settings.language"];
    const locales=[locale("en",{"auth.title":"Welcome","settings.language":"Language"}),locale("tr",{"auth.title":"Hoş geldiniz"})];
    expect(filterTranslationKeys(keys,locales[0].translations,locales,{namespace:"auth"})).toEqual(["auth.title"]);
    expect(filterTranslationKeys(keys,locales[0].translations,locales,{locale:"tr",incomplete:true})).toEqual(["settings.language"]);
    expect(filterTranslationKeys(keys,locales[0].translations,locales,{query:"Hoş"})).toEqual(["auth.title"]);
  });
});
