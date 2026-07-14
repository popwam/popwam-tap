"use server";

import { Prisma, prisma } from "@popwam/db";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { assertWithinLimitLocked } from "@/lib/plans";

const text = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function requestTagTransfer(data: FormData) {
  const user = await requireUser();
  const cardId = text(data, "cardId");
  const invitedEmail = text(data, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(invitedEmail) || invitedEmail === user.email.toLowerCase()) throw new Error("TRANSFER_EMAIL_INVALID");
  const [card, recipient, pending] = await Promise.all([
    prisma.card.findFirst({ where: { id: cardId, ownerId: user.id }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: invitedEmail }, select: { id: true, status: true } }),
    prisma.tagTransfer.findFirst({ where: { tagId: cardId, status: "PENDING", expiresAt: { gt: new Date() } }, select: { id: true } }),
  ]);
  if (!card) throw new Error("CARD_NOT_FOUND");
  if (pending) throw new Error("TRANSFER_ALREADY_PENDING");
  if (recipient && recipient.status !== "ACTIVE") throw new Error("RECIPIENT_NOT_ACTIVE");
  const transfer = await prisma.tagTransfer.create({ data: { tagId: card.id, fromUserId: user.id, toUserId: recipient?.id, invitedEmail, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
  await prisma.auditLog.create({ data: { actorId: user.id, operation: "tag.transfer.request", targetId: transfer.id, metadata: { cardId } } });
  revalidatePath("/dashboard/transfers");
}

export async function respondToTagTransfer(data: FormData) {
  const user = await requireUser();
  const transferId = text(data, "transferId");
  const response = text(data, "response");
  if (response !== "accept" && response !== "reject") throw new Error("TRANSFER_RESPONSE_INVALID");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "TagTransfer" WHERE "id" = ${transferId} FOR UPDATE`);
    const transfer = await tx.tagTransfer.findUnique({ where: { id: transferId }, include: { tag: true } });
    if (!transfer || transfer.status !== "PENDING") throw new Error("TRANSFER_NOT_PENDING");
    if (transfer.expiresAt <= new Date()) {
      await tx.tagTransfer.update({ where: { id: transfer.id }, data: { status: "EXPIRED" } });
      throw new Error("TRANSFER_EXPIRED");
    }
    if (transfer.toUserId !== user.id && transfer.invitedEmail?.toLowerCase() !== user.email.toLowerCase()) throw new Error("TRANSFER_NOT_FOR_USER");
    if (response === "reject") {
      await tx.tagTransfer.update({ where: { id: transfer.id }, data: { status: "REJECTED", toUserId: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, operation: "tag.transfer.reject", targetId: transfer.id } });
      return;
    }
    await assertWithinLimitLocked(tx, user.id, "cards");
    if (transfer.tag.ownerId !== transfer.fromUserId) throw new Error("TRANSFER_OWNER_CHANGED");
    await tx.card.update({ where: { id: transfer.tagId }, data: { ownerId: user.id, organizationId: null, profileId: null, virtualCardId: null, activeDestinationId: null, assignmentStatus: "TRANSFERRED", cardStatus: "PAUSED", assignedAt: new Date() } });
    await tx.producedTag.updateMany({ where: { cardId: transfer.tagId }, data: { assignedUserId: user.id, status: "ASSIGNED" } });
    await tx.tagTransfer.update({ where: { id: transfer.id }, data: { status: "ACCEPTED", toUserId: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, operation: "tag.transfer.accept", targetId: transfer.id, metadata: { cardId: transfer.tagId, fromUserId: transfer.fromUserId } } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/dashboard/transfers");
  revalidatePath("/dashboard/tags");
}

export async function cancelTagTransfer(data: FormData) {
  const user = await requireUser();
  const transferId = text(data, "transferId");
  const changed = await prisma.tagTransfer.updateMany({ where: { id: transferId, fromUserId: user.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (changed.count !== 1) throw new Error("TRANSFER_NOT_PENDING");
  await prisma.auditLog.create({ data: { actorId: user.id, operation: "tag.transfer.cancel", targetId: transferId } });
  revalidatePath("/dashboard/transfers");
}
