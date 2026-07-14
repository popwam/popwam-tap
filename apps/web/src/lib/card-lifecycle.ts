export function cardDispositionAfterUserDeletion(disposition: "unassign" | "reassign" | "disable", targetUserId?: string) {
  if (disposition === "unassign") return { ownerId: null, assignmentStatus: "UNASSIGNED", inventoryStatus: "PROGRAMMED", producedTagStatus: "UNASSIGNED" } as const;
  if (disposition === "disable") return { ownerId: null, assignmentStatus: "REVOKED", inventoryStatus: "ASSIGNED", producedTagStatus: "DISABLED" } as const;
  if (!targetUserId) throw new Error("REASSIGN_USER_REQUIRED");
  return { ownerId: targetUserId, assignmentStatus: "TRANSFERRED", inventoryStatus: "ASSIGNED", producedTagStatus: "ASSIGNED" } as const;
}
