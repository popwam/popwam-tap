import { prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { parseNotificationPatch } from "@/lib/settings-policy";

const defaults = { generalEnabled: true, securityEnabled: true, productsEnabled: true, socialEnabled: true, marketingEnabled: false };

async function projection(userId: string) {
  const row = await prisma.notificationPreference.findUnique({ where: { userId }, select: { generalEnabled: true, securityEnabled: true, productsEnabled: true, socialEnabled: true, marketingEnabled: true } });
  return { ...defaults, ...row, osPermission: "DEVICE_OWNED", deliveryConfigured: false };
}

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  return Response.json({ ok: true, preferences: await projection(user.id) }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const patch = parseNotificationPatch(await request.json().catch(() => null));
  if (!patch || !Object.keys(patch).length) return Response.json({ ok: false, error: "NOTIFICATION_SETTINGS_INVALID" }, { status: 422 });
  await prisma.$transaction([
    prisma.notificationPreference.upsert({ where: { userId: user.id }, update: patch, create: { userId: user.id, ...patch } }),
    prisma.auditLog.create({ data: { actorId: user.id, operation: "settings.notifications.updated", metadata: { categories: Object.keys(patch).sort() } } }),
  ]);
  return Response.json({ ok: true, preferences: await projection(user.id) }, { headers: { "cache-control": "no-store" } });
}
