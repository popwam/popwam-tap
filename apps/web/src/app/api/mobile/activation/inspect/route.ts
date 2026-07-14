import { prisma } from "@popwam/db";
import { createOpaqueToken, hashActivationToken, isActivationToken, normalizeActivationToken } from "@/lib/card-tokens";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";

const tokenFrom = (value: string) => {
  try { const url = new URL(value.trim()); return url.pathname.split("/").filter(Boolean).at(-1) || ""; }
  catch { return value.trim(); }
};

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();
  const body = await request.json().catch(() => ({}));
  const token = normalizeActivationToken(tokenFrom(String(body.activationValue || "")));
  if (!isActivationToken(token)) return Response.json({ ok: false, error: "ACTIVATION_INVALID" }, { status: 400 });
  const card = await prisma.card.findFirst({ where: { activationTokenHash: hashActivationToken(token), ownerId: null, assignmentStatus: "UNASSIGNED", activationTokenConsumedAt: null }, select: { id: true, serialNumber: true, publicSlug: true, cardType: true, cardStatus: true, activationTokenHash: true } });
  if (!card) return Response.json({ ok: false, error: "ACTIVATION_INVALID" }, { status: 400 });
  const attempts = await prisma.activationAttempt.count({ where: { cardId: card.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
  if (attempts >= Math.max(3, Number(process.env.ACTIVATION_MAX_ATTEMPTS || 8))) return Response.json({ ok: false, error: "ACTIVATION_RATE_LIMITED" }, { status: 429 });
  const claimToken = createOpaqueToken();
  await prisma.$transaction([
    prisma.activationAttempt.create({ data: { cardId: card.id, success: true } }),
    prisma.activationClaimSession.create({ data: { sessionTokenHash: hashActivationToken(claimToken), activationTokenHash: card.activationTokenHash, cardId: card.id, userId: user.id, status: "VERIFIED", verifiedAt: new Date(), expiresAt: new Date(Date.now() + 15 * 60_000) } }),
  ]);
  return Response.json({ ok: true, claimToken, card: { id: card.id, serialNumber: card.serialNumber, publicSlug: card.publicSlug, cardType: card.cardType, cardStatus: card.cardStatus, permanentUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://go.popwam.com").replace(/\/$/, "")}/${card.publicSlug}` } }, { headers: { "cache-control": "no-store" } });
}
