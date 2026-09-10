import { LegalDocumentStatus, LegalDocumentType, prisma } from "@popwam/db";
import {
  LEGAL_COUNTRY_SETTING_KEY,
  legalCandidateTarget,
  normalizeCountryIso2,
  resolveLocalizedLegalCandidate,
  sanitizeLegalCountryTargeting,
} from "@/lib/legal-country-policy";

const supportedLocales = new Set(["en", "ar", "fr"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type")?.toUpperCase();
  const requestedLocale =
    url.searchParams.get("locale")?.toLowerCase().split("-")[0] || "en";
  if (type !== LegalDocumentType.TERMS && type !== LegalDocumentType.PRIVACY) {
    return Response.json(
      { ok: false, error: "LEGAL_DOCUMENT_TYPE_INVALID" },
      { status: 400 },
    );
  }
  const locale = supportedLocales.has(requestedLocale) ? requestedLocale : "en";
  const countryIso2 = normalizeCountryIso2(url.searchParams.get("country"));
  if (url.searchParams.has("country") && !countryIso2)
    return Response.json(
      { ok: false, error: "LEGAL_COUNTRY_INVALID" },
      { status: 400 },
    );
  const now = new Date();
  const [documents, supportedCountry, targetingSetting] = await Promise.all([
    prisma.legalDocument.findMany({
      where: {
        documentType: type,
        locale: { in: locale === "en" ? ["en"] : [locale, "en"] },
        status: LegalDocumentStatus.PUBLISHED,
        isActive: true,
        effectiveAt: { lte: now },
      },
      orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
    }),
    countryIso2
      ? prisma.phoneCountryConfig.findFirst({
          where: { iso2: countryIso2, enabled: true },
          select: { iso2: true },
        })
      : null,
    prisma.systemSetting.findUnique({
      where: { key: LEGAL_COUNTRY_SETTING_KEY },
      select: { value: true },
    }),
  ]);
  const applicableCountry = supportedCountry?.iso2 || null;
  const targeting = sanitizeLegalCountryTargeting(targetingSetting?.value);
  const candidates = documents.map((document) =>
    legalCandidateTarget(document, targeting),
  );
  const document = resolveLocalizedLegalCandidate(
    candidates,
    locale,
    "en",
    applicableCountry,
  );
  if (!document)
    return Response.json(
      { ok: false, error: "LEGAL_DOCUMENT_UNAVAILABLE" },
      { status: 404 },
    );
  const {
    countries: _countries,
    countryTargetMode,
    ...publicDocument
  } = document;
  return Response.json(
    {
      ok: true,
      document: publicDocument,
      fallbackLocale: document.locale !== locale,
      countryApplied: applicableCountry,
      countryTargetMode,
    },
    {
      headers: {
        "cache-control": "public, max-age=300, stale-while-revalidate=3600",
        vary: "accept-language, cookie",
      },
    },
  );
}
