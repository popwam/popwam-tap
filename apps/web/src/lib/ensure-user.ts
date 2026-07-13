import { prisma, OrgRole } from "@popwam/db";

export async function ensureUserDefaults(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const slugBase = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user";
  const slug = `${slugBase}-${user.id.slice(-6)}`;
  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug },
      update: {},
      create: { name: `${user.name || slugBase}'s workspace`, slug, ownerId: user.id },
    });
    await tx.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: {},
      create: { organizationId: organization.id, userId: user.id, role: OrgRole.OWNER },
    });
    const profile = await tx.profile.findFirst({ where: { userId: user.id, organizationId: null } });
    if (!profile) await tx.profile.create({ data: { userId: user.id, displayName: user.name || user.email.split("@")[0], email: user.email } });
  });
}
