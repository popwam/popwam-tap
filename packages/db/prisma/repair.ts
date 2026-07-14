import { DestinationType, OrgRole, PrismaClient, SubscriptionStatus } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), "../../.env"), quiet: true });
const prisma = new PrismaClient();
const plans = [
  { name:"Free",nameEn:"Free",nameAr:"مجانية",slug:"free",sortOrder:10,maxProfiles:1,maxVirtualCards:1,maxLinks:5,maxCustomFields:3,maxTags:1,maxCards:1,maxUploads:0,maxFiles:0,maxStorageBytes:0n,allowCustomSlug:false,customSlugAllowed:false,allowThemes:false,allowCustomTheme:false,allowAnalytics:false,analyticsAllowed:false,allowFileUploads:false,allowCustomIcons:false,allowBusinessCards:false,allowWalletPasses:false,allowCustomLinks:false,availableProfileTypes:["PERSONAL"],availableThemes:["CLASSIC_DARK"] },
  { name:"Personal",nameEn:"Personal",nameAr:"شخصية",slug:"personal",sortOrder:20,maxProfiles:2,maxVirtualCards:2,maxLinks:15,maxCustomFields:10,maxTags:2,maxCards:2,maxUploads:10,maxFiles:10,maxStorageBytes:52428800n,allowCustomSlug:true,customSlugAllowed:true,allowThemes:true,allowCustomTheme:false,allowAnalytics:true,analyticsAllowed:true,allowFileUploads:true,allowCustomIcons:false,allowBusinessCards:false,allowWalletPasses:true,allowCustomLinks:false,availableProfileTypes:["PERSONAL"],availableThemes:["CLASSIC_DARK","CLASSIC_LIGHT"] },
  { name:"Pro",nameEn:"Pro",nameAr:"احترافية",slug:"pro",sortOrder:30,maxProfiles:3,maxVirtualCards:3,maxLinks:50,maxCustomFields:30,maxTags:5,maxCards:5,maxUploads:50,maxFiles:50,maxStorageBytes:524288000n,allowCustomSlug:true,customSlugAllowed:true,allowThemes:true,allowCustomTheme:true,allowAnalytics:true,analyticsAllowed:true,allowFileUploads:true,allowCustomIcons:true,allowBusinessCards:false,allowWalletPasses:true,allowCustomLinks:true,availableProfileTypes:["PERSONAL","PROFESSIONAL","CREATOR"],availableThemes:["CLASSIC_DARK","CLASSIC_LIGHT","ELEGANT_DARK","ELEGANT_LIGHT"] },
  { name:"Business",nameEn:"Business",nameAr:"أعمال",slug:"business",sortOrder:40,maxProfiles:25,maxVirtualCards:25,maxLinks:250,maxCustomFields:100,maxTags:100,maxCards:100,maxUploads:500,maxFiles:500,maxStorageBytes:5368709120n,allowCustomSlug:true,customSlugAllowed:true,allowThemes:true,allowCustomTheme:true,allowAnalytics:true,analyticsAllowed:true,allowFileUploads:true,allowCustomIcons:true,allowBusinessCards:true,allowWalletPasses:true,allowCustomLinks:true,availableProfileTypes:["PERSONAL","PROFESSIONAL","CREATOR","BUSINESS"],availableThemes:["CLASSIC_DARK","CLASSIC_LIGHT","ELEGANT_DARK","ELEGANT_LIGHT"] },
];
const linkPlatforms = [
  { nameAr:"إنستغرام",nameEn:"Instagram",slug:"instagram",iconKey:"instagram",placeholder:"https://instagram.com/username",category:"SOCIAL",sortOrder:10 },
  { nameAr:"فيسبوك",nameEn:"Facebook",slug:"facebook",iconKey:"facebook",placeholder:"https://facebook.com/page",category:"SOCIAL",sortOrder:20 },
  { nameAr:"تيك توك",nameEn:"TikTok",slug:"tiktok",iconKey:"tiktok",placeholder:"https://tiktok.com/@username",category:"SOCIAL",sortOrder:30 },
  { nameAr:"لينكدإن",nameEn:"LinkedIn",slug:"linkedin",iconKey:"linkedin",placeholder:"https://linkedin.com/in/username",category:"PROFESSIONAL",sortOrder:40 },
  { nameAr:"جيت هب",nameEn:"GitHub",slug:"github",iconKey:"github",placeholder:"https://github.com/username",category:"PROFESSIONAL",sortOrder:50 },
  { nameAr:"واتساب",nameEn:"WhatsApp",slug:"whatsapp",iconKey:"whatsapp",placeholder:"https://wa.me/201000000000",category:"MESSAGING",sortOrder:60 },
  { nameAr:"الموقع الإلكتروني",nameEn:"Website",slug:"website",iconKey:"website",placeholder:"https://example.com",category:"WEB",sortOrder:70,allowCustomLabel:true },
];
const profileTemplates = [
  { nameAr:"بسيط",nameEn:"Minimal",slug:"minimal",category:"Minimal",minimumPlan:"free",sortOrder:10,configuration:{background:"#111313",panel:"#191c1c",text:"#f5f5f5",muted:"#a3a3a3",accent:"#55d6a5",radius:"1.25rem",linkLayout:"list"} },
  { nameAr:"احترافي",nameEn:"Professional",slug:"professional",category:"Professional",minimumPlan:"personal",sortOrder:20,configuration:{background:"#101419",panel:"#18202a",text:"#f8fafc",muted:"#9ca3af",accent:"#68d5ad",radius:"1rem",linkLayout:"compact"} },
  { nameAr:"صانع محتوى",nameEn:"Creator",slug:"creator",category:"Creator",minimumPlan:"personal",sortOrder:30,configuration:{background:"#171119",panel:"#281c2b",text:"#fff7fb",muted:"#c9b5c6",accent:"#f29ac1",radius:"2rem",linkLayout:"grid"} },
  { nameAr:"أنيق",nameEn:"Elegant",slug:"elegant",category:"Elegant",minimumPlan:"pro",sortOrder:40,configuration:{background:"#15120d",panel:"#241e16",text:"#fffaf0",muted:"#c5baa6",accent:"#e4b86a",radius:"2rem",linkLayout:"list"} },
  { nameAr:"معرض أعمال",nameEn:"Portfolio",slug:"portfolio",category:"Portfolio",minimumPlan:"pro",sortOrder:50,configuration:{background:"#0f1215",panel:"#171c21",text:"#f4f7fa",muted:"#9ba8b4",accent:"#8bd0de",radius:"0.75rem",linkLayout:"grid"} },
  { nameAr:"أعمال",nameEn:"Business",slug:"business",category:"Business",minimumPlan:"business",sortOrder:60,configuration:{background:"#111313",panel:"#1a1d1d",text:"#ffffff",muted:"#a4aaaa",accent:"#64d8ae",radius:"0.75rem",linkLayout:"compact"} },
];
async function main() {
  for (const plan of plans) await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  for (const platform of linkPlatforms) await prisma.linkPlatform.upsert({ where: { slug: platform.slug }, update: platform, create: platform });
  for (const template of profileTemplates) await prisma.profileTemplate.upsert({ where: { slug: template.slug }, update: template, create: template });
  const free = await prisma.plan.findUniqueOrThrow({ where: { slug: "free" } }); const users = await prisma.user.findMany(); let repaired = 0;
  for (const user of users) await prisma.$transaction(async tx => {
    const base = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g,"-") || "user"; const slug = `${base}-${user.id.slice(-6)}`;
    const organization = await tx.organization.upsert({ where: { slug }, update: { ownerId: user.id }, create: { name: `${user.name || base}'s workspace`, slug, ownerId: user.id } });
    await tx.membership.upsert({ where: { organizationId_userId: { organizationId: organization.id, userId: user.id } }, update: { role: OrgRole.OWNER }, create: { organizationId: organization.id, userId: user.id, role: OrgRole.OWNER } });
    let profile = await tx.profile.findFirst({ where: { userId: user.id, organizationId: null } }); if (!profile) profile = await tx.profile.create({ data: { userId: user.id, displayName: user.name || base, email: user.email } });
    await tx.virtualCard.upsert({ where: { profileId: profile.id }, update: {}, create: { userId: user.id, organizationId: profile.organizationId, name: profile.displayName, type: profile.type === "ORGANIZATION" ? "BUSINESS" : "PERSONAL", profileId: profile.id, isDefault: true } });
    const profileDestination = await tx.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: DestinationType.PROFILE } }); if (!profileDestination) await tx.destination.create({ data: { userId: user.id, profileId: profile.id, title: "Public profile", type: DestinationType.PROFILE, url: `/p/id/${profile.id}`, iconKey: "profile" } });
    const active = await tx.userPlan.findFirst({ where: { userId: user.id, status: SubscriptionStatus.ACTIVE } }); if (!active) await tx.userPlan.create({ data: { userId: user.id, planId: free.id } }); repaired++;
  });
  console.info(`Repair complete: ${repaired} users checked. Existing records were not duplicated.`);
}
main().catch(error => { console.error("Repair failed", error instanceof Error ? error.message : "Unknown error"); process.exit(1); }).finally(() => prisma.$disconnect());
