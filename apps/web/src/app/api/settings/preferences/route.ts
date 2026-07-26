import { prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { parseSettingsPatch } from "@/lib/settings-policy";
import { nearbyStatus } from "@/lib/nearby-domain";

async function projection(userId: string) {
  const [preference, user, primary, blockedUsers] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId }, select: { theme: true, language: true, font: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { shareActivityIdentity: true, locale: true } }),
    prisma.profile.findFirst({ where: { userId, isPrimary: true, lifecycle: { not: "ARCHIVED" } }, select: { access: true } }),
    prisma.userBlock.count({ where: { ownerId: userId } }),
  ]);
  const nearby = await nearbyStatus(userId, user?.locale === "ar" ? "ar" : "en");
  return {
    theme: preference?.theme || "SYSTEM",
    language: preference?.language || "SYSTEM",
    font: preference?.font || "DEFAULT",
    privacy: {
      shareActivityIdentity: user?.shareActivityIdentity || false,
      profileVisibility: primary?.access || "PRIVATE",
      blockedUsers,
      nearby: { enabled: nearby.preference.enabled, available: nearby.feature.available, stage: nearby.stage },
    },
    ownership: {
      theme: "LOCAL_WITH_SERVER_DEFAULT",
      language: "SERVER_WITH_LOCAL_FALLBACK",
      font: "LOCAL_WITH_SERVER_DEFAULT",
      privacy: "POSTGRESQL",
      osPermissions: "DEVICE_ONLY",
    },
  };
}

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  return Response.json({ ok: true, ...(await projection(user.id)) }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const patch = parseSettingsPatch(await request.json().catch(() => null));
  if (!patch || !Object.keys(patch).length) return Response.json({ ok: false, error: "SETTINGS_INVALID" }, { status: 422 });
  const { shareActivityIdentity, ...preference } = patch;
  await prisma.$transaction(async tx => {
    if (Object.keys(preference).length) {
      await tx.userPreference.upsert({ where: { userId: user.id }, update: preference, create: { userId: user.id, ...preference } });
      if (preference.language) await tx.user.update({ where: { id: user.id }, data: { locale: preference.language === "ARABIC" ? "ar" : preference.language === "ENGLISH" ? "en" : null } });
    }
    if (shareActivityIdentity !== undefined) await tx.user.update({ where: { id: user.id }, data: { shareActivityIdentity } });
    await tx.auditLog.create({ data: { actorId: user.id, operation: "settings.preferences.updated", metadata: { categories: Object.keys(patch).sort() } } });
  });
  return Response.json({ ok: true, ...(await projection(user.id)) }, { headers: { "cache-control": "no-store" } });
}
