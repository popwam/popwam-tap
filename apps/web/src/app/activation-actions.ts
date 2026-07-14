"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@popwam/db";
import { requireUser } from "@/lib/session";
import { getActivationClaim, ACTIVATION_COOKIE, secureCookie } from "@/lib/activation-session";
import { createOpaqueToken, hashActivationToken } from "@/lib/card-tokens";

function isWriteConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

async function claimCardOnce(input: {
  claimId: string;
  userId: string;
  profileId: string | null;
  destinationId: string | null;
}) {
  return prisma.$transaction(async tx => {
    // Serialize claims per account. The entitlement and usage must be read
    // after this lock or concurrent browser requests could exceed maxCards.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE`);
    const now = new Date();
    const currentClaim = await tx.activationClaimSession.findFirst({
      where: { id: input.claimId, userId: input.userId, status: "VERIFIED", expiresAt: { gt: now } },
      select: { id: true, cardId: true, activationTokenHash: true },
    });
    if (!currentClaim) return "expired" as const;

    const [override, subscription, freePlan, ownedCards] = await Promise.all([
      tx.userLimitOverride.findUnique({ where: { userId: input.userId }, select: { maxCards: true } }),
      tx.userPlan.findFirst({
        where: { userId: input.userId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        orderBy: { startsAt: "desc" },
        select: { plan: { select: { maxCards: true } } },
      }),
      tx.plan.findUnique({ where: { slug: "free" }, select: { maxCards: true } }),
      tx.card.count({ where: { ownerId: input.userId } }),
    ]);
    const maxCards = override?.maxCards ?? subscription?.plan.maxCards ?? freePlan?.maxCards;
    if (maxCards == null || ownedCards + 1 > maxCards) return "limit" as const;

    const updated = await tx.card.updateMany({
      where: {
        id: currentClaim.cardId,
        ownerId: null,
        assignmentStatus: "UNASSIGNED",
        activationTokenConsumedAt: null,
        activationTokenHash: currentClaim.activationTokenHash,
      },
      data: {
        ownerId: input.userId,
        profileId: input.profileId,
        activeDestinationId: input.destinationId,
        assignmentStatus: "SELF_CLAIMED",
        cardStatus: "ACTIVE",
        inventoryStatus: "ASSIGNED",
        assignedAt: now,
        activatedAt: now,
        activationTokenConsumedAt: now,
        activationTokenHash: hashActivationToken(createOpaqueToken()),
      },
    });
    if (updated.count !== 1) return "used" as const;
    const consumed = await tx.activationClaimSession.updateMany({
      where: { id: currentClaim.id, status: "VERIFIED", consumedAt: null },
      data: { status: "CONSUMED", consumedAt: now },
    });
    if (consumed.count !== 1) throw new Error("CLAIM_STATE_CONFLICT");
    await tx.auditLog.create({ data: { actorId: input.userId, operation: "card.self_claim", targetId: currentClaim.cardId } });
    return "success" as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function confirmCardClaim() {
  const user = await requireUser();
  const claim = await getActivationClaim();
  if (!claim || claim.userId !== user.id || claim.status !== "VERIFIED" || claim.expiresAt <= new Date()) {
    redirect("/dashboard/tags?activation=session-expired");
  }
  const profile = await prisma.profile.findFirst({ where: { userId: user.id, organizationId: null }, select: { id: true } });
  const destination = profile ? await prisma.destination.findFirst({ where: { userId: user.id, profileId: profile.id, type: "PROFILE", isActive: true }, select: { id: true } }) : null;

  let outcome: "success" | "expired" | "limit" | "used" = "used";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      outcome = await claimCardOnce({ claimId: claim.id, userId: user.id, profileId: profile?.id || null, destinationId: destination?.id || null });
      break;
    } catch (error) {
      if (isWriteConflict(error) && attempt < 2) continue;
      throw error;
    }
  }
  if (outcome === "limit") redirect("/dashboard/tags?activation=card-limit-reached");
  if (outcome === "expired") redirect("/dashboard/tags?activation=session-expired");
  if (outcome !== "success") redirect("/dashboard/tags?activation=already-used");

  (await cookies()).set(ACTIVATION_COOKIE, "", { ...secureCookie, maxAge: 0 });
  revalidatePath(`/${claim.card.publicSlug}`);
  revalidatePath("/dashboard/tags");
  redirect(`/dashboard/tags?activation=success&card=${encodeURIComponent(claim.card.serialNumber)}`);
}
