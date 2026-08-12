import { LegalDocumentStatus, LegalDocumentType, prisma } from "@popwam/db";

const supportedLocales = new Set(["en", "ar", "fr"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type")?.toUpperCase();
  const requestedLocale = url.searchParams.get("locale")?.toLowerCase().split("-")[0] || "en";
  if (type !== LegalDocumentType.TERMS && type !== LegalDocumentType.PRIVACY) {
    return Response.json({ ok: false, error: "LEGAL_DOCUMENT_TYPE_INVALID" }, { status: 400 });
  }
  const locale = supportedLocales.has(requestedLocale) ? requestedLocale : "en";
  const now = new Date();
  const select = { documentType: true, version: true, locale: true, title: true, content: true, effectiveAt: true } as const;
  const localized = await prisma.legalDocument.findFirst({
    where: { documentType: type, locale, status: LegalDocumentStatus.PUBLISHED, isActive: true, effectiveAt: { lte: now } },
    orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
    select,
  });
  const document = localized || (locale !== "en" ? await prisma.legalDocument.findFirst({
    where: { documentType: type, locale: "en", status: LegalDocumentStatus.PUBLISHED, isActive: true, effectiveAt: { lte: now } },
    orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
    select,
  }) : null);
  if (!document) return Response.json({ ok: false, error: "LEGAL_DOCUMENT_UNAVAILABLE" }, { status: 404 });
  return Response.json({ ok: true, document, fallbackLocale: document.locale !== locale }, { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } });
}
