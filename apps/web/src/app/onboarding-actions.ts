"use server";

import { DestinationType, Prisma, prisma } from "@popwam/db";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertWithinLimitLocked } from "@/lib/plans";
import { mergeOnboardingData, nextOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding";
import { isSafeDestinationUrl } from "@/lib/url";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function saveOnboardingStep(data: FormData) {
  const user = await requireUser();
  const step = Math.min(ONBOARDING_STEPS, Math.max(1, Number(text(data, "step") || 1)));
  const [progress, card] = await Promise.all([
    prisma.onboardingProgress.findUnique({ where: { userId: user.id } }),
    prisma.virtualCard.findFirst({ where: { userId: user.id, isDefault: true }, include: { profile: true } }),
  ]);
  if (!card) throw new Error("DEFAULT_VIRTUAL_CARD_MISSING");
  let update: Record<string, unknown> = {};
  if (step === 1) {
    const displayName = text(data, "displayName"); if (!displayName) throw new Error("DISPLAY_NAME_REQUIRED");
    update = { displayName, preferredName: text(data, "preferredName") };
    await prisma.$transaction([prisma.user.update({ where: { id: user.id }, data: { name: displayName } }), prisma.profile.update({ where: { id: card.profileId }, data: { displayName } }), prisma.virtualCard.update({ where: { id: card.id }, data: { name: displayName } })]);
  }
  if (step === 2) {
    update = { jobTitle: text(data, "jobTitle"), profession: text(data, "profession") };
    await prisma.profile.update({ where: { id: card.profileId }, data: { title: text(data, "jobTitle") || null, industryEn: text(data, "profession") || null } });
  }
  if (step === 3) {
    update = { company: text(data, "company"), employmentType: text(data, "employmentType"), organization: text(data, "organization") };
    await prisma.profile.update({ where: { id: card.profileId }, data: { company: text(data, "company") || null } });
  }
  if (step === 4) {
    const website = text(data, "website"); if (website && !isSafeDestinationUrl(website)) throw new Error("INVALID_URL");
    update = { website };
    await prisma.profile.update({ where: { id: card.profileId }, data: { website: website || null } });
  }
  if (step === 5) {
    const avatarKind = ["UPLOADED", "GENERATED", "INITIALS"].includes(text(data, "avatarKind")) ? text(data, "avatarKind") : "INITIALS";
    update = { avatarKind, avatarValue: text(data, "avatarValue") };
    await prisma.$transaction([prisma.profile.update({ where: { id: card.profileId }, data: { avatarUrl: text(data, "avatarUrl") || card.profile.avatarUrl, avatarStorageKey: text(data, "avatarStorageKey") || card.profile.avatarStorageKey } }), prisma.virtualCard.update({ where: { id: card.id }, data: { avatarKind, avatarValue: text(data, "avatarValue") || null } })]);
  }
  if (step === 6 && data.get("skip") !== "true") {
    const platform = await prisma.linkPlatform.findFirst({ where: { id: text(data, "linkPlatformId"), isActive: true } });
    const url = text(data, "url");
    if (!platform || !isSafeDestinationUrl(url)) throw new Error("LINK_INVALID");
    if (platform.validationPattern && platform.validationPattern.length <= 200) { try { if (!new RegExp(platform.validationPattern).test(url)) throw new Error("LINK_VALIDATION_FAILED"); } catch (error) { if (error instanceof Error && error.message === "LINK_VALIDATION_FAILED") throw error; } }
    await prisma.$transaction(async tx => {
      await assertWithinLimitLocked(tx, user.id, "links");
      await tx.destination.create({ data: { userId: user.id, profileId: card.profileId, linkPlatformId: platform.id, title: platform.nameEn, titleAr: platform.nameAr, titleEn: platform.nameEn, type: DestinationType.CUSTOM_URL, url, iconKey: platform.iconKey, customIconUrl: platform.customIconUrl, isActive: true, isVisible: true, sortOrder: await tx.destination.count({ where: { profileId: card.profileId } }) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    update = { firstLinkPlatform: platform.slug };
  }
  const completed = step === ONBOARDING_STEPS;
  const nextStep = nextOnboardingStep(step, completed);
  const merged = mergeOnboardingData(progress?.data, update) as Prisma.InputJsonValue;
  await prisma.onboardingProgress.upsert({ where: { userId: user.id }, update: { currentStep: nextStep, completedAt: completed ? new Date() : null, data: merged }, create: { userId: user.id, currentStep: nextStep, completedAt: completed ? new Date() : null, data: merged } });
  redirect(completed ? "/dashboard" : `/onboarding?step=${nextStep}`);
}
