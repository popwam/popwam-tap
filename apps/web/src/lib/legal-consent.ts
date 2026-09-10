import { LegalConsentSource, prisma } from "@popwam/db";
import {
  legalConsentDecision,
  legalConsentRecordDecision,
} from "./legal-consent-policy";
import { accountLegalDocumentTypes } from "./legal-readiness-policy";
import {
  LEGAL_COUNTRY_SETTING_KEY,
  legalCandidateTarget,
  resolveLocalizedLegalCandidate,
  sanitizeLegalCountryTargeting,
} from "./legal-country-policy";

export async function resolvedAccountLegalDocuments(
  userId: string,
  locale: string,
) {
  const now = new Date();
  const [documents, user, targetingSetting] = await Promise.all([
    prisma.legalDocument.findMany({
      where: {
        locale: { in: locale === "en" ? ["en"] : [locale, "en"] },
        documentType: { in: [...accountLegalDocumentTypes] },
        required: true,
        requiresAcceptance: true,
        isActive: true,
        status: "PUBLISHED",
        effectiveAt: { lte: now },
      },
      orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }],
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { phoneCountryIso2: true },
    }),
    prisma.systemSetting.findUnique({
      where: { key: LEGAL_COUNTRY_SETTING_KEY },
      select: { value: true },
    }),
  ]);
  const targeting = sanitizeLegalCountryTargeting(targetingSetting?.value);
  const country = user?.phoneCountryIso2
    ? await prisma.phoneCountryConfig.findFirst({
        where: { iso2: user.phoneCountryIso2, enabled: true },
        select: { iso2: true },
      })
    : null;
  const candidates = documents.map((document) =>
    legalCandidateTarget(document, targeting),
  );
  return accountLegalDocumentTypes.flatMap((type) => {
    const document = resolveLocalizedLegalCandidate(
      candidates.filter((item) => item.documentType === type),
      locale,
      "en",
      country?.iso2,
    );
    return document ? [document] : [];
  });
}

export async function acceptLegalDocument(
  userId: string,
  legalDocumentId: string,
  source: LegalConsentSource,
) {
  return prisma.$transaction(
    async (tx) => {
      const document = await tx.legalDocument.findUnique({
        where: { id: legalDocumentId },
      });
      const decision = legalConsentDecision(document);
      if (!document || !decision.allowed)
        throw new Error("LEGAL_DOCUMENT_UNAVAILABLE");
      const existing = await tx.userLegalConsent.findUnique({
        where: { userId_legalDocumentId: { userId, legalDocumentId } },
      });
      if (existing?.revokedAt) {
        const consent = await tx.userLegalConsent.update({
          where: { id: existing.id },
          data: { revokedAt: null, acceptedAt: new Date(), source },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            operation: "legal.consent.accept",
            targetId: legalDocumentId,
            metadata: {
              documentType: document.documentType,
              version: document.version,
              required: document.required,
              reaccepted: true,
            },
          },
        });
        return { consent, created: false };
      }
      if (legalConsentRecordDecision(existing?.id).kind === "RETURN_EXISTING")
        return { consent: existing!, created: false };
      const consent = await tx.userLegalConsent.create({
        data: { userId, legalDocumentId, source },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          operation: "legal.consent.accept",
          targetId: legalDocumentId,
          metadata: {
            documentType: document.documentType,
            version: document.version,
            required: document.required,
          },
        },
      });
      return { consent, created: true };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function missingRequiredLegalDocuments(
  userId: string,
  locale: string,
) {
  const documents = await resolvedAccountLegalDocuments(userId, locale);
  const accepted = await prisma.userLegalConsent.findMany({
    where: {
      userId,
      revokedAt: null,
      legalDocumentId: { in: documents.map((document) => document.id) },
    },
    select: { legalDocumentId: true },
  });
  const acceptedIds = new Set(
    accepted.map((consent) => consent.legalDocumentId),
  );
  return documents.filter((document) => !acceptedIds.has(document.id));
}

/** Accepts exactly the current, active required documents for the authenticated
 * POP user. Callers cannot submit arbitrary historical document identifiers. */
export async function acceptActiveRequiredLegalDocuments(
  userId: string,
  locale: string,
  source: LegalConsentSource,
) {
  const documents = await resolvedAccountLegalDocuments(userId, locale);
  if (documents.length !== accountLegalDocumentTypes.length)
    throw new Error("LEGAL_DOCUMENTS_UNAVAILABLE");
  return prisma.$transaction(
    async (tx) => {
      const accepted = await tx.userLegalConsent.findMany({
        where: {
          userId,
          revokedAt: null,
          legalDocumentId: { in: documents.map((document) => document.id) },
        },
        select: { legalDocumentId: true },
      });
      const acceptedIds = new Set(
        accepted.map((consent) => consent.legalDocumentId),
      );
      const created: string[] = [];
      for (const document of documents) {
        if (acceptedIds.has(document.id)) continue;
        await tx.userLegalConsent.upsert({
          where: {
            userId_legalDocumentId: { userId, legalDocumentId: document.id },
          },
          create: { userId, legalDocumentId: document.id, source },
          update: { revokedAt: null, acceptedAt: new Date(), source },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            operation: "legal.consent.accept",
            targetId: document.id,
            metadata: {
              documentType: document.documentType,
              version: document.version,
              required: true,
            },
          },
        });
        created.push(document.id);
      }
      return {
        created,
        acceptedDocumentIds: documents.map((document) => document.id),
      };
    },
    { isolationLevel: "Serializable" },
  );
}
