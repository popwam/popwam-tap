import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

const prisma = new PrismaClient();
const CORE_MODULES = new Set(["IDENTITY", "ABOUT", "CONTACT", "LINKS"]);
const write = process.argv.includes("--write");

function answered(value: unknown) {
  return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);
}

async function main() {
  if (write && process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_ONBOARDING_PROGRESS_REPAIR !== "true") {
    throw new Error("Production onboarding-progress repair is disabled. Set ALLOW_PRODUCTION_ONBOARDING_PROGRESS_REPAIR=true for an intentional write.");
  }

  const progressRecords = await prisma.onboardingProgress.findMany({
    where: { completedAt: null, definitionId: { not: null }, profileId: { not: null } },
    select: {
      id: true,
      definitionVersion: true,
      draftAnswers: true,
      definition: {
        select: {
          id: true,
          key: true,
          version: true,
          templateId: true,
          steps: { orderBy: { sortOrder: "asc" }, select: { moduleDefinition: { select: { id: true, key: true } }, questions: { select: { key: true } } } },
        },
      },
      profile: {
        select: {
          id: true,
          templateId: true,
          template: { select: { profileKind: true, moduleRules: { select: { moduleDefinitionId: true, allowed: true } } } },
          modules: { select: { moduleDefinitionId: true } },
        },
      },
    },
  });

  let compatible = 0;
  const repairable: Array<{ progressId: string; profileId: string }> = [];
  for (const progress of progressRecords) {
    const definition = progress.definition;
    const profile = progress.profile;
    if (!definition || !profile) continue;
    const answers = progress.draftAnswers as Record<string, unknown>;
    const desired = new Map<string, { id: string; key: string }>();
    for (const step of definition.steps) {
      if (step.moduleDefinition && step.questions.some((question) => answered(answers[question.key]))) desired.set(step.moduleDefinition.id, step.moduleDefinition);
    }
    const installed = new Set(profile.modules.map((module) => module.moduleDefinitionId));
    const rules = new Map((profile.template?.moduleRules || []).map((rule) => [rule.moduleDefinitionId, rule.allowed]));
    const incompatible = [...desired.values()].filter((module) => !installed.has(module.id) && profile.templateId && rules.get(module.id) !== true && !CORE_MODULES.has(module.key));
    const staleLegacyTemplate = Boolean(
      incompatible.length &&
      profile.templateId &&
      definition.templateId === null &&
      profile.template?.profileKind === null &&
      profile.template.moduleRules.length === 0 &&
      progress.definitionVersion === definition.version,
    );
    if (!staleLegacyTemplate) {
      compatible += 1;
      continue;
    }
    repairable.push({ progressId: progress.id, profileId: profile.id });
  }

  if (write) {
    for (const record of repairable) {
      await prisma.$transaction(async (tx) => {
        const progress = await tx.onboardingProgress.findUniqueOrThrow({ where: { id: record.progressId }, select: { profileId: true, completedAt: true } });
        if (progress.completedAt || progress.profileId !== record.profileId) return;
        await tx.profile.update({ where: { id: record.profileId }, data: { templateId: null } });
      });
    }
  }

  console.info(`Historical onboarding records scanned: ${progressRecords.length}`);
  console.info(`Compatible: ${compatible}`);
  console.info(`Repairable stale records: ${repairable.length}`);
  for (const _record of repairable) {
    console.info("repairRequired=true reason=LEGACY_UNSCOPED_TEMPLATE_WITHOUT_MODULE_RULES");
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
