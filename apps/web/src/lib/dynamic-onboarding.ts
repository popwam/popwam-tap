import {
  DestinationType,
  OnboardingMappingKey,
  Prisma,
  ProfileModuleVisibility,
  prisma,
} from "@popwam/db";
import {
  hasValidationErrors,
  onboardingModuleCompatible,
  type OnboardingAnswers,
  type OnboardingDefinitionContract,
  resolveDefinitionCandidate,
  validateAnswerPayload,
  visibleQuestions,
  visibleSteps,
} from "./dynamic-onboarding-policy";
import {
  completionGate,
  ONBOARDING_CREATED_CONTENT_IS_VISIBLE,
  preserveExistingText,
  shouldApplyOnboardingText,
} from "./dynamic-onboarding-finalization-policy";

const definitionInclude = {
  category: true,
  template: true,
  steps: {
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      moduleDefinition: true,
      questions: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: { where: { active: true }, orderBy: { sortOrder: "asc" } },
          conditions: true,
        },
      },
    },
  },
} satisfies Prisma.OnboardingDefinitionInclude;

type DefinitionRecord = Prisma.OnboardingDefinitionGetPayload<{ include: typeof definitionInclude }>;
type Transaction = Prisma.TransactionClient;
type Locale = "ar" | "en";

export class OnboardingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const answersFrom = (value: unknown): OnboardingAnswers => record(value) as OnboardingAnswers;

const hasAnswer = (value: OnboardingAnswers[string] | undefined) =>
  value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);

export function serializeOnboardingDefinition(definition: DefinitionRecord, locale: Locale): OnboardingDefinitionContract {
  return {
    id: definition.id,
    key: definition.key,
    version: definition.version,
    profileKind: definition.profileKind,
    categoryKey: definition.category?.slug || null,
    templateId: definition.templateId,
    steps: definition.steps.map((step) => ({
      key: step.key,
      title: locale === "ar" ? step.titleAr : step.titleEn,
      description: locale === "ar" ? step.descriptionAr : step.descriptionEn,
      required: step.required,
      moduleKey: step.moduleDefinition?.key || null,
      questions: step.questions.map((question) => ({
        key: question.key,
        type: question.questionType,
        label: locale === "ar" ? question.labelAr : question.labelEn,
        help: locale === "ar" ? question.helpAr : question.helpEn,
        required: question.required,
        minLength: question.minLength,
        maxLength: question.maxLength,
        minValue: question.minValue === null ? null : Number(question.minValue),
        maxValue: question.maxValue === null ? null : Number(question.maxValue),
        maxItems: question.maxItems,
        options: question.options.map((option) => ({
          key: option.key,
          label: locale === "ar" ? option.labelAr : option.labelEn,
        })),
        conditions: question.conditions.map((condition) => ({
          sourceQuestionKey: condition.sourceQuestionKey,
          operator: condition.operator,
          expectedValues: condition.expectedValues,
        })),
      })),
    })),
  };
}

async function primaryProfile(client: Transaction | typeof prisma, userId: string) {
  const profile = await client.profile.findFirst({
    where: { userId, isPrimary: true, lifecycle: { not: "ARCHIVED" } },
    include: { category: true, template: true },
  });
  if (!profile?.profileKind) throw new OnboardingError("ONBOARDING_PROFILE_UNAVAILABLE", 409);
  return profile;
}

async function resolveDefinition(client: Transaction | typeof prisma, profile: Awaited<ReturnType<typeof primaryProfile>>) {
  const candidates = await client.onboardingDefinition.findMany({
    where: {
      profileKind: profile.profileKind!,
      status: "PUBLISHED",
      OR: [
        { templateId: profile.templateId || undefined },
        { categoryId: profile.categoryId || undefined, templateId: null },
        { categoryId: null, templateId: null },
      ],
    },
  });
  const selected = resolveDefinitionCandidate(candidates, {
    profileKind: profile.profileKind!,
    categoryId: profile.categoryId,
    templateId: profile.templateId,
  });
  if (!selected) throw new OnboardingError("ONBOARDING_DEFINITION_UNAVAILABLE", 409);
  return client.onboardingDefinition.findUniqueOrThrow({
    where: { id: selected.id },
    include: definitionInclude,
  });
}

function prefillAnswers(definition: DefinitionRecord, profile: Awaited<ReturnType<typeof primaryProfile>>, locale: Locale) {
  const values: Partial<Record<OnboardingMappingKey, string | null>> = {
    PROFILE_DISPLAY_NAME: profile.displayName,
    ABOUT_BIO: locale === "ar" ? profile.bioAr || profile.bio : profile.bioEn || profile.bio,
    CONTACT_PHONE: profile.phone,
    CONTACT_EMAIL: profile.email,
    CONTACT_LOCATION: locale === "ar" ? profile.addressAr || profile.locationText : profile.addressEn || profile.locationText,
    JOB_TITLE: locale === "ar" ? profile.jobTitleAr || profile.title : profile.jobTitleEn || profile.title,
    ORGANIZATION_NAME: locale === "ar" ? profile.organizationNameAr || profile.company : profile.organizationNameEn || profile.company,
  };
  const answers: OnboardingAnswers = {};
  for (const question of definition.steps.flatMap((step) => step.questions)) {
    const value = values[question.mappingKey];
    if (value) answers[question.key] = value;
  }
  return answers;
}

function progressResponse(
  definition: DefinitionRecord,
  progress: { profileId?: string | null; revision: number; currentStepKey: string | null; draftAnswers: unknown; completedAt: Date | null },
  locale: Locale,
) {
  return {
    state: progress.completedAt ? "ONBOARDING_COMPLETE" : "ONBOARDING_IN_PROGRESS",
    revision: progress.revision,
    profileId: progress.profileId ?? null,
    currentStepKey: progress.currentStepKey,
    answers: answersFrom(progress.draftAnswers),
    definition: serializeOnboardingDefinition(definition, locale),
  };
}

export async function getCurrentDynamicOnboarding(userId: string, locale: Locale) {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId },
    include: { definition: { include: definitionInclude } },
  });
  if (progress?.definition && progress.definition.status !== "DRAFT" &&
    progress.definitionVersion === progress.definition.version) {
    return progressResponse(progress.definition, progress, locale);
  }
  const compatibility = record(progress?.data);
  if (compatibility.phaseCNewAccount !== true) return { state: "BYPASSED" as const };
  if (compatibility.phaseCProfileBootstrapComplete !== true) return { state: "BOOTSTRAP_REQUIRED" as const };
  const profile = await primaryProfile(prisma, userId);
  const definition = await resolveDefinition(prisma, profile);
  return {
    state: "ONBOARDING_REQUIRED" as const,
    revision: progress?.revision || 0,
    definition: serializeOnboardingDefinition(definition, locale),
  };
}

export async function startDynamicOnboarding(userId: string, locale: Locale) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
    const existing = await tx.onboardingProgress.findUnique({
      where: { userId },
      include: { definition: { include: definitionInclude } },
    });
    if (existing?.definition && existing.definition.status !== "DRAFT" &&
      existing.definitionVersion === existing.definition.version) {
      return progressResponse(existing.definition, existing, locale);
    }
    const compatibility = record(existing?.data);
    if (compatibility.phaseCNewAccount !== true || compatibility.phaseCProfileBootstrapComplete !== true) {
      throw new OnboardingError("ONBOARDING_NOT_REQUIRED", 409);
    }
    const profile = await primaryProfile(tx, userId);
    const definition = await resolveDefinition(tx, profile);
    const draftAnswers = prefillAnswers(definition, profile, locale);
    const contract = serializeOnboardingDefinition(definition, locale);
    const currentStepKey = visibleSteps(contract, draftAnswers)[0]?.key || null;
    const progress = await tx.onboardingProgress.update({
      where: { userId },
      data: {
        profileId: profile.id,
        definitionId: definition.id,
        definitionVersion: definition.version,
        currentStepKey,
        currentStep: 1,
        revision: { increment: 1 },
        draftAnswers: draftAnswers as Prisma.InputJsonValue,
        initialAnswers: draftAnswers as Prisma.InputJsonValue,
        completedAt: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        operation: "onboarding.dynamic.started",
        targetId: profile.id,
        metadata: { definitionKey: definition.key, definitionVersion: definition.version },
      },
    });
    return progressResponse(definition, progress, locale);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function saveDynamicOnboardingProgress(input: {
  userId: string;
  locale: Locale;
  revision: number;
  stepKey: string;
  direction: "BACK" | "CONTINUE" | "STAY";
  answers: OnboardingAnswers;
}) {
  return prisma.$transaction(async (tx) => {
    const progress = await tx.onboardingProgress.findUnique({
      where: { userId: input.userId },
      include: {
        definition: { include: definitionInclude },
        profile: { select: { userId: true } },
      },
    });
    if (!progress?.definition || progress.definition.status === "DRAFT" ||
      !progress.profile || progress.profile.userId !== input.userId) {
      throw new OnboardingError("ONBOARDING_PROGRESS_UNAVAILABLE", 404);
    }
    if (progress.completedAt) return progressResponse(progress.definition, progress, input.locale);
    if (progress.revision !== input.revision || progress.currentStepKey !== input.stepKey) {
      throw new OnboardingError("ONBOARDING_PROGRESS_STALE", 409);
    }
    const contract = serializeOnboardingDefinition(progress.definition, input.locale);
    const current = contract.steps.find((step) => step.key === input.stepKey);
    if (!current) throw new OnboardingError("ONBOARDING_STEP_INVALID");
    const merged = { ...answersFrom(progress.draftAnswers), ...input.answers };
    const allowedKeys = new Set(visibleQuestions(current, merged).map((question) => question.key));
    if (Object.keys(input.answers).some((key) => !allowedKeys.has(key))) {
      throw new OnboardingError("ONBOARDING_QUESTION_INVALID");
    }
    if (input.direction === "CONTINUE") {
      const errors = validateAnswerPayload(contract, merged, { stepKey: current.key });
      if (hasValidationErrors(errors)) throw new OnboardingError("ONBOARDING_VALIDATION_FAILED", 422, errors);
    }
    const visible = visibleSteps(contract, merged);
    const currentIndex = Math.max(0, visible.findIndex((step) => step.key === current.key));
    const nextIndex = input.direction === "BACK"
      ? Math.max(0, currentIndex - 1)
      : input.direction === "STAY"
        ? currentIndex
        : Math.min(visible.length - 1, currentIndex + 1);
    const nextStepKey = visible[nextIndex]?.key || null;
    const updated = await tx.onboardingProgress.updateMany({
      where: { id: progress.id, revision: input.revision, completedAt: null },
      data: {
        draftAnswers: merged as Prisma.InputJsonValue,
        currentStepKey: nextStepKey,
        currentStep: nextIndex + 1,
        revision: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new OnboardingError("ONBOARDING_PROGRESS_STALE", 409);
    return progressResponse(progress.definition, {
      revision: input.revision + 1,
      currentStepKey: nextStepKey,
      draftAnswers: merged,
      completedAt: null,
    }, input.locale);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function ensureModuleForMapping(
  tx: Transaction,
  profile: { id: string; templateId: string | null },
  moduleDefinition: DefinitionRecord["steps"][number]["moduleDefinition"],
) {
  if (!moduleDefinition) return;
  const existing = await tx.profileModule.findUnique({
    where: {
      profileId_moduleDefinitionId_instanceKey: {
        profileId: profile.id,
        moduleDefinitionId: moduleDefinition.id,
        instanceKey: "default",
      },
    },
  });
  if (existing) return;
  const rule = profile.templateId ? await tx.profileTemplateModule.findUnique({
    where: {
      templateId_moduleDefinitionId: {
        templateId: profile.templateId,
        moduleDefinitionId: moduleDefinition.id,
      },
    },
  }) : null;
  if (!onboardingModuleCompatible({
    templateSelected: Boolean(profile.templateId),
    moduleKey: moduleDefinition.key,
    moduleAlreadyEnabled: false,
    explicitTemplateRule: rule,
  })) {
    throw new OnboardingError("ONBOARDING_MODULE_INCOMPATIBLE", 409);
  }
  await tx.profileModule.create({
    data: {
      profileId: profile.id,
      moduleDefinitionId: moduleDefinition.id,
      visibility: ProfileModuleVisibility.ONLY_ME,
      sortOrder: rule?.defaultSortOrder || 0,
      configurationVersion: moduleDefinition.schemaVersion,
      configuration: rule?.defaultConfiguration || undefined,
    },
  });
}

/**
 * A step is a UI grouping, while moduleDefinition is the installable domain
 * capability.  Resolve the latter only from answered questions; never from a
 * step key or from an empty optional step.
 */
export function desiredOnboardingModules(
  definition: DefinitionRecord,
  answers: OnboardingAnswers,
) {
  const byId = new Map<string, NonNullable<DefinitionRecord["steps"][number]["moduleDefinition"]>>();
  for (const step of definition.steps) {
    if (!step.moduleDefinition || !step.questions.some((question) => hasAnswer(answers[question.key]))) continue;
    byId.set(step.moduleDefinition.id, step.moduleDefinition);
  }
  return [...byId.values()];
}

async function validateDesiredOnboardingModules(
  tx: Transaction,
  profile: { id: string; templateId: string | null },
  desiredModules: ReturnType<typeof desiredOnboardingModules>,
) {
  if (!desiredModules.length) return;
  const moduleIds = desiredModules.map((module) => module.id);
  const [installed, rules] = await Promise.all([
    tx.profileModule.findMany({
      where: { profileId: profile.id, moduleDefinitionId: { in: moduleIds }, instanceKey: "default" },
      select: { moduleDefinitionId: true },
    }),
    profile.templateId
      ? tx.profileTemplateModule.findMany({
        where: { templateId: profile.templateId, moduleDefinitionId: { in: moduleIds } },
        select: { moduleDefinitionId: true, allowed: true },
      })
      : Promise.resolve([]),
  ]);
  const installedIds = new Set(installed.map((module) => module.moduleDefinitionId));
  const rulesByModuleId = new Map(rules.map((rule) => [rule.moduleDefinitionId, rule]));
  for (const moduleDefinition of desiredModules) {
    if (!onboardingModuleCompatible({
      templateSelected: Boolean(profile.templateId),
      moduleKey: moduleDefinition.key,
      moduleAlreadyEnabled: installedIds.has(moduleDefinition.id),
      explicitTemplateRule: rulesByModuleId.get(moduleDefinition.id),
    })) {
      throw new OnboardingError("ONBOARDING_MODULE_INCOMPATIBLE", 409);
    }
  }
}

const textAnswer = (answers: OnboardingAnswers, key: string) => {
  const value = answers[key];
  return typeof value === "string" ? value.trim() : "";
};

async function applyMapping(
  tx: Transaction,
  input: {
    userId: string;
    locale: Locale;
    profile: Awaited<ReturnType<typeof primaryProfile>>;
    definition: DefinitionRecord;
    answers: OnboardingAnswers;
    initialAnswers: OnboardingAnswers;
  },
) {
  for (const step of input.definition.steps) {
    for (const question of step.questions) {
      const answer = input.answers[question.key];
      if (!hasAnswer(answer)) continue;
      await ensureModuleForMapping(tx, input.profile, step.moduleDefinition);
      const value = textAnswer(input.answers, question.key);
      const initialValue = textAnswer(input.initialAnswers, question.key);
      switch (question.mappingKey) {
        case "PROFILE_DISPLAY_NAME":
          if (shouldApplyOnboardingText(input.profile.displayName, initialValue, value)) {
            await tx.profile.update({ where: { id: input.profile.id }, data: { displayName: value } });
          }
          break;
        case "ABOUT_BIO": {
          const existing = input.locale === "ar" ? input.profile.bioAr || input.profile.bio : input.profile.bioEn || input.profile.bio;
          if (shouldApplyOnboardingText(existing, initialValue, value)) await tx.profile.update({
              where: { id: input.profile.id },
              data: {
                bio: preserveExistingText(null, value),
                bioAr: input.locale === "ar" ? value : undefined,
                bioEn: input.locale === "en" ? value : undefined,
                showBio: false,
              },
            });
          break;
        }
        case "CONTACT_PHONE":
          if (shouldApplyOnboardingText(input.profile.phone, initialValue, value)) await tx.profile.update({ where: { id: input.profile.id }, data: { phone: value, showPhone: false } });
          break;
        case "CONTACT_EMAIL":
          if (shouldApplyOnboardingText(input.profile.email, initialValue, value)) await tx.profile.update({ where: { id: input.profile.id }, data: { email: value, showEmail: false } });
          break;
        case "CONTACT_LOCATION":
          if (shouldApplyOnboardingText(input.locale === "ar" ? input.profile.addressAr || input.profile.locationText : input.profile.addressEn || input.profile.locationText, initialValue, value)) {
            await tx.profile.update({
              where: { id: input.profile.id },
              data: {
                locationText: value,
                addressAr: input.locale === "ar" ? value : undefined,
                addressEn: input.locale === "en" ? value : undefined,
                showLocation: false,
              },
            });
          }
          break;
        case "JOB_TITLE":
          if (shouldApplyOnboardingText(input.locale === "ar" ? input.profile.jobTitleAr || input.profile.title : input.profile.jobTitleEn || input.profile.title, initialValue, value)) {
            await tx.profile.update({
              where: { id: input.profile.id },
              data: {
                title: value,
                jobTitleAr: input.locale === "ar" ? value : undefined,
                jobTitleEn: input.locale === "en" ? value : undefined,
                showTitle: false,
              },
            });
          }
          break;
        case "ORGANIZATION_NAME":
          if (shouldApplyOnboardingText(input.locale === "ar" ? input.profile.organizationNameAr || input.profile.company : input.profile.organizationNameEn || input.profile.company, initialValue, value)) {
            await tx.profile.update({
              where: { id: input.profile.id },
              data: {
                company: value,
                organizationNameAr: input.locale === "ar" ? value : undefined,
                organizationNameEn: input.locale === "en" ? value : undefined,
              },
            });
          }
          break;
        case "SOCIAL_LINK": {
          const duplicate = await tx.destination.findFirst({ where: { profileId: input.profile.id, url: value } });
          if (!duplicate) await tx.destination.create({
            data: {
              userId: input.userId,
              profileId: input.profile.id,
              title: question.labelEn,
              titleEn: question.labelEn,
              titleAr: question.labelAr,
              type: DestinationType.CUSTOM_URL,
              url: value,
              isActive: true,
              isVisible: ONBOARDING_CREATED_CONTENT_IS_VISIBLE,
            },
          });
          break;
        }
        case "SERVICE_CREATE":
          if (Array.isArray(answer)) {
            for (const optionKey of answer) {
              const option = question.options.find((candidate) => candidate.key === optionKey);
              if (!option) throw new OnboardingError("ONBOARDING_OPTION_INVALID");
              const duplicate = await tx.profileService.findFirst({
                where: { profileId: input.profile.id, OR: [{ nameEn: option.labelEn }, { nameAr: option.labelAr }] },
              });
              if (!duplicate) await tx.profileService.create({
                data: {
                  profileId: input.profile.id,
                  nameEn: option.labelEn,
                  nameAr: option.labelAr,
                  isVisible: ONBOARDING_CREATED_CONTENT_IS_VISIBLE,
                },
              });
            }
          }
          break;
        case "BRANCH_CREATE": {
          const duplicate = await tx.profileBranch.findFirst({
            where: { profileId: input.profile.id, OR: [{ addressEn: value }, { addressAr: value }] },
          });
          if (!duplicate) await tx.profileBranch.create({
            data: {
              profileId: input.profile.id,
              nameEn: input.profile.displayName,
              nameAr: input.profile.displayName,
              addressEn: input.locale === "en" ? value : null,
              addressAr: input.locale === "ar" ? value : null,
              isVisible: ONBOARDING_CREATED_CONTENT_IS_VISIBLE,
            },
          });
          break;
        }
        case "GALLERY_ATTACH":
          if (Array.isArray(answer)) {
            const files = await tx.profileMediaAsset.findMany({
              where: {
                id: { in: answer },
                userId: input.userId,
                profileId: input.profile.id,
                state: "DRAFT_ATTACHED",
                mimeType: { in: ["image/jpeg", "image/png", "image/webp"] },
                sizeBytes: { lte: 10_000_000 },
              },
            });
            if (files.length !== answer.length) throw new OnboardingError("ONBOARDING_MEDIA_INVALID");
          }
          break;
        case "SETUP_LATER":
          break;
      }
    }
  }
}

async function completeDynamicOnboardingInTransaction(tx: Transaction, input: {
  userId: string;
  locale: Locale;
  revision: number;
}) {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "OnboardingProgress" WHERE "userId" = ${input.userId} FOR UPDATE`);
    const progress = await tx.onboardingProgress.findUnique({
      where: { userId: input.userId },
      include: {
        definition: { include: definitionInclude },
        profile: { include: { category: true, template: true } },
      },
    });
    if (!progress?.definition || !progress.profile) {
      throw new OnboardingError("ONBOARDING_PROGRESS_UNAVAILABLE", 404);
    }
    const gate = completionGate({
      authenticatedUserId: input.userId,
      profileUserId: progress.profile.userId,
      progressCompleted: Boolean(progress.completedAt),
      progressRevision: progress.revision,
      requestedRevision: input.revision,
      progressDefinitionId: progress.definitionId,
      progressDefinitionVersion: progress.definitionVersion,
      definitionId: progress.definition.id,
      definitionVersion: progress.definition.version,
      definitionStatus: progress.definition.status,
      profileKind: progress.profile.profileKind,
      definitionProfileKind: progress.definition.profileKind,
      profileCategoryId: progress.profile.categoryId,
      definitionCategoryId: progress.definition.categoryId,
      profileTemplateId: progress.profile.templateId,
      definitionTemplateId: progress.definition.templateId,
    });
    if (gate.kind === "IDEMPOTENT") return progressResponse(progress.definition, progress, input.locale);
    if (gate.kind === "ERROR") throw new OnboardingError(gate.error, gate.error.includes("FORBIDDEN") ? 403 : 409);
    const answers = answersFrom(progress.draftAnswers);
    const contract = serializeOnboardingDefinition(progress.definition, input.locale);
    const errors = validateAnswerPayload(contract, answers, { complete: true });
    if (hasValidationErrors(errors)) throw new OnboardingError("ONBOARDING_VALIDATION_FAILED", 422, errors);
    const desiredModules = desiredOnboardingModules(progress.definition, answers);
    await validateDesiredOnboardingModules(tx, progress.profile, desiredModules);
    await applyMapping(tx, {
      userId: input.userId,
      locale: input.locale,
      profile: progress.profile,
      definition: progress.definition,
      answers,
      initialAnswers: answersFrom(progress.initialAnswers),
    });
    const completedAt = new Date();
    const updated = await tx.onboardingProgress.updateMany({
      where: { id: progress.id, revision: input.revision, completedAt: null },
      data: {
        completedAt,
        currentStep: contract.steps.length,
        revision: { increment: 1 },
        draftAnswers: {} as Prisma.InputJsonValue,
        initialAnswers: {} as Prisma.InputJsonValue,
      },
    });
    if (updated.count !== 1) throw new OnboardingError("ONBOARDING_PROGRESS_STALE", 409);
    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        operation: "onboarding.dynamic.completed",
        targetId: progress.profile.id,
        metadata: { definitionKey: progress.definition.key, definitionVersion: progress.definition.version },
      },
    });
    return progressResponse(progress.definition, {
      revision: input.revision + 1,
      currentStepKey: progress.currentStepKey,
      draftAnswers: {},
      completedAt,
    }, input.locale);
}

export async function completeDynamicOnboarding(input: {
  userId: string;
  locale: Locale;
  revision: number;
}) {
  return prisma.$transaction(
    (tx) => completeDynamicOnboardingInTransaction(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export { completeDynamicOnboardingInTransaction };
