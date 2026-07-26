import { prisma, Prisma } from "@popwam/db";
import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { consumeStepUpGrant, stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { cardId } = await params;
  try {
    const result = await prisma.$transaction(async tx => {
      await consumeStepUpGrant(tx, context, "PRODUCT_LOST", stepUpGrantFromRequest(request));
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Card" WHERE "id" = ${cardId} FOR UPDATE`);
      const card = await tx.card.findFirst({ where: { id: cardId, ownerId: context.user.id }, select: { id: true, cardStatus: true } });
      if (!card) return { ok: false as const, error: "NOT_FOUND" as const };
      if (card.cardStatus === "LOST") return { ok: true as const, idempotent: true };
      if (card.cardStatus !== "ACTIVE" && card.cardStatus !== "PAUSED") return { ok: false as const, error: "PRODUCT_STATE_INVALID" as const };
      await tx.card.update({ where: { id: card.id }, data: { cardStatus: "LOST", inventoryStatus: "LOST" } });
      await tx.productStatusHistory.create({ data: { cardId: card.id, fromStatus: card.cardStatus, toStatus: "LOST", actorId: context.user.id, reason: "OWNER_REPORTED_LOST" } });
      await tx.auditLog.create({ data: { actorId: context.user.id, operation: "security.product.lost", targetId: card.id, metadata: { outcome: "SUCCESS" } } });
      return { ok: true as const, idempotent: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json(result, { status: result.ok ? 200 : result.error === "NOT_FOUND" ? 404 : 409 });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
