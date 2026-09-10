import { prisma } from "@popwam/db";
import { getRuntimeLocalizationConfig } from "./localization-runtime";
import {
  accountLegalDocumentTypes,
  legalReadyForDocuments,
  type LegalReadinessDocument,
} from "./legal-readiness-policy";
import { flattenTranslations, translationCoverage } from "./translation-editor";
import en from "../../locales/en.json";
import { derivePlatformReadiness } from "./platform-readiness-policy";
import {
  LEGAL_COUNTRY_SETTING_KEY,
  sanitizeLegalCountryTargeting,
} from "./legal-country-policy";

export async function getPlatformReadiness() {
  const [config, countries, allDocuments, targetingSetting] = await Promise.all(
    [
      getRuntimeLocalizationConfig(),
      prisma.phoneCountryConfig.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      prisma.legalDocument.findMany({
        where: { documentType: { in: [...accountLegalDocumentTypes] } },
        orderBy: [{ locale: "asc" }, { effectiveAt: "desc" }],
      }),
      prisma.systemSetting.findUnique({
        where: { key: LEGAL_COUNTRY_SETTING_KEY },
        select: { value: true },
      }),
    ],
  );
  const targeting = sanitizeLegalCountryTargeting(targetingSetting?.value);
  const documents = allDocuments.filter(
    (document) =>
      !targeting[document.id] || targeting[document.id].mode === "GLOBAL",
  );
  const source = {
    ...flattenTranslations(en),
    ...config.locales.find((locale) => locale.code === "en")?.translations,
  };
  const keys = [
    ...new Set([
      ...Object.keys(source),
      ...config.locales.flatMap((locale) => Object.keys(locale.translations)),
    ]),
  ];
  const published = config.locales.filter(
    (locale) => locale.enabled && locale.published,
  );
  const now = new Date();
  const localeRows = published.map((locale) => {
    const ownDocuments = documents.filter(
      (document) => document.locale === locale.code,
    ) as unknown as LegalReadinessDocument[];
    const coverage = translationCoverage(keys, {
      ...locale,
      translations: locale.code === "en" ? source : locale.translations,
    });
    const legal = accountLegalDocumentTypes.map((type) => {
      const document = documents.find(
        (item) =>
          item.locale === locale.code &&
          item.documentType === type &&
          item.required &&
          item.requiresAcceptance &&
          item.isActive &&
          item.status === "PUBLISHED" &&
          item.effectiveAt <= now,
      );
      return {
        type,
        document: document
          ? {
              version: document.version,
              status: document.status,
              effectiveAt: document.effectiveAt,
            }
          : null,
      };
    });
    return {
      code: locale.code,
      name: locale.name,
      nativeName: locale.nativeName,
      rtl: locale.rtl,
      enabled: locale.enabled,
      published: locale.published,
      isDefault: config.defaultLocale === locale.code,
      coverage,
      legal,
      legalReady: legalReadyForDocuments(ownDocuments, now),
    };
  });
  const result = derivePlatformReadiness({
    defaultValid: published.some(
      (locale) => locale.code === config.defaultLocale,
    ),
    enabledCountries: countries.filter((country) => country.enabled).length,
    localeLegal: localeRows.map((locale) => ({
      code: locale.code,
      ready: locale.legalReady,
    })),
    translationWarnings: localeRows
      .filter((locale) => locale.code !== "en")
      .reduce((sum, locale) => sum + locale.coverage.missing, 0),
  });
  return {
    ...result,
    config,
    keyCount: keys.length,
    locales: localeRows,
    countries,
    enabledCountries: countries.filter((country) => country.enabled),
  };
}
