import { LegalConsentSource, prisma } from "@popwam/db";
import { legalConsentDecision, legalConsentRecordDecision } from "./legal-consent-policy";
import { accountLegalDocumentTypes } from "./legal-readiness-policy";


export async function acceptLegalDocument(userId: string, legalDocumentId: string, source: LegalConsentSource) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.legalDocument.findUnique({ where: { id: legalDocumentId } });
    const decision = legalConsentDecision(document);
    if (!document || !decision.allowed) throw new Error("LEGAL_DOCUMENT_UNAVAILABLE");
    const existing = await tx.userLegalConsent.findUnique({ where: { userId_legalDocumentId: { userId, legalDocumentId } } });
    if (existing?.revokedAt) {
      const consent = await tx.userLegalConsent.update({
        where: { id: existing.id },
        data: { revokedAt: null, acceptedAt: new Date(), source },
      });
      await tx.auditLog.create({ data: { actorId: userId, operation: "legal.consent.accept", targetId: legalDocumentId, metadata: { documentType: document.documentType, version: document.version, required: document.required, reaccepted: true } } });
      return { consent, created: false };
    }
    if (legalConsentRecordDecision(existing?.id).kind === "RETURN_EXISTING") return { consent: existing!, created: false };
    const consent = await tx.userLegalConsent.create({ data: { userId, legalDocumentId, source } });
    await tx.auditLog.create({ data: { actorId: userId, operation: "legal.consent.accept", targetId: legalDocumentId, metadata: { documentType: document.documentType, version: document.version, required: document.required } } });
    return { consent, created: true };
  }, { isolationLevel: "Serializable" });
}

export async function missingRequiredLegalDocuments(userId: string, locale: string) {
  const now = new Date();
  const documents = await prisma.legalDocument.findMany({ where: { locale, documentType: { in: [...accountLegalDocumentTypes] }, required: true, requiresAcceptance: true, isActive: true, status: "PUBLISHED", effectiveAt: { lte: now } }, orderBy: [{ documentType: "asc" }, { effectiveAt: "desc" }] });
  const accepted = await prisma.userLegalConsent.findMany({ where: { userId, revokedAt: null, legalDocumentId: { in: documents.map((document) => document.id) } }, select: { legalDocumentId: true } });
  const acceptedIds = new Set(accepted.map((consent) => consent.legalDocumentId));
  return documents.filter((document) => !acceptedIds.has(document.id));
}

/** Accepts exactly the current, active required documents for the authenticated
 * POP user. Callers cannot submit arbitrary historical document identifiers. */
export async function acceptActiveRequiredLegalDocuments(userId: string, locale: string, source: LegalConsentSource) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const documents = await tx.legalDocument.findMany({ where: { locale, documentType: { in: [...accountLegalDocumentTypes] }, required: true, requiresAcceptance: true, isActive: true, status: "PUBLISHED", effectiveAt: { lte: now } }, orderBy: [{ documentType: "asc" }, { effectiveAt: "desc" }] });
    if (documents.length !== accountLegalDocumentTypes.length) throw new Error("LEGAL_DOCUMENTS_UNAVAILABLE");
    const accepted = await tx.userLegalConsent.findMany({ where: { userId, revokedAt: null, legalDocumentId: { in: documents.map((document) => document.id) } }, select: { legalDocumentId: true } });
    const acceptedIds = new Set(accepted.map((consent) => consent.legalDocumentId));
    const created: string[] = [];
    for (const document of documents) {
      if (acceptedIds.has(document.id)) continue;
      await tx.userLegalConsent.upsert({
        where: { userId_legalDocumentId: { userId, legalDocumentId: document.id } },
        create: { userId, legalDocumentId: document.id, source },
        update: { revokedAt: null, acceptedAt: new Date(), source },
      });
      await tx.auditLog.create({ data: { actorId: userId, operation: "legal.consent.accept", targetId: document.id, metadata: { documentType: document.documentType, version: document.version, required: true } } });
      created.push(document.id);
    }
    return { created, acceptedDocumentIds: documents.map((document) => document.id) };
  }, { isolationLevel: "Serializable" });
}
