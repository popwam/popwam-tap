import { PrismaClient, DestinationType, OrgRole, SystemRole, TagMode, TagStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

const prisma = new PrismaClient();

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

async function upsertUser(email: string, password: string, role: SystemRole, name: string) {
  const rounds = Math.max(10, Number(process.env.BCRYPT_SALT_ROUNDS || 12));
  const passwordHash = await bcrypt.hash(password, rounds);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
  });
}

async function ensurePersonalWorkspace(user: { id: string; name: string | null; email: string }) {
  const slugBase = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const organization = await prisma.organization.upsert({
    where: { slug: `${slugBase}-${user.id.slice(-6)}` },
    update: { ownerId: user.id },
    create: { name: `${user.name || slugBase}'s workspace`, slug: `${slugBase}-${user.id.slice(-6)}`, ownerId: user.id },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: OrgRole.OWNER },
    create: { organizationId: organization.id, userId: user.id, role: OrgRole.OWNER },
  });
  return organization;
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@popwam.com").toLowerCase();
  const demoEmail = (process.env.DEMO_USER_EMAIL || "mmdoh@popwam.com").toLowerCase();
  const admin = await upsertUser(adminEmail, process.env.ADMIN_PASSWORD || "ChangeMe123!", SystemRole.ADMIN, "POPWAM Admin");
  const demo = await upsertUser(demoEmail, process.env.DEMO_USER_PASSWORD || "ChangeMe123!", SystemRole.USER, "mamdouh mmdouh saad");
  const adminOrg = await ensurePersonalWorkspace(admin);
  const demoOrg = await ensurePersonalWorkspace(demo);

  const adminProfile = await prisma.profile.findFirst({ where: { userId: admin.id, organizationId: null } });
  if (!adminProfile) await prisma.profile.create({ data: { userId: admin.id, displayName: admin.name || "POPWAM Admin", email: admin.email } });

  const profile = await prisma.profile.upsert({
    where: { slug: "mamdouh" },
    update: {
      userId: demo.id, displayName: "mamdouh mmdouh saad", title: "Founder & CEO, POPWAM",
      email: demoEmail, phone: "01033662881", whatsappBusiness: "01033662881", whatsappPrivate: "01029229365",
      website: "https://mmdoh.popwam.com", vcfUrl: "https://popwam.github.io/cdm/mamdouh.vcf",
      facebook: "https://www.facebook.com/mamdouh26", linkedin: "https://www.linkedin.com/in/mmdoh-saad-375bb1233/",
      github: "https://github.com/popwam", tiktok: "https://www.tiktok.com/@mamdouh_m._saad", isPublic: true,
    },
    create: {
      userId: demo.id, slug: "mamdouh", displayName: "mamdouh mmdouh saad", title: "Founder & CEO, POPWAM",
      email: demoEmail, phone: "01033662881", whatsappBusiness: "01033662881", whatsappPrivate: "01029229365",
      website: "https://mmdoh.popwam.com", vcfUrl: "https://popwam.github.io/cdm/mamdouh.vcf",
      facebook: "https://www.facebook.com/mamdouh26", linkedin: "https://www.linkedin.com/in/mmdoh-saad-375bb1233/",
      github: "https://github.com/popwam", tiktok: "https://www.tiktok.com/@mamdouh_m._saad", isPublic: true,
    },
  });

  const destinationData: Array<{ title: string; type: DestinationType; url: string; offline?: boolean }> = [
    { title: "Profile", type: DestinationType.PROFILE, url: `${appUrl}/p/mamdouh` },
    { title: "Save Contact VCF", type: DestinationType.VCF, url: "https://popwam.github.io/cdm/mamdouh.vcf", offline: true },
    { title: "WhatsApp Business", type: DestinationType.WHATSAPP_BUSINESS, url: "https://wa.me/201033662881" },
    { title: "WhatsApp Private", type: DestinationType.WHATSAPP_PRIVATE, url: "https://wa.me/201029229365" },
    { title: "Phone", type: DestinationType.PHONE, url: "tel:+201033662881", offline: true },
    { title: "Email", type: DestinationType.EMAIL, url: `mailto:${demoEmail}`, offline: true },
    { title: "Facebook", type: DestinationType.FACEBOOK, url: "https://www.facebook.com/mamdouh26" },
    { title: "LinkedIn", type: DestinationType.LINKEDIN, url: "https://www.linkedin.com/in/mmdoh-saad-375bb1233/" },
    { title: "GitHub", type: DestinationType.GITHUB, url: "https://github.com/popwam" },
    { title: "TikTok", type: DestinationType.TIKTOK, url: "https://www.tiktok.com/@mamdouh_m._saad" },
    { title: "Website", type: DestinationType.WEBSITE, url: "https://mmdoh.popwam.com" },
  ];
  for (const item of destinationData) {
    const existing = await prisma.destination.findFirst({ where: { userId: demo.id, title: item.title } });
    const data = { userId: demo.id, profileId: profile.id, title: item.title, type: item.type, url: item.url, isOfflineCapable: Boolean(item.offline) };
    if (existing) await prisma.destination.update({ where: { id: existing.id }, data });
    else await prisma.destination.create({ data });
  }

  await prisma.tag.upsert({
    where: { token: "mamdouh" },
    update: { ownerId: demo.id, profileId: profile.id, name: "Mamdouh Main Smart Card" },
    create: { token: "mamdouh", name: "Mamdouh Main Smart Card", mode: TagMode.PROFILE, status: TagStatus.ACTIVE, ownerId: demo.id, profileId: profile.id },
  });
  console.info(`Seed complete: ${admin.email}, ${demo.email}; workspaces ${adminOrg.slug}, ${demoOrg.slug}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
