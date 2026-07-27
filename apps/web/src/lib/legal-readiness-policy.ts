/** The single contract for onboarding legal readiness. This intentionally uses
 * the existing TERMS/PRIVACY account contract rather than inferring readiness
 * from any document that happens to be published. */
export const accountLegalDocumentTypes = ["TERMS", "PRIVACY"] as const;
export type AccountLegalDocumentType = typeof accountLegalDocumentTypes[number];
export type LegalReadinessDocument = { documentType: string; required: boolean; requiresAcceptance: boolean; isActive: boolean; status: string; effectiveAt: Date };

export function isCurrentRequiredAccountLegal(document: LegalReadinessDocument, now = new Date()) {
  return document.required && document.requiresAcceptance && document.isActive && document.status === "PUBLISHED" && document.effectiveAt <= now && accountLegalDocumentTypes.includes(document.documentType as AccountLegalDocumentType);
}

export function legalReadyForDocuments(documents: LegalReadinessDocument[], now = new Date()) {
  return accountLegalDocumentTypes.every(type => documents.some(document => document.documentType === type && isCurrentRequiredAccountLegal(document, now)));
}
