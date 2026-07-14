export type AdminAccount = {
  id: string;
  role: string;
  status: string;
  passwordHash?: string | null;
};

export type AdminAccessDecision = "ALLOWED" | "SIGNED_OUT" | "SUSPENDED" | "FORBIDDEN";

export function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function decideAdminAccess(account: Pick<AdminAccount, "role" | "status"> | null): AdminAccessDecision {
  if (!account) return "SIGNED_OUT";
  if (account.status !== "ACTIVE") return "SUSPENDED";
  return isAdminRole(account.role) ? "ALLOWED" : "FORBIDDEN";
}

export async function verifyStoredAdminPassword(
  account: AdminAccount | null,
  password: string,
  compare: (plain: string, hash: string) => Promise<boolean>,
) {
  if (decideAdminAccess(account) !== "ALLOWED" || !account?.passwordHash || !password) return false;
  return compare(password, account.passwordHash);
}
