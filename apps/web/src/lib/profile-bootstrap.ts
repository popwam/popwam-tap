import { LegalConsentSource, Prisma, ProfileKind, prisma } from "@popwam/db";
import { acceptActiveRequiredLegalDocuments } from "./legal-consent";
import { initializeDefaultModules, validateProfileTemplate } from "./profile-domain";

type BootstrapData = Record<string, unknown>;
const accountLegalDocumentTypes = ["TERMS", "PRIVACY"] as const;
const readData = (data: unknown): BootstrapData => data && typeof data === "object" && !Array.isArray(data) ? data as BootstrapData : {};

export type ProfileBootstrapInput = { userId: string; locale: "ar" | "en"; displayName: string; profileKind: ProfileKind; categorySlug: string; templateId?: string | null };

export async function markNewAccountForProfileBootstrap(tx: Prisma.TransactionClient, userId: string) {
  const current = await tx.onboardingProgress.findUnique({ where: { userId }, select: { data: true } });
  const data = { ...readData(current?.data), phaseCNewAccount: true, phaseCProfileBootstrapComplete: false };
  await tx.onboardingProgress.upsert({ where: { userId }, update: { data: data as Prisma.InputJsonValue }, create: { userId, data: data as Prisma.InputJsonValue } });
}

export async function getProfileBootstrapStatus(userId: string, locale: "ar" | "en") {
  const now = new Date();
  const [progress, profiles, documents, consents, passkeyCount] = await Promise.all([
    prisma.onboardingProgress.findUnique({ where: { userId }, select: { data: true } }),
    prisma.profile.findMany({ where: { userId }, select: { id: true, isPrimary: true, profileKind: true, categoryId: true, templateId: true, lifecycle: true }, orderBy: { createdAt: "asc" } }),
    prisma.legalDocument.findMany({ where: { locale, documentType: { in: [...accountLegalDocumentTypes] }, required: true, isActive: true, effectiveAt: { lte: now } }, select: { id: true, documentType: true, version: true } }),
    prisma.userLegalConsent.findMany({ where: { userId }, select: { legalDocumentId: true } }),
    prisma.passkeyCredential.count({ where: { userId, revokedAt: null } }),
  ]);
  const data = readData(progress?.data);
  const requiredIds = new Set(documents.map((document) => document.id));
  const acceptedIds = new Set(consents.map((consent) => consent.legalDocumentId));
  const legalAccepted = documents.length > 0 && [...requiredIds].every((id) => acceptedIds.has(id));
  const primary = profiles.find((profile) => profile.isPrimary && profile.lifecycle !== "ARCHIVED");
  return {
    isNewAccount: data.phaseCNewAccount === true,
    bootstrapComplete: data.phaseCProfileBootstrapComplete === true,
    hasPrimaryProfile: Boolean(primary),
    legalReady: documents.length > 0,
    legalAccepted,
    requiredDocuments: documents.map((document) => ({ ...document, documentType: document.documentType as "TERMS" | "PRIVACY" })),
    passkeyCount,
    legacyProfileCount: profiles.filter((profile) => !profile.profileKind).length,
    primaryProfileId: primary?.id || null,
  };
}

export async function acceptRequiredLegalConsentForBootstrap(userId: string, locale: "ar" | "en") {
  return acceptActiveRequiredLegalDocuments(userId, locale, LegalConsentSource.ONBOARDING);
}

/** Converts only the single placeholder profile created for a marked new OTP
 * account. Existing multi-profile users are deliberately routed to a future
 * compatibility upgrade instead of being silently rewritten. */
export async function completeInitialProfileBootstrap(input: ProfileBootstrapInput) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("PROFILE_NAME_REQUIRED");
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const [progress, documents, accepted, profiles] = await Promise.all([
      tx.onboardingProgress.findUnique({ where: { userId: input.userId } }),
      tx.legalDocument.findMany({ where: { locale: input.locale, documentType: { in: [...accountLegalDocumentTypes] }, required: true, isActive: true, effectiveAt: { lte: now } } }),
      tx.userLegalConsent.findMany({ where: { userId: input.userId }, select: { legalDocumentId: true } }),
      tx.profile.findMany({ where: { userId: input.userId }, orderBy: { createdAt: "asc" } }),
    ]);
    const data = readData(progress?.data);
    if (data.phaseCNewAccount !== true) throw new Error("PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED");
    if (!documents.length) throw new Error("LEGAL_DOCUMENTS_UNAVAILABLE");
    const acceptedIds = new Set(accepted.map((consent) => consent.legalDocumentId));
    if (documents.some((document) => !acceptedIds.has(document.id))) throw new Error("LEGAL_CONSENT_REQUIRED");
    const canonicalPrimary = profiles.find((profile) => profile.isPrimary && profile.lifecycle !== "ARCHIVED");
    if (data.phaseCProfileBootstrapComplete === true && canonicalPrimary) return canonicalPrimary;
    if (profiles.length !== 1) throw new Error("PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED");
    const placeholder = profiles[0];
    const { category, template } = await validateProfileTemplate(tx, { profileKind: input.profileKind, categorySlug: input.categorySlug, templateId: input.templateId || null });
    const profile = await tx.profile.update({ where: { id: placeholder.id }, data: {
      displayName,
      displayLabel: displayName,
      displayNameAr: input.locale === "ar" ? displayName : placeholder.displayNameAr,
      displayNameEn: input.locale === "en" ? displayName : placeholder.displayNameEn,
      type: input.profileKind === "BUSINESS" ? "ORGANIZATION" : "PERSONAL",
      profileKind: input.profileKind,
      categoryId: category?.id || null,
      templateId: template?.id || null,
      lifecycle: "DRAFT",
      isPrimary: true,
    } });
    await tx.user.update({ where: { id: input.userId }, data: { name: displayName } });
    await initializeDefaultModules(tx, profile.id, template?.id);
    const next = { ...data, phaseCProfileBootstrapComplete: true, phaseCProfileBootstrapProfileId: profile.id };
    await tx.onboardingProgress.upsert({ where: { userId: input.userId }, update: { data: next as Prisma.InputJsonValue }, create: { userId: input.userId, data: next as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: { actorId: input.userId, operation: "profile.bootstrap.complete", targetId: profile.id, metadata: { profileKind: input.profileKind, categorySlug: category?.slug || null, templateId: template?.id || null } } });
    return profile;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
