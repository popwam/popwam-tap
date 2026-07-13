export type SystemRoleValue = "ADMIN" | "USER";

export function isAdmin(role: string | null | undefined): role is "ADMIN" {
  return role === "ADMIN";
}

export function canManageOwnedResource(role: string | undefined, sessionUserId: string, ownerId: string) {
  return isAdmin(role) || sessionUserId === ownerId;
}
