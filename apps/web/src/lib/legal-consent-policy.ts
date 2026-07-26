export type LegalDocumentForConsent = { id: string; isActive: boolean; effectiveAt: Date; required: boolean };

export function legalConsentDecision(document: LegalDocumentForConsent | null, now = new Date()) {
  if (!document || !document.isActive || document.effectiveAt > now) return { allowed: false as const, reason: "LEGAL_DOCUMENT_UNAVAILABLE" };
  return { allowed: true as const, required: document.required };
}

/** The public service deliberately takes one authenticated user id and no
 * target-user parameter; this helper makes that boundary explicit for callers. */
export function canRecordLegalConsentForUser(actorUserId: string, targetUserId: string) {
  return Boolean(actorUserId) && actorUserId === targetUserId;
}

export function legalConsentRecordDecision(existingConsentId?: string | null) {
  return existingConsentId ? { kind: "RETURN_EXISTING" as const, consentId: existingConsentId } : { kind: "CREATE" as const };
}
