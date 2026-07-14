import { Prisma, prisma } from "@popwam/db";
import { createOpaqueToken, hashActivationToken } from "@/lib/card-tokens";
import { getMobileUser, mobileUnauthorized } from "@/lib/mobile-auth";

function errorCode(error: unknown) {
  if (error instanceof Error && error.message === "CARD_LIMIT_REACHED") return "CARD_LIMIT_REACHED";
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return "WRITE_CONFLICT";
  return "CARD_CLAIM_FAILED";
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return mobileUnauthorized();

  const body = await request.json().catch(() => ({}));
  const claimToken = String(body.claimToken || "");
  const claim = claimToken.length >= 32
    ? await prisma.activationClaimSession.findUnique({
        where: { sessionTokenHash: hashActivationToken(claimToken) },
        include: { card: true },
      })
    : null;
  if (!claim || claim.userId !== user.id || claim.status !== "VERIFIED" || claim.expiresAt <= new Date()) {
    return Response.json({ ok: false, error: "CLAIM_EXPIRED" }, { status: 400 });
  }

  const profile = await prisma.profile.findFirst({
    where: { id: String(body.profileId || ""), userId: user.id },
    select: { id: true },
  }) || await prisma.profile.findFirst({
    where: { userId: user.id, organizationId: null },
    select: { id: true },
  });
  if (!profile) return Response.json({ ok: false, error: "PROFILE_REQUIRED" }, { status: 400 });

  const destination = await prisma.destination.findFirst({
    where: { userId: user.id, profileId: profile.id, type: "PROFILE", isActive: true },
    select: { id: true },
  });

  try {
    const claimOnce = () => prisma.$transaction(async (tx) => {
      // Serialize all card claims for one account so maxCards cannot be bypassed
      // by claiming multiple different cards concurrently.
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`);

      const now = new Date();
      const producedTag = await tx.producedTag.findUnique({ where: { cardId: claim.cardId }, select: { id: true, batch: { select: { batchCode: true } } } });
      const [override, subscription, freePlan, ownedCards] = await Promise.all([
        tx.userLimitOverride.findUnique({ where: { userId: user.id }, select: { maxCards: true } }),
        tx.userPlan.findFirst({
          where: { userId: user.id, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          orderBy: { startsAt: "desc" },
          select: { plan: { select: { maxCards: true } } },
        }),
        tx.plan.findUnique({ where: { slug: "free" }, select: { maxCards: true } }),
        tx.card.count({ where: { ownerId: user.id } }),
      ]);
      const maxCards = override?.maxCards ?? subscription?.plan.maxCards ?? freePlan?.maxCards;
      if (maxCards == null) throw new Error("PLAN_NOT_CONFIGURED");
      if (ownedCards + 1 > maxCards) throw new Error("CARD_LIMIT_REACHED");

      const updated = await tx.card.updateMany({
        where: {
          id: claim.cardId,
          ownerId: null,
          assignmentStatus: "UNASSIGNED",
          activationTokenConsumedAt: null,
          activationTokenHash: claim.activationTokenHash,
        },
        data: {
          ownerId: user.id,
          profileId: profile.id,
          activeDestinationId: destination?.id,
          assignmentStatus: "SELF_CLAIMED",
          cardStatus: "ACTIVE",
          inventoryStatus: "ASSIGNED",
          assignedAt: now,
          activatedAt: now,
          activationTokenConsumedAt: now,
          activationTokenHash: hashActivationToken(createOpaqueToken()),
        },
      });
      if (updated.count !== 1) return false;

      if (producedTag) {
        await tx.producedTag.update({ where: { id: producedTag.id }, data: { status: "ACTIVATED", assignedUserId: user.id, activatedAt: now } });
        await tx.inventoryBatch.updateMany({ where: { batchCode: producedTag.batch.batchCode, availableQuantity: { gt: 0 } }, data: { availableQuantity: { decrement: 1 }, assignedQuantity: { increment: 1 } } });
      }

      await tx.activationClaimSession.update({
        where: { id: claim.id },
        data: { status: "CONSUMED", consumedAt: now },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, operation: "mobile.card.claim", targetId: claim.cardId },
      });
      return true;
    }, { isolationLevel: "Serializable" });

    let success: boolean | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        success = await claimOnce();
        break;
      } catch (error) {
        if (errorCode(error) === "WRITE_CONFLICT" && attempt < 2) continue;
        throw error;
      }
    }

    return success
      ? Response.json({ ok: true, cardId: claim.cardId })
      : Response.json({ ok: false, error: "CARD_ALREADY_CLAIMED" }, { status: 409 });
  } catch (error) {
    const code = errorCode(error);
    if (code === "CARD_LIMIT_REACHED") {
      return Response.json({ ok: false, error: code }, { status: 403 });
    }
    if (code === "WRITE_CONFLICT") {
      return Response.json({ ok: false, error: code }, { status: 409 });
    }
    console.error("mobile card claim failed", {
      operation: "mobile.card.claim",
      userId: user.id,
      cardId: claim.cardId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ ok: false, error: code }, { status: 500 });
  }
}
