import { prisma } from "@popwam/db";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";
import { nearbyStatus } from "@/lib/nearby-domain";
import { nearbyLocale } from "@/lib/nearby-api";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const preferences = await prisma.user.findUnique({
    where: { id: user.id },
    select: { shareActivityIdentity: true, defaultSharingCardId: true },
  });
  return Response.json({
    ok: true,
    preferences: {
      ...preferences,
      nearby: await nearbyStatus(user.id, nearbyLocale(new URL(request.url).searchParams.get("locale"))),
    },
  }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const body = await request.json().catch(() => ({}));
  if ("nearby" in body || "nearbyDurationMinutes" in body || "nearbyAudience" in body) {
    return Response.json({ ok: false, error: "NEARBY_API_REQUIRED" }, { status: 422 });
  }
  const defaultSharingCardId = body.defaultSharingCardId ? String(body.defaultSharingCardId) : null;
  if (defaultSharingCardId && !await prisma.virtualCard.findFirst({
    where: { id: defaultSharingCardId, userId: user.id, status: { not: "ARCHIVED" } },
    select: { id: true },
  })) return Response.json({ ok: false, error: "SHARING_CARD_INVALID" }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        shareActivityIdentity: body.shareActivityIdentity === true,
        defaultSharingCardId,
      },
    }),
    prisma.auditLog.create({
      data: { actorId: user.id, operation: "privacy.preferences.update", metadata: { categories: ["shareActivityIdentity", "defaultSharingCard"] } },
    }),
  ]);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
