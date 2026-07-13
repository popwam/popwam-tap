import { prisma } from "@popwam/db";

export const LIMIT_KEYS = ["maxProfiles", "maxLinks", "maxCustomFields", "maxTags", "maxCards", "maxUploads", "maxFiles", "maxStorageBytes"] as const;
export const FEATURE_KEYS = ["allowCustomSlug", "customSlugAllowed", "allowThemes", "allowCustomTheme", "allowAnalytics", "analyticsAllowed", "allowFileUploads", "allowCustomIcons"] as const;
export const CATALOG_KEYS = ["availableProfileTypes", "availableThemes"] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function mergeEntitlements<T extends Record<string, unknown>, U extends Record<string, unknown>>(plan: T, override?: U | null) {
  const result = { ...plan } as T & U;
  if (override) for (const key of [...LIMIT_KEYS, ...FEATURE_KEYS, ...CATALOG_KEYS]) if (override[key] !== null && override[key] !== undefined) Object.assign(result, { [key]: override[key] });
  return result;
}

export async function getUserEntitlements(userId: string) {
  const [subscription, override] = await Promise.all([
    prisma.userPlan.findFirst({ where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, orderBy: { startsAt: "desc" }, include: { plan: true } }),
    prisma.userLimitOverride.findUnique({ where: { userId } }),
  ]);
  const plan = subscription?.plan || await prisma.plan.findUnique({ where: { slug: "free" } });
  if (!plan) throw new Error("PLAN_NOT_CONFIGURED");
  return { subscription, override, plan, effective: mergeEntitlements(plan, override) };
}

export async function getUserUsage(userId: string) {
  const [profiles, links, customFields, tags, cards, uploads, storage] = await Promise.all([
    prisma.profile.count({ where: { userId } }), prisma.destination.count({ where: { userId } }),
    prisma.profileField.count({ where: { userId } }), prisma.tag.count({ where: { ownerId: userId } }), prisma.card.count({ where: { ownerId: userId } }),
    prisma.uploadedFile.count({ where: { uploaderUserId: userId } }),
    prisma.uploadedFile.aggregate({ where: { uploaderUserId: userId }, _sum: { sizeBytes: true } }),
  ]);
  return { profiles, links, customFields, tags, cards, uploads, files: uploads, storageBytes: storage._sum.sizeBytes || 0n };
}

export async function assertWithinLimit(userId: string, resource: "profiles" | "links" | "customFields" | "tags" | "cards" | "uploads" | "files", increment = 1) {
  const [{ effective }, usage] = await Promise.all([getUserEntitlements(userId), getUserUsage(userId)]);
  const key = ({ profiles: "maxProfiles", links: "maxLinks", customFields: "maxCustomFields", tags: "maxTags", cards: "maxCards", uploads: "maxUploads", files: "maxFiles" } as const)[resource];
  if (usage[resource] + increment > Number(effective[key])) throw new Error(`LIMIT_REACHED:${resource}`);
  return { effective, usage };
}
