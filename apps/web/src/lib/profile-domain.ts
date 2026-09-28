import {
  Prisma,
  ProfileKind,
  ProfileLifecycle,
  prisma,
} from "@popwam/db";
import { randomUUID } from "node:crypto";
import { mergeEntitlements } from "@/lib/plans";
import { requireValidProfileModuleConfiguration } from "@/lib/profile-module-config";
import { idempotentProfileCreationDecision, primaryProfileDecision, profileQuotaDecision } from "@/lib/profile-domain-policy";
import { defaultProfileSlug } from "@/lib/profile-slugs";

import { resolveInitialTemplate } from "./profile-bootstrap-template";
import { getAccountTypePolicies } from "./account-type-policy";

const CORE_MODULE_KEYS = ["IDENTITY", "ABOUT", "CONTACT", "LINKS"];

export type CreateProfileInput = {
  userId: string;
  displayName: string;
  displayLabel?: string | null;
  profileKind: ProfileKind;
  categorySlug?: string | null;
  templateId?: string | null;
  primaryLanguage?: "ar" | "en";
  creationKey?: string | null;
};

type Tx = Prisma.TransactionClient;

async function lockUser(tx: Tx, userId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
}
async function profileQuotaContext(tx: Tx, userId: string) {
  const now = new Date();
  const [subscription, override, plan, entitlements, used] = await Promise.all([
    tx.userPlan.findFirst({ where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: { startsAt: "desc" }, include: { plan: true } }),
    tx.userLimitOverride.findUnique({ where: { userId } }),
    tx.plan.findUnique({ where: { slug: "free" } }),
    tx.profileEntitlement.findMany({ where: { userId, status: "ACTIVE", startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, select: { profileLimitIncrement: true } }),
    tx.profile.count({ where: { userId, archivedAt: null, lifecycle: { not: "ARCHIVED" } } }),
  ]);
  const activePlan = subscription?.plan || plan;
  if (!activePlan) throw new Error("PLAN_NOT_CONFIGURED");
  const effective = mergeEntitlements(activePlan, override);
  const entitlementIncrement = entitlements.reduce((total, entitlement) => total + entitlement.profileLimitIncrement, 0);
  return { effective, plan: activePlan, used, entitlementIncrement };
}

/** Validates profile quota while the owning User row is locked. Existing Plan
 * and UserLimitOverride semantics remain authoritative; active grants only add
 * explicitly recorded profile capacity. */
export async function validateProfileQuota(tx: Tx, userId: string, profileKind: ProfileKind, increment = 1) {
  await lockUser(tx, userId);
  const context = await profileQuotaContext(tx, userId);
  const maximum = Number(context.effective.maxProfiles) + context.entitlementIncrement;
  const decision = profileQuotaDecision({ used: context.used, baseLimit: Number(context.effective.maxProfiles), entitlementIncrement: context.entitlementIncrement, requested: increment, profileKind, allowBusinessProfiles: Boolean(context.effective.allowBusinessCards) });
  if (!decision.allowed) throw new Error(decision.reason);
  return { ...context, maximum };
}

export async function initializeDefaultModules(tx: Tx, profileId: string, templateId?: string | null) {
  const templateCandidates = templateId
    ? await tx.profileTemplateModule.findMany({
      where: { templateId, allowed: true, OR: [{ enabledByDefault: true }, { required: true }] },
      include: { moduleDefinition: true },
      orderBy: { defaultSortOrder: "asc" },
    })
    : [];
  // Older catalogue rows legitimately have no explicit template/module rules.
  // Falling back to the core modules keeps those templates usable and prevents
  // newly created profiles from being permanently blocked by IDENTITY missing.
  const candidates = templateCandidates.length > 0
    ? templateCandidates
    : (await tx.profileModuleDefinition.findMany({ where: { key: { in: CORE_MODULE_KEYS }, isActive: true }, orderBy: { key: "asc" } }))
      .map((moduleDefinition, index) => ({ moduleDefinition, defaultSortOrder: index * 10, required: false, defaultConfiguration: null }));

  for (const candidate of candidates) {
    if (!candidate.moduleDefinition.isActive) continue;
    const configuration = requireValidProfileModuleConfiguration(candidate.moduleDefinition.key, candidate.defaultConfiguration);
    await tx.profileModule.upsert({
      where: { profileId_moduleDefinitionId_instanceKey: { profileId, moduleDefinitionId: candidate.moduleDefinition.id, instanceKey: "default" } },
      update: {},
      create: {
        profileId,
        moduleDefinitionId: candidate.moduleDefinition.id,
        enabled: true,
        visibility: "PUBLIC",
        sortOrder: candidate.defaultSortOrder,
        configurationVersion: candidate.moduleDefinition.schemaVersion,
        configuration,
      },
    });
  }
}

async function createProfileInTransaction(tx: Tx, input: CreateProfileInput, isPrimary: boolean) {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("PROFILE_NAME_REQUIRED");
  await lockUser(tx, input.userId);
  if (input.creationKey) {
    const existing = await tx.profile.findUnique({ where: { creationKey: input.creationKey } });
    const idempotency = idempotentProfileCreationDecision(existing ? { userId: existing.userId, profileId: existing.id } : null, input.userId);
    if (idempotency.kind === "CONFLICT") throw new Error(idempotency.reason);
    if (idempotency.kind === "RETURN_EXISTING") return existing!;
  }
  const existingPrimary = await tx.profile.findFirst({ where: { userId: input.userId, isPrimary: true, archivedAt: null } });
  const primaryDecision = primaryProfileDecision({ activePrimaryIds: existingPrimary ? [existingPrimary.id] : [], operation: isPrimary ? "CREATE_PRIMARY" : "CREATE_ADDITIONAL" });
  if (!primaryDecision.allowed) throw new Error(primaryDecision.reason);

  const quota = await profileQuotaContext(tx, input.userId);
  const quotaDecision = profileQuotaDecision({ used: quota.used, baseLimit: Number(quota.effective.maxProfiles), entitlementIncrement: quota.entitlementIncrement, requested: 1, profileKind: input.profileKind, allowBusinessProfiles: Boolean(quota.effective.allowBusinessCards) });
  if (!quotaDecision.allowed) throw new Error(quotaDecision.reason);
  const policies = await getAccountTypePolicies(tx);
  if (!policies[input.profileKind].enabled) throw new Error("ACCOUNT_TYPE_UNAVAILABLE");
  const template = await resolveInitialTemplate(tx, input.profileKind, input.templateId, quota.plan.slug);

  const profile = await tx.profile.create({
    data: {
      userId: input.userId,
      displayName,
      displayLabel: input.displayLabel?.trim() || displayName,
      type: input.profileKind === "BUSINESS" ? "ORGANIZATION" : "PERSONAL",
      profileKind: input.profileKind,
      lifecycle: "DRAFT",
      isPrimary,
      creationKey: input.creationKey?.trim() || null,
      categoryId: null,
      templateId: template?.id || null,
      primaryLanguage: input.primaryLanguage || "ar",
    },
  });
  // The public slug remains unpublished until readiness/publishing succeeds,
  // but every draft receives a stable server-generated candidate immediately.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = defaultProfileSlug(displayName, randomUUID());
    const [current, historical] = await Promise.all([
      tx.profile.findFirst({ where: { OR: [{ slug: candidate }, { draftSlug: candidate }], id: { not: profile.id } }, select: { id: true } }),
      tx.profileSlugHistory.findUnique({ where: { slug: candidate }, select: { profileId: true } }),
    ]);
    if (!current && !historical) {
      await tx.profile.update({ where: { id: profile.id }, data: { draftSlug: candidate } });
      break;
    }
    if (attempt === 4) throw new Error("PROFILE_SLUG_GENERATION_FAILED");
  }
  await initializeDefaultModules(tx, profile.id, template?.id);
  await tx.auditLog.create({ data: { actorId: input.userId, operation: isPrimary ? "profile.primary.create" : "profile.additional.create", targetId: profile.id, metadata: { profileKind: input.profileKind, categoryId: null, templateId: template?.id || null } } });
  return profile;
}

export async function createAdditionalProfile(input: CreateProfileInput) {
  return prisma.$transaction((tx) => createProfileInTransaction(tx, input, false), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 10_000,
    timeout: 30_000,
  });
}

export async function archiveProfile(userId: string, profileId: string, replacementProfileId?: string) {
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const profile = await tx.profile.findFirst({ where: { id: profileId, userId } });
    if (!profile || profile.archivedAt || profile.lifecycle === "ARCHIVED") throw new Error("PROFILE_ARCHIVE_TARGET_INVALID");
    if (profile.isPrimary) {
      if (!replacementProfileId) throw new Error("PRIMARY_PROFILE_REPLACEMENT_REQUIRED");
      const replacement = await tx.profile.findFirst({ where: { id: replacementProfileId, userId, archivedAt: null, lifecycle: { not: "ARCHIVED" } } });
      if (!replacement || replacement.id === profile.id) throw new Error("PRIMARY_PROFILE_REPLACEMENT_INVALID");
      await tx.profile.update({ where: { id: profile.id }, data: { isPrimary: false } });
      await tx.profile.update({ where: { id: replacement.id }, data: { isPrimary: true } });
    }
    const archived = await tx.profile.update({ where: { id: profile.id }, data: { isPrimary: false, lifecycle: "ARCHIVED", archivedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: userId, operation: "profile.archive", targetId: profileId, metadata: { replacementProfileId: replacementProfileId || null } } });
    return archived;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
