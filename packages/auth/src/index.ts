export function isAdmin(role: string | null | undefined): role is "SUPER_ADMIN" | "ADMIN" {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
