export const LOCALIZATION_SETTING_KEY = "localization.runtime";
export const SOURCE_LOCALE = "en";

export type RuntimeLocale = {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  enabled: boolean;
  published: boolean;
  displayOrder: number;
  translations: Record<string, string>;
};

export type RuntimeLocalizationConfig = {
  defaultLocale: string;
  translationVersion: number;
  locales: RuntimeLocale[];
};

export const ENGLISH_ONLY_LOCALIZATION: RuntimeLocalizationConfig = {
  defaultLocale: SOURCE_LOCALE,
  translationVersion: 1,
  locales: [{
    code: SOURCE_LOCALE,
    name: "English",
    nativeName: "English",
    rtl: false,
    enabled: true,
    published: true,
    displayOrder: 0,
    translations: {},
  }],
};

const KNOWN_LOCALE_METADATA: Record<string, Pick<RuntimeLocale, "name" | "nativeName" | "rtl">> = {
  en: { name: "English", nativeName: "English", rtl: false },
  ar: { name: "Arabic", nativeName: "العربية", rtl: true },
  fr: { name: "French", nativeName: "Français", rtl: false },
};

function cleanTranslations(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([key, copy]) => [key.slice(0, 160), copy.slice(0, 10_000)]));
}

export function sanitizeLocalizationConfig(value: unknown): RuntimeLocalizationConfig {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rawLocales = Array.isArray(raw.locales) ? raw.locales : [];
  const locales = rawLocales.flatMap(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const locale = item as Record<string, unknown>;
    const code = String(locale.code || "").trim().toLowerCase();
    if (!/^[a-z]{2}(?:-[a-z0-9]{2,8})?$/.test(code)) return [];
    const metadata = KNOWN_LOCALE_METADATA[code] || {
      name: code.toUpperCase(),
      nativeName: code.toUpperCase(),
      rtl: false,
    };
    return [{
      code,
      name: String(locale.name || metadata.name).slice(0, 80),
      nativeName: String(locale.nativeName || metadata.nativeName).slice(0, 80),
      rtl: locale.rtl === true || metadata.rtl,
      enabled: locale.enabled === true,
      published: locale.published === true,
      displayOrder: Number.isSafeInteger(locale.displayOrder) ? Number(locale.displayOrder) : 999,
      translations: cleanTranslations(locale.translations),
    }];
  });
  const unique = new Map(locales.map(locale => [locale.code, locale]));
  unique.set(SOURCE_LOCALE, {
    ...(unique.get(SOURCE_LOCALE) || ENGLISH_ONLY_LOCALIZATION.locales[0]),
    enabled: true,
    published: true,
    rtl: false,
    displayOrder: 0,
  });
  const normalized = [...unique.values()].sort((a,b)=>a.displayOrder-b.displayOrder || a.code.localeCompare(b.code));
  const available = normalized.filter(locale => locale.enabled && locale.published);
  const requestedDefault = String(raw.defaultLocale || SOURCE_LOCALE).toLowerCase();
  return {
    defaultLocale: available.some(locale => locale.code === requestedDefault) ? requestedDefault : SOURCE_LOCALE,
    translationVersion: Number.isSafeInteger(raw.translationVersion) && Number(raw.translationVersion) > 0
      ? Number(raw.translationVersion)
      : 1,
    locales: normalized,
  };
}

export function publicLocalizationBootstrap(config: RuntimeLocalizationConfig) {
  const sanitized = sanitizeLocalizationConfig(config);
  return {
    defaultLocale: sanitized.defaultLocale,
    translationVersion: sanitized.translationVersion,
    availableLocales: sanitized.locales
      .filter(locale => locale.enabled && locale.published)
      .map(({ code, name, nativeName, rtl, translations }) => ({ code, name, nativeName, rtl, translations })),
  };
}

export function missingTranslationKeys(source: Record<string, string>, locale: RuntimeLocale) {
  return Object.keys(source).filter(key => !locale.translations[key]?.trim());
}
