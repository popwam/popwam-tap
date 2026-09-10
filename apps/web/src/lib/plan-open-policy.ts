import type { Prisma } from "@popwam/db";

export type ProfileOpenPolicy = { mode: "UNLIMITED" } | { mode: "DAILY" | "MONTHLY"; limit: number };
export const DEFAULT_PROFILE_OPEN_POLICY: ProfileOpenPolicy = { mode: "UNLIMITED" };
export const planOpenPolicyKey = (planId: string) => `plan.profile-open-policy.${planId}`;

export function parseProfileOpenPolicy(mode: string, rawLimit: string): ProfileOpenPolicy | null {
  if (mode === "UNLIMITED") return DEFAULT_PROFILE_OPEN_POLICY;
  if (!['DAILY', 'MONTHLY'].includes(mode) || !/^\d+$/.test(rawLimit)) return null;
  const limit = Number(rawLimit);
  return Number.isSafeInteger(limit) && limit > 0 && limit <= 1_000_000_000 ? { mode: mode as "DAILY" | "MONTHLY", limit } : null;
}

export function readProfileOpenPolicy(value: Prisma.JsonValue | null | undefined): ProfileOpenPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PROFILE_OPEN_POLICY;
  const mode = "mode" in value ? String(value.mode) : "";
  const limit = "limit" in value ? String(value.limit) : "";
  return parseProfileOpenPolicy(mode, limit) || DEFAULT_PROFILE_OPEN_POLICY;
}
