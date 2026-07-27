import type { RuntimeLocale } from "./localization-policy";

export function flattenTranslations(value: unknown, prefix = "", result: Record<string, string> = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === "string") result[path] = item;
    else flattenTranslations(item, path, result);
  }
  return result;
}

export type TranslationCoverage = { total: number; translated: number; missing: number; percentage: number };
export function translationCoverage(keys: string[], locale: RuntimeLocale): TranslationCoverage {
  const translated = keys.filter(key => Boolean(locale.translations[key]?.trim())).length;
  const total = keys.length;
  return { total, translated, missing: total - translated, percentage: total ? Math.round((translated / total) * 100) : 100 };
}

export function translationNamespace(key: string) { return key.split(".")[0] || "general"; }
export function filterTranslationKeys(keys: string[], english: Record<string, string>, locales: RuntimeLocale[], input: { query?: string; namespace?: string; locale?: string; incomplete?: boolean }) {
  const query = input.query?.trim().toLowerCase() || "";
  return keys.filter(key => {
    const target = input.locale ? locales.find(locale => locale.code === input.locale) : undefined;
    const missing = target ? !target.translations[key]?.trim() : locales.some(locale => locale.code !== "en" && !locale.translations[key]?.trim());
    return (!input.namespace || translationNamespace(key) === input.namespace)
      && (!input.incomplete || missing)
      && (!query || key.toLowerCase().includes(query) || english[key]?.toLowerCase().includes(query) || locales.some(locale => locale.translations[key]?.toLowerCase().includes(query)));
  });
}
