import { NextResponse } from "next/server";
import { prisma } from "@popwam/db";
import { activationTokenMatches, createOpaqueToken, hashActivationToken } from "@/lib/card-tokens";
import { ACTIVATION_COOKIE, secureCookie } from "@/lib/activation-session";

function extractToken(value: string) { const trimmed = value.trim(); try { const url = new URL(trimmed); return url.pathname.split("/").filter(Boolean).at(-1) || ""; } catch { return trimmed; } }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})); const publicSlug = String(body.publicSlug || "").trim().toLowerCase(); const token = extractToken(String(body.activationValue || ""));
  if (token.length < 32) return NextResponse.json({ ok: false, error: "ACTIVATION_INVALID" }, { status: 400 });
  const tokenHash = hashActivationToken(token);
  const target = publicSlug ? await prisma.card.findUnique({ where: { publicSlug }, select: { id: true, publicSlug: true, activationTokenHash: true, activationTokenConsumedAt: true, assignmentStatus: true, ownerId: true, cardStatus: true } }) : await prisma.card.findUnique({ where: { activationTokenHash: tokenHash }, select: { id: true, publicSlug: true, activationTokenHash: true, activationTokenConsumedAt: true, assignmentStatus: true, ownerId: true, cardStatus: true } });
  if (!target) return NextResponse.json({ ok: false, error: "ACTIVATION_INVALID" }, { status: 400 });
  if (["PAUSED", "LOST", "DISABLED", "ARCHIVED"].includes(target.cardStatus)) return NextResponse.json({ ok: false, error: "CARD_SUSPENDED" }, { status: 409 });
  if (target.ownerId || target.assignmentStatus !== "UNASSIGNED" || target.activationTokenConsumedAt) return NextResponse.json({ ok: false, error: "CARD_ALREADY_ACTIVATED" }, { status: 409 });
  const matches = activationTokenMatches(token, target.activationTokenHash);
  if (!matches) {
    const belongsToAnother = await prisma.card.findUnique({ where: { activationTokenHash: tokenHash }, select: { id: true } });
    await prisma.activationAttempt.create({ data: { cardId: target.id, success: false } });
    return NextResponse.json({ ok: false, error: belongsToAnother ? "ACTIVATION_CARD_MISMATCH" : "ACTIVATION_INVALID" }, { status: 400 });
  }
  const windowStart = new Date(Date.now() - 15 * 60_000); const attemptLimit = Math.max(3, Number(process.env.ACTIVATION_MAX_ATTEMPTS || 8));
  if (await prisma.activationAttempt.count({ where: { cardId: target.id, createdAt: { gte: windowStart } } }) >= attemptLimit) return NextResponse.json({ ok: false, error: "ACTIVATION_RATE_LIMITED" }, { status: 429 });
  const sessionToken = createOpaqueToken(); const minutes = Math.max(5, Number(process.env.ACTIVATION_SESSION_MINUTES || 15));
  const claim = await prisma.$transaction(async tx => {
    await tx.activationAttempt.create({ data: { cardId: target.id, success: true } });
    await tx.activationClaimSession.updateMany({ where: { cardId: target.id, status: { in: ["PENDING_OTP", "VERIFIED"] } }, data: { status: "EXPIRED" } });
    return tx.activationClaimSession.create({ data: { sessionTokenHash: hashActivationToken(sessionToken), activationTokenHash: target.activationTokenHash, cardId: target.id, expiresAt: new Date(Date.now() + minutes * 60_000) } });
  });
  const response = NextResponse.json({ ok: true, nextUrl: `/activate/card/${target.publicSlug}/phone`, claimId: claim.id });
  response.cookies.set(ACTIVATION_COOKIE, sessionToken, { ...secureCookie, maxAge: minutes * 60 }); return response;
}
