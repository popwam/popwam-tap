import { DestinationType, Prisma, prisma } from "@popwam/db";

export const LIMIT_KEYS = ["maxProfiles", "maxVirtualCards", "maxLinks", "maxCustomFields", "maxTags", "maxCards", "maxUploads", "maxFiles", "maxStorageBytes"] as const;
export const FEATURE_KEYS = ["allowCustomSlug", "customSlugAllowed", "allowThemes", "allowCustomTheme", "allowAnalytics", "analyticsAllowed", "allowFileUploads", "allowCustomIcons", "allowBusinessCards", "allowWalletPasses", "allowCustomLinks", "allowInstallableProfiles"] as const;
export const CATALOG_KEYS = ["availableProfileTypes", "availableThemes"] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];
export type FeatureKey = (typeof FEATURE_KEYS)[number];

const CORE_CONTACT_DESTINATION_TYPE_LIST: DestinationType[] = ["PROFILE", "PHONE", "EMAIL", "WEBSITE", "WHATSAPP_BUSINESS", "WHATSAPP_PRIVATE", "VCF"];
const CORE_CONTACT_DESTINATION_TYPES = new Set<string>(CORE_CONTACT_DESTINATION_TYPE_LIST);
export function countsTowardLinkLimit(type: string) { return !CORE_CONTACT_DESTINATION_TYPES.has(type); }
const EXTRA_LINK_FILTER = { type: { notIn: CORE_CONTACT_DESTINATION_TYPE_LIST } } as const;

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
  const [profiles, virtualCards, links, customFields, tags, cards, uploads, storage] = await Promise.all([
    prisma.profile.count({ where: { userId } }),
    prisma.virtualCard.count({ where: { userId, status: { not: "ARCHIVED" } } }),
    prisma.destination.count({ where: { userId, ...EXTRA_LINK_FILTER } }),
    prisma.profileField.count({ where: { userId } }), prisma.tag.count({ where: { ownerId: userId } }), prisma.card.count({ where: { ownerId: userId } }),
    prisma.uploadedFile.count({ where: { uploaderUserId: userId } }),
    prisma.uploadedFile.aggregate({ where: { uploaderUserId: userId }, _sum: { sizeBytes: true } }),
  ]);
  return { profiles, virtualCards, links, customFields, tags, cards, uploads, files: uploads, storageBytes: storage._sum.sizeBytes || 0n };
}

export async function assertWithinLimit(userId: string, resource: LimitedResource, increment = 1) {
  const [{ effective }, usage] = await Promise.all([getUserEntitlements(userId), getUserUsage(userId)]);
  const key = ({ profiles: "maxProfiles", virtualCards: "maxVirtualCards", links: "maxLinks", customFields: "maxCustomFields", tags: "maxTags", cards: "maxCards", uploads: "maxUploads", files: "maxFiles" } as const)[resource];
  if (usage[resource] + increment > Number(effective[key])) throw new Error(`LIMIT_REACHED:${resource}`);
  return { effective, usage };
}

export type LimitedResource = "profiles" | "virtualCards" | "links" | "customFields" | "tags" | "cards" | "uploads" | "files";

/**
 * Enforce a limit while holding the owning User row lock. Creation must happen
 * in the same transaction so concurrent direct API calls cannot exceed a plan.
 */
export async function assertWithinLimitLocked(tx: Prisma.TransactionClient, userId: string, resource: LimitedResource, increment = 1) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
  const now = new Date();
  const [subscription, override] = await Promise.all([
    tx.userPlan.findFirst({ where: { userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: { startsAt: "desc" }, include: { plan: true } }),
    tx.userLimitOverride.findUnique({ where: { userId } }),
  ]);
  const plan = subscription?.plan || await tx.plan.findUnique({ where: { slug: "free" } });
  if (!plan) throw new Error("PLAN_NOT_CONFIGURED");
  const effective = mergeEntitlements(plan, override);
  const used = resource === "profiles" ? await tx.profile.count({ where: { userId } })
    : resource === "virtualCards" ? await tx.virtualCard.count({ where: { userId, status: { not: "ARCHIVED" } } })
    : resource === "links" ? await tx.destination.count({ where: { userId, ...EXTRA_LINK_FILTER } })
    : resource === "customFields" ? await tx.profileField.count({ where: { userId } })
    : resource === "tags" ? await tx.tag.count({ where: { ownerId: userId } })
    : resource === "cards" ? await tx.card.count({ where: { ownerId: userId } })
    : await tx.uploadedFile.count({ where: { uploaderUserId: userId } });
  const key = ({ profiles: "maxProfiles", virtualCards: "maxVirtualCards", links: "maxLinks", customFields: "maxCustomFields", tags: "maxTags", cards: "maxCards", uploads: "maxUploads", files: "maxFiles" } as const)[resource];
  if (used + increment > Number(effective[key])) throw new Error(`LIMIT_REACHED:${resource}`);
  return { effective, used, plan };
}
