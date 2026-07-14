export type SupportedLocale = "ar" | "en";

export function resolveLocale(saved: string | undefined, acceptLanguage: string): SupportedLocale {
  if (saved === "ar" || saved === "en") return saved;
  return acceptLanguage.toLowerCase().split(",")[0]?.trim().startsWith("ar") ? "ar" : "en";
}

export function localeDirection(locale: SupportedLocale) { return locale === "ar" ? "rtl" as const : "ltr" as const; }
