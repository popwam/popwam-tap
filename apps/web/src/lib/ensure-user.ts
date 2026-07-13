import { DestinationType, OrgRole, Prisma, prisma } from "@popwam/db";

export const DEFAULT_PLANS = [
  { name: "Free", nameEn: "Free", nameAr: "مجانية", slug: "free", description: "Starter plan", descriptionEn: "Starter plan", sortOrder: 10, maxProfiles: 1, maxLinks: 5, maxCustomFields: 3, maxTags: 1, maxUploads: 0, maxStorageBytes: 0n, allowCustomSlug: false, allowThemes: false, allowCustomTheme: false, allowAnalytics: false, allowFileUploads: false, allowCustomIcons: false },
  { name: "Personal", nameEn: "Personal", nameAr: "شخصية", slug: "personal", description: "Personal digital identity", descriptionEn: "Personal digital identity", sortOrder: 20, maxProfiles: 2, maxLinks: 15, maxCustomFields: 10, maxTags: 2, maxUploads: 10, maxStorageBytes: 50n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: false, allowAnalytics: true, allowFileUploads: true, allowCustomIcons: false },
  { name: "Pro", nameEn: "Pro", nameAr: "احترافية", slug: "pro", description: "Professional profile toolkit", descriptionEn: "Professional profile toolkit", sortOrder: 30, maxProfiles: 5, maxLinks: 50, maxCustomFields: 30, maxTags: 5, maxUploads: 50, maxStorageBytes: 500n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: true, allowAnalytics: true, allowFileUploads: true, allowCustomIcons: true },
  { name: "Business", nameEn: "Business", nameAr: "أعمال", slug: "business", description: "Teams and high-volume cards", descriptionEn: "Teams and high-volume cards", sortOrder: 40, maxProfiles: 25, maxLinks: 250, maxCustomFields: 100, maxTags: 100, maxUploads: 500, maxStorageBytes: 5n * 1024n * 1024n * 1024n, allowCustomSlug: true, allowThemes: true, allowCustomTheme: true, allowAnalytics: true, allowFileUploads: true, allowCustomIcons: true },
] as const;

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function ensurePlans(db: DbClient = prisma) {
  for (const plan of DEFAULT_PLANS) {
    const allThemes=["CLASSIC_DARK","CLASSIC_LIGHT","ELEGANT_DARK","ELEGANT_LIGHT","BUSINESS_DARK","BUSINESS_LIGHT"];
    const normalized={...plan,maxCards:plan.maxTags,maxFiles:plan.maxUploads,customSlugAllowed:plan.allowCustomSlug,analyticsAllowed:plan.allowAnalytics,availableProfileTypes:plan.slug==="free"||plan.slug==="personal"?["PERSONAL"]:["PERSONAL","ORGANIZATION"],availableThemes:plan.slug==="free"?["CLASSIC_DARK"]:plan.slug==="personal"?allThemes.slice(0,4):allThemes};
    await db.plan.upsert({ where: { slug: plan.slug }, update: normalized, create: normalized });
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
  if (!profile) profile = await db.profile.create({ data: { userId: user.id, displayName: user.name || slugBase, displayNameAr: user.name || slugBase, type: "PERSONAL", primaryLanguage: "ar", email: user.email } });
  const profileDestination = await db.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE } });
  if (!profileDestination) {
    await db.destination.create({ data: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE, title: "Public profile", titleAr: "الملف العام", titleEn: "Public profile", url: `/p/id/${profile.id}`, icon: "profile", iconKey: "profile" } });
  }
  const vcardDestination = await db.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: DestinationType.VCF } });
  if (!vcardDestination) await db.destination.create({ data: { userId: user.id, profileId: profile.id, type: DestinationType.VCF, title: "Save contact", titleAr: "حفظ جهة الاتصال", titleEn: "Save Contact", url: `/api/profiles/${profile.id}/contact.vcf`, icon: "contact", iconKey: "contact" } });
  const activePlan = await db.userPlan.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
  if (!activePlan) await db.userPlan.create({ data: { userId: user.id, planId: freePlan.id } });
  return { user, organization, profile, plan: freePlan };
}

export async function ensureUserDefaults(userId: string) {
  return prisma.$transaction((tx) => ensureUserDefaultsInTransaction(tx, userId));
}
