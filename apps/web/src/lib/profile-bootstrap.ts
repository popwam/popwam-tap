import { LegalConsentSource, Prisma, ProfileKind, prisma } from "@popwam/db";
import {
  acceptActiveRequiredLegalDocuments,
  resolvedAccountLegalDocuments,
} from "./legal-consent";
import {
  initializeDefaultModules,
  validateProfileQuota,
} from "./profile-domain";
import {
  legalReadyForDocuments,
} from "./legal-readiness-policy";

import { getAccountTypePolicies } from "./account-type-policy";
import { getUserEntitlements } from "./plans";
import { resolveInitialTemplate } from "./profile-bootstrap-template";

type BootstrapData = Record<string, unknown>;
const readData = (data: unknown): BootstrapData =>
  data && typeof data === "object" && !Array.isArray(data)
    ? (data as BootstrapData)
    : {};

export type ProfileBootstrapInput = {
  userId: string;
  locale: string;
  displayName: string;
  profileKind: ProfileKind;
  templateId?: string | null;
};

export async function markNewAccountForProfileBootstrap(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const current = await tx.onboardingProgress.findUnique({
    where: { userId },
    select: { data: true },
  });
  const data = {
    ...readData(current?.data),
    phaseCNewAccount: true,
    phaseCProfileBootstrapComplete: false,
  };
  await tx.onboardingProgress.upsert({
    where: { userId },
    update: { data: data as Prisma.InputJsonValue },
    create: { userId, data: data as Prisma.InputJsonValue },
  });
}

export async function getProfileBootstrapStatus(
  userId: string,
  locale: string,
) {
  const now = new Date();
  const [progress, profiles, documents, consents, passkeyCount, user, policies, entitlements] =
    await Promise.all([
      prisma.onboardingProgress.findUnique({
        where: { userId },
        select: { data: true },
      }),
      prisma.profile.findMany({
        where: { userId },
        select: {
          id: true,
          isPrimary: true,
          profileKind: true,
          categoryId: true,
          templateId: true,
          lifecycle: true,
          displayName: true,
          template: { select: { slug: true, nameAr: true, nameEn: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      resolvedAccountLegalDocuments(userId, locale),
      prisma.userLegalConsent.findMany({
        where: { userId },
        select: { legalDocumentId: true },
      }),
      prisma.passkeyCredential.count({ where: { userId, revokedAt: null } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      getAccountTypePolicies(),
      getUserEntitlements(userId),
    ]);
  const data = readData(progress?.data);
  const requiredIds = new Set(documents.map((document) => document.id));
  const acceptedIds = new Set(
    consents.map((consent) => consent.legalDocumentId),
  );
  const legalReady = legalReadyForDocuments(documents, now);
  const legalAccepted =
    legalReady && [...requiredIds].every((id) => acceptedIds.has(id));
  const primary = profiles.find(
    (profile) => profile.isPrimary && profile.lifecycle !== "ARCHIVED",
  ) || profiles.find(profile => profile.lifecycle !== "ARCHIVED");
  return {
    accountName: user?.name || "",
    accountKind: data.accountKind || primary?.profileKind || null,
    setupStep: data.pass7Step || null,
    profileName: primary?.displayName || "",
    templateId: primary?.templateId || null,
    templateName: locale === "ar" ? primary?.template?.nameAr : primary?.template?.nameEn,
    templateSlug: primary?.template?.slug || null,
    accountTypes: Object.values(policies).map(policy => ({ key: policy.key, enabled: policy.enabled && (policy.key !== "BUSINESS" || Boolean(entitlements.effective.allowBusinessCards)) })),
    isNewAccount: data.phaseCNewAccount === true,
    bootstrapComplete: data.phaseCProfileBootstrapComplete === true,
    hasPrimaryProfile: Boolean(primary),
    legalReady,
    legalAccepted,
    requiredDocuments: documents.map((document) => ({
      ...document,
      documentType: document.documentType as "TERMS" | "PRIVACY",
    })),
    passkeyCount,
    primaryProfileId: primary?.id || null,
  };
}

export async function acceptRequiredLegalConsentForBootstrap(
  userId: string,
  locale: string,
) {
  return acceptActiveRequiredLegalDocuments(
    userId,
    locale,
    LegalConsentSource.ONBOARDING,
  );
}

/** Creates the first draft only after user-provided identity and legal consent.
 * A historical single placeholder can still be completed; multi-profile users
 * are never silently rewritten. */
export async function completeInitialProfileBootstrap(
  input: ProfileBootstrapInput,
) {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 160) throw new Error("PROFILE_NAME_REQUIRED");
  const resolvedDocuments = await resolvedAccountLegalDocuments(
    input.userId,
    input.locale,
  );
  return prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const [progress, accepted, profiles] = await Promise.all([
        tx.onboardingProgress.findUnique({ where: { userId: input.userId } }),
        tx.userLegalConsent.findMany({
          where: { userId: input.userId },
          select: { legalDocumentId: true },
        }),
        tx.profile.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      const documents = resolvedDocuments;
      const data = readData(progress?.data);

      if (!legalReadyForDocuments(documents, now))
        throw new Error("LEGAL_DOCUMENTS_UNAVAILABLE");
      const acceptedIds = new Set(
        accepted.map((consent) => consent.legalDocumentId),
      );
      if (documents.some((document) => !acceptedIds.has(document.id)))
        throw new Error("LEGAL_CONSENT_REQUIRED");
      const canonicalPrimary = profiles.find(
        (profile) => profile.isPrimary && profile.lifecycle !== "ARCHIVED",
      );
      if (canonicalPrimary)
        return canonicalPrimary;
      if (profiles.length > 1)
        throw new Error("PROFILE_BOOTSTRAP_COMPATIBILITY_REQUIRED");
      const placeholder = profiles[0];
      const policies = await getAccountTypePolicies(tx);
      if (!policies[input.profileKind].enabled) throw new Error("ACCOUNT_TYPE_UNAVAILABLE");
      const quota = await validateProfileQuota(tx, input.userId, input.profileKind, placeholder ? 0 : 1);
      const template = await resolveInitialTemplate(tx, input.profileKind, input.templateId, quota.plan.slug);
      const identityData = {
          displayName,
          displayLabel: displayName,
          displayNameAr:
            input.locale === "ar" ? displayName : placeholder?.displayNameAr,
          displayNameEn:
            input.locale !== "ar" ? displayName : placeholder?.displayNameEn,
          type: input.profileKind === "BUSINESS" ? "ORGANIZATION" as const : "PERSONAL" as const,
          profileKind: input.profileKind,
          categoryId: null,
          templateId: template?.id || null,
          lifecycle: "DRAFT" as const,
          isPrimary: true,
      };
      const profile = placeholder
        ? await tx.profile.update({ where: { id: placeholder.id }, data: identityData })
        : await tx.profile.create({ data: { ...identityData, userId: input.userId, primaryLanguage: input.locale } });
      await tx.virtualCard.upsert({ where: { profileId: profile.id },
        update: { name: displayName, themeId: template?.id || null },
        create: { userId: input.userId, profileId: profile.id, name: displayName, type: input.profileKind, isDefault: true, themeId: template?.id || null } });
      await initializeDefaultModules(tx, profile.id, template?.id);
      const next = {
        ...data,
        phaseCProfileBootstrapComplete: true,
        accountKind: input.profileKind,
        pass7Step: "TEMPLATE",
        phaseCProfileBootstrapProfileId: profile.id,
      };
      await tx.onboardingProgress.upsert({
        where: { userId: input.userId },
        update: { data: next as Prisma.InputJsonValue },
        create: { userId: input.userId, data: next as Prisma.InputJsonValue },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.userId,
          operation: "profile.bootstrap.complete",
          targetId: profile.id,
          metadata: {
            profileKind: input.profileKind,
            categorySlug: null,
            templateId: template?.id || null,
          },
        },
      });
      return profile;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** Small resumable account setup contract; old category questionnaires are not consulted. */
export async function saveAccountSetup(userId: string, action: string, value?: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
    const progress = await tx.onboardingProgress.findUnique({ where: { userId } });
    const data = readData(progress?.data);
    if (action === "NAME") {
      const name = value?.trim();
      if (!name || name.length > 160) throw new Error("PROFILE_NAME_REQUIRED");
      await tx.user.update({ where: { id: userId }, data: { name } });
    } else if (action === "ACCOUNT_TYPE") {
      if (value !== "PERSONAL" && value !== "BUSINESS") throw new Error("PROFILE_KIND_INVALID");
      const policies = await getAccountTypePolicies(tx);
      if (!policies[value].enabled) throw new Error("ACCOUNT_TYPE_UNAVAILABLE");
      await validateProfileQuota(tx, userId, value);
      data.accountKind = value;
    } else if (action === "SECURITY" || action === "COMPLETE") {
      const profile = await tx.profile.findFirst({ where: { userId, isPrimary: true, lifecycle: { not: "ARCHIVED" } } });
      if (!profile) throw new Error("PROFILE_REQUIRED");
      data.pass7Step = action === "SECURITY" ? "SECURITY" : "COMPLETE";
    } else throw new Error("SETUP_ACTION_INVALID");
    await tx.onboardingProgress.upsert({ where: { userId },
      create: { userId, data: data as Prisma.InputJsonValue, ...(action === "COMPLETE" ? { completedAt: new Date() } : {}) },
      update: { data: data as Prisma.InputJsonValue, ...(action === "COMPLETE" ? { completedAt: new Date() } : {}) } });
    return { ok: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
