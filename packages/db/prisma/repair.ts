import { DestinationType, OrgRole, PrismaClient, SubscriptionStatus } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
const prisma = new PrismaClient();
const plans = [
  { name:"Free",slug:"free",maxProfiles:1,maxLinks:5,maxCustomFields:3,maxTags:1,maxUploads:0,maxStorageBytes:0n,allowCustomSlug:false,allowThemes:false,allowCustomTheme:false,allowAnalytics:false,allowFileUploads:false },
  { name:"Personal",slug:"personal",maxProfiles:2,maxLinks:15,maxCustomFields:10,maxTags:2,maxUploads:10,maxStorageBytes:52428800n,allowCustomSlug:true,allowThemes:true,allowCustomTheme:false,allowAnalytics:true,allowFileUploads:true },
  { name:"Pro",slug:"pro",maxProfiles:5,maxLinks:50,maxCustomFields:30,maxTags:5,maxUploads:50,maxStorageBytes:524288000n,allowCustomSlug:true,allowThemes:true,allowCustomTheme:true,allowAnalytics:true,allowFileUploads:true },
  { name:"Business",slug:"business",maxProfiles:25,maxLinks:250,maxCustomFields:100,maxTags:100,maxUploads:500,maxStorageBytes:5368709120n,allowCustomSlug:true,allowThemes:true,allowCustomTheme:true,allowAnalytics:true,allowFileUploads:true },
];
async function main() {
  for (const plan of plans) await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  const free = await prisma.plan.findUniqueOrThrow({ where: { slug: "free" } }); const users = await prisma.user.findMany(); let repaired = 0;
  for (const user of users) await prisma.$transaction(async tx => {
    const base = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g,"-") || "user"; const slug = `${base}-${user.id.slice(-6)}`;
    const organization = await tx.organization.upsert({ where: { slug }, update: { ownerId: user.id }, create: { name: `${user.name || base}'s workspace`, slug, ownerId: user.id } });
    await tx.membership.upsert({ where: { organizationId_userId: { organizationId: organization.id, userId: user.id } }, update: { role: OrgRole.OWNER }, create: { organizationId: organization.id, userId: user.id, role: OrgRole.OWNER } });
    let profile = await tx.profile.findFirst({ where: { userId: user.id, organizationId: null } }); if (!profile) profile = await tx.profile.create({ data: { userId: user.id, displayName: user.name || base, email: user.email } });
    const profileDestination = await tx.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE } }); if (!profileDestination) await tx.destination.create({ data: { userId: user.id, profileId: profile.id, title: "Public profile", type: DestinationType.PROFILE, url: `/p/id/${profile.id}`, iconKey: "profile" } });
    const active = await tx.userPlan.findFirst({ where: { userId: user.id, status: SubscriptionStatus.ACTIVE } }); if (!active) await tx.userPlan.create({ data: { userId: user.id, planId: free.id } }); repaired++;
  });
  console.info(`Repair complete: ${repaired} users checked. Existing records were not duplicated.`);
}
main().catch(error => { console.error("Repair failed", error instanceof Error ? error.message : "Unknown error"); process.exit(1); }).finally(() => prisma.$disconnect());
