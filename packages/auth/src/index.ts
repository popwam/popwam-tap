export type SystemRoleValue = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "USER";

export function isAdmin(role: string | null | undefined): role is "SUPER_ADMIN" | "ADMIN" {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canManageOwnedResource(role: string | undefined, sessionUserId: string, ownerId: string) {
  return isAdmin(role) || sessionUserId === ownerId;
}
