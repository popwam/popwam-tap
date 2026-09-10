export const LEGAL_COUNTRY_TARGET_MODES = [
  "GLOBAL",
  "ALL_SUPPORTED",
  "SELECTED",
] as const;
export type LegalCountryTargetMode =
  (typeof LEGAL_COUNTRY_TARGET_MODES)[number];
export const LEGAL_COUNTRY_SETTING_KEY = "legal.country-targeting.v1";
export type LegalCountryTargetingConfig = Record<
  string,
  { mode: LegalCountryTargetMode; countries: string[] }
>;

export function normalizeCountryIso2(value: unknown) {
  const iso2 = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(iso2) ? iso2 : null;
}

export function legalCountryScope(
  mode: LegalCountryTargetMode,
  countries: string[],
) {
  const normalized = [
    ...new Set(
      countries
        .map(normalizeCountryIso2)
        .filter((item): item is string => Boolean(item)),
    ),
  ].sort();
  if (mode === "GLOBAL")
    return { mode, countries: [] as string[], scopeKey: "GLOBAL" };
  if (mode === "ALL_SUPPORTED")
    return { mode, countries: [] as string[], scopeKey: "ALL_SUPPORTED" };
  if (!normalized.length) throw new Error("LEGAL_COUNTRY_REQUIRED");
  return {
    mode,
    countries: normalized,
    scopeKey: `SELECTED:${normalized.join(",")}`,
  };
}

export type LegalCandidate = {
  locale: string;
  countryTargetMode: string;
  effectiveAt: Date;
  publishedAt: Date | null;
  countries: Array<{ countryIso2: string }>;
};

export function sanitizeLegalCountryTargeting(
  value: unknown,
): LegalCountryTargetingConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([documentId, raw]) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const item = raw as Record<string, unknown>;
      if (
        !LEGAL_COUNTRY_TARGET_MODES.includes(
          item.mode as LegalCountryTargetMode,
        )
      )
        return [];
      try {
        const scope = legalCountryScope(
          item.mode as LegalCountryTargetMode,
          Array.isArray(item.countries) ? item.countries.map(String) : [],
        );
        return [[documentId, { mode: scope.mode, countries: scope.countries }]];
      } catch {
        return [];
      }
    }),
  );
}

export function legalCandidateTarget<
  T extends {
    id: string;
    locale: string;
    effectiveAt: Date;
    publishedAt: Date | null;
  },
>(document: T, config: LegalCountryTargetingConfig) {
  const target = config[document.id] || {
    mode: "GLOBAL" as const,
    countries: [],
  };
  return {
    ...document,
    countryTargetMode: target.mode,
    countries: target.countries.map((countryIso2) => ({ countryIso2 })),
  };
}

/** Country overrides win within a locale; a one-country override is more
 * specific than a multi-country document. ALL_SUPPORTED follows selected
 * overrides, then GLOBAL. Locale fallback is applied by the caller. */
export function resolveLegalCandidate<T extends LegalCandidate>(
  candidates: T[],
  countryIso2?: string | null,
) {
  const country = normalizeCountryIso2(countryIso2);
  const applicable = candidates.filter((candidate) => {
    if (candidate.countryTargetMode === "GLOBAL") return true;
    if (candidate.countryTargetMode === "ALL_SUPPORTED")
      return Boolean(country);
    return Boolean(
      country &&
        candidate.countries.some((item) => item.countryIso2 === country),
    );
  });
  const rank = (candidate: T) =>
    candidate.countryTargetMode === "SELECTED"
      ? 300 - candidate.countries.length
      : candidate.countryTargetMode === "ALL_SUPPORTED"
        ? 100
        : 0;
  return (
    applicable.sort(
      (a, b) =>
        rank(b) - rank(a) ||
        b.effectiveAt.getTime() - a.effectiveAt.getTime() ||
        (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0),
    )[0] || null
  );
}

export function resolveLocalizedLegalCandidate<T extends LegalCandidate>(
  candidates: T[],
  requestedLocale: string,
  fallbackLocale: string,
  countryIso2?: string | null,
) {
  const country = normalizeCountryIso2(countryIso2);
  const choose = (locale: string, modes: string[]) =>
    resolveLegalCandidate(
      candidates.filter(
        (item) =>
          item.locale === locale && modes.includes(item.countryTargetMode),
      ),
      country,
    );
  return (
    choose(requestedLocale, ["SELECTED", "ALL_SUPPORTED"]) ||
    (requestedLocale !== fallbackLocale
      ? choose(fallbackLocale, ["SELECTED", "ALL_SUPPORTED"])
      : null) ||
    choose(requestedLocale, ["GLOBAL"]) ||
    (requestedLocale !== fallbackLocale
      ? choose(fallbackLocale, ["GLOBAL"])
      : null)
  );
}
