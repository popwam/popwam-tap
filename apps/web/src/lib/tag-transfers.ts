export type TransferState = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export function canAcceptTransfer(status: TransferState, expiresAt: Date, now = new Date()) {
  return status === "PENDING" && expiresAt.getTime() > now.getTime();
}

export function transferOwnerAfterAcceptance(currentOwnerId: string, recipientId: string, accepted: boolean) {
  return accepted ? recipientId : currentOwnerId;
}
