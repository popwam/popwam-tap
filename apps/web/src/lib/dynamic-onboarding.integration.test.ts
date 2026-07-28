import { describe, expect, it } from "vitest";
import { prisma } from "@popwam/db";
import { completeDynamicOnboardingInTransaction, OnboardingError } from "./dynamic-onboarding";

const enabled = process.env.RUN_ONBOARDING_DB_INTEGRATION === "true";
const testId = `onboarding-it-${Date.now()}`;
class Rollback extends Error {}

const answers: Record<string, Record<string, string | boolean | string[]>> = {
  "personal-basic-v1": { display_name: "Integration Person", bio: "About", contact_email: "person@example.test", website_link: "https://example.test" },
  "freelancer-v1": { job_title: "Designer", bio: "About", services: ["design"], contact_email: "freelancer@example.test", website_link: "https://example.test" },
  "professional-v1": { job_title: "Consultant", bio: "About", services: ["consulting"], contact_email: "professional@example.test", website_link: "https://example.test" },
  "business-basic-v1": { business_name: "Integration Business", business_description: "About", contact_email: "business@example.test", website_link: "https://example.test" },
  "restaurant-v1": { business_name: "Integration Restaurant", has_branches: true, branch_address: "Test location", menu_later: true, contact_email: "restaurant@example.test", website_link: "https://example.test" },
  "clinic-v1": { business_name: "Integration Clinic", services: ["general"], has_branches: true, branch_address: "Test location", contact_email: "clinic@example.test", booking_later: true },
  "salon-v1": { business_name: "Integration Salon", services: ["hair"], has_branches: true, branch_address: "Test location", contact_email: "salon@example.test", booking_later: true },
};

const definitions = Object.keys(answers);

describe.runIf(enabled)("dynamic onboarding database completion (transaction rolled back)", () => {
  async function rollback(callback: (tx: Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => unknown ? T : never) => Promise<void>) {
    try {
      await prisma.$transaction(async (tx) => { await callback(tx); throw new Rollback(); }, { isolationLevel: "Serializable", timeout: 15_000 });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  }

  it.each(definitions)("completes %s through the real finalizer", async (key) => {
    await rollback(async (tx) => {
      const definition = await tx.onboardingDefinition.findFirstOrThrow({ where: { key, version: 1, status: "PUBLISHED" }, select: { id: true, key: true, profileKind: true, categoryId: true } });
      const user = await tx.user.create({ data: { email: `${testId}-${definition.key}@example.test` } });
      const profile = await tx.profile.create({ data: { userId: user.id, displayName: "Initial name", profileKind: definition.profileKind, categoryId: definition.categoryId, lifecycle: "DRAFT", isPrimary: true, isPublic: false } });
      const progress = await tx.onboardingProgress.create({ data: { userId: user.id, profileId: profile.id, definitionId: definition.id, definitionVersion: 1, revision: 1, draftAnswers: answers[definition.key], initialAnswers: {} } });
      const result = await completeDynamicOnboardingInTransaction(tx, { userId: user.id, locale: "en", revision: progress.revision });
      expect(result.state).toBe("ONBOARDING_COMPLETE");
      expect((await tx.onboardingProgress.findUniqueOrThrow({ where: { id: progress.id } })).completedAt).not.toBeNull();
    });
  }, 20_000);

  it("rejects a genuinely incompatible template module without persistence", async () => {
    await rollback(async (tx) => {
        const freelancer = await tx.onboardingDefinition.findFirstOrThrow({ where: { key: "freelancer-v1", version: 1, status: "PUBLISHED" }, select: { id: true, key: true, categoryId: true } });
        const user = await tx.user.create({ data: { email: `${testId}-incompatible@example.test` } });
        const template = await tx.profileTemplate.create({
          data: { slug: `${testId}-empty-template`, nameEn: "Empty test template", nameAr: "قالب اختبار", category: "test", minimumPlan: "FREE", configuration: {} },
        });
        const profile = await tx.profile.create({
          data: { userId: user.id, displayName: "Initial name", profileKind: "PERSONAL", categoryId: freelancer.categoryId, templateId: template.id, lifecycle: "DRAFT", isPrimary: true, isPublic: false },
        });
        const progress = await tx.onboardingProgress.create({
          data: { userId: user.id, profileId: profile.id, definitionId: freelancer.id, definitionVersion: 1, revision: 1, draftAnswers: answers[freelancer.key], initialAnswers: {} },
        });
        await expect(completeDynamicOnboardingInTransaction(tx, { userId: user.id, locale: "en", revision: 1 }))
          .rejects.toMatchObject({ message: "ONBOARDING_MODULE_INCOMPATIBLE", status: 409 } satisfies Partial<OnboardingError>);
        const after = await tx.onboardingProgress.findUniqueOrThrow({ where: { id: progress.id } });
        expect(after.completedAt).toBeNull();
        expect(after.draftAnswers).toEqual(answers[freelancer.key]);
        expect(await tx.profileModule.count({ where: { profileId: profile.id } })).toBe(0);
    });
  }, 20_000);
});
