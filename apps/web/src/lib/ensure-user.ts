import { DestinationType, OrgRole, Prisma, prisma } from "@popwam/db";

export const DEFAULT_PLANS = [
  { name: "Free", slug: "free", description: "Starter plan", maxProfiles: 1, maxLinks: 5, maxCustomFields: 3, maxTags: 1, maxUploads: 0, maxStorageBytes: 0n, allowCustomSlug: false, allowThemes: false, allowCustomTheme: false, allowAnalytics: false, allowFileUploads: false },
  { name: "Personal", slug: "personal", description: "Personal digital identity", maxProfiles: 2, maxLinks: 15, maxCustomFields: 10, maxTags: 2, maxUploads: 10, maxStorageBytes: 50n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: false, allowAnalytics: true, allowFileUploads: true },
  { name: "Pro", slug: "pro", description: "Professional profile toolkit", maxProfiles: 5, maxLinks: 50, maxCustomFields: 30, maxTags: 5, maxUploads: 50, maxStorageBytes: 500n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: true, allowAnalytics: true, allowFileUploads: true },
  { name: "Business", slug: "business", description: "Teams and high-volume cards", maxProfiles: 25, maxLinks: 250, maxCustomFields: 100, maxTags: 100, maxUploads: 500, maxStorageBytes: 5n * 1024n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: true, allowAnalytics: true, allowFileUploads: true },
] as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function ensurePlans(db: DbClient = prisma) {
  for (const plan of DEFAULT_PLANS) {
    await db.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  }
}

export async function ensureUserDefaultsInTransaction(db: Prisma.TransactionClient, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  await ensurePlans(db);
  const freePlan = await db.plan.findUniqueOrThrow({ where: { slug: "free" } });
  const slugBase = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user";
  const slug = `${slugBase}-${user.id.slice(-6)}`;
  const organization = await db.organization.upsert({
    where: { slug },
    update: { ownerId: user.id },
    create: { name: `${user.name || slugBase}'s workspace`, slug, ownerId: user.id },
  });
  await db.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: OrgRole.OWNER },
    create: { organizationId: organization.id, userId: user.id, role: OrgRole.OWNER },
  });

  let profile = await db.profile.findFirst({ where: { userId: user.id, organizationId: null } });
  if (!profile) profile = await db.profile.create({ data: { userId: user.id, displayName: user.name || slugBase, email: user.email } });
  const profileDestination = await db.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE } });
  if (!profileDestination) {
    await db.destination.create({ data: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE, title: "Public profile", url: `/p/id/${profile.id}`, icon: "profile" } });
  }
  const activePlan = await db.userPlan.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
  if (!activePlan) await db.userPlan.create({ data: { userId: user.id, planId: freePlan.id } });
  return { user, organization, profile, plan: freePlan };
}

export async function ensureUserDefaults(userId: string) {
  return prisma.$transaction((tx) => ensureUserDefaultsInTransaction(tx, userId));
}
