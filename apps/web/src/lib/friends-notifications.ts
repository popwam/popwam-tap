import "server-only";

import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@popwam/db";
import { getFirebaseAdminApp } from "./firebase/admin";
import { decryptSecret } from "./token-vault";
import { notificationDeliveryAllowed } from "./friends-policy";

/** Dispatches a previously committed event. The relationship mutation is
 * authoritative and remains successful even when this function fails. */
export async function dispatchFriendNotification(eventId: string) {
  const event = await prisma.friendNotificationEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      recipientUserId: true,
      actorUserId: true,
      requestId: true,
      type: true,
      status: true,
      recipient: { select: { notificationPreference: { select: { socialEnabled: true } } } },
    },
  });
  if (!event || event.status !== "PENDING") return { status: "NOT_APPLICABLE" as const };
  const actorId = event.actorUserId;
  if (!actorId) {
    await prisma.friendNotificationEvent.update({ where: { id: event.id }, data: { status: "SUPPRESSED" } });
    return { status: "SUPPRESSED" as const };
  }
  const [blocks, muted, request] = await Promise.all([
    prisma.userBlock.count({
      where: {
        OR: [
          { ownerId: event.recipientUserId, blockedId: actorId },
          { ownerId: actorId, blockedId: event.recipientUserId },
        ],
      },
    }),
    prisma.friendPreference.findUnique({
      where: { ownerId_friendId: { ownerId: event.recipientUserId, friendId: actorId } },
      select: { muted: true },
    }),
    event.requestId ? prisma.friendRequest.findUnique({ where: { id: event.requestId }, select: { status: true } }) : null,
  ]);
  const requestStillRelevant = event.type !== "FRIEND_REQUEST_RECEIVED" || request?.status === "PENDING";
  const allowed = requestStillRelevant && notificationDeliveryAllowed({
    socialEnabled: event.recipient.notificationPreference?.socialEnabled ?? true,
    muted: muted?.muted || false,
    blocked: blocks > 0,
  });
  if (!allowed) {
    await prisma.friendNotificationEvent.update({ where: { id: event.id }, data: { status: "SUPPRESSED" } });
    return { status: "SUPPRESSED" as const };
  }
  const tokenRows = await prisma.devicePushToken.findMany({
    where: { userId: event.recipientUserId, revokedAt: null },
    select: { id: true, tokenEncrypted: true },
    take: 100,
  });
  if (!tokenRows.length) {
    await prisma.friendNotificationEvent.update({ where: { id: event.id }, data: { status: "SUPPRESSED" } });
    return { status: "SUPPRESSED" as const };
  }
  try {
    const tokens = tokenRows.map((row) => decryptSecret(row.tokenEncrypted));
    const title = event.type === "FRIEND_REQUEST_RECEIVED" ? "New friend request" : "Friend request accepted";
    const body = event.type === "FRIEND_REQUEST_RECEIVED" ? "Open POP to review it." : "Open POP to view your friends.";
    const result = await getMessaging(getFirebaseAdminApp()).sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: event.type, action: "friends" },
      android: { priority: "normal" },
    });
    await prisma.$transaction([
      prisma.friendNotificationEvent.update({
        where: { id: event.id },
        data: { status: result.successCount > 0 ? "SENT" : "FAILED", sentAt: result.successCount > 0 ? new Date() : null },
      }),
      ...(result.responses.flatMap((response, index) => response.success ? [] : [
        prisma.devicePushToken.update({ where: { id: tokenRows[index].id }, data: { revokedAt: new Date() } }),
      ])),
    ]);
    return { status: result.successCount > 0 ? "SENT" as const : "FAILED" as const };
  } catch {
    await prisma.friendNotificationEvent.update({ where: { id: event.id }, data: { status: "FAILED" } }).catch(() => undefined);
    return { status: "FAILED" as const };
  }
}

