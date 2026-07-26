import type { ProfileKind } from "@popwam/db";

export function profileQuotaDecision(input: { used: number; baseLimit: number; entitlementIncrement: number; requested: number; profileKind: ProfileKind; allowBusinessProfiles: boolean }) {
  if (input.profileKind === "BUSINESS" && !input.allowBusinessProfiles) return { allowed: false as const, reason: "BUSINESS_PROFILE_NOT_ENTITLED" };
  if (input.used + input.requested > input.baseLimit + input.entitlementIncrement) return { allowed: false as const, reason: "PROFILE_LIMIT_REACHED" };
  return { allowed: true as const };
}

export function primaryProfileDecision(input: { activePrimaryIds: string[]; targetId?: string; targetArchived?: boolean; operation: "CREATE_PRIMARY" | "CREATE_ADDITIONAL" | "SET_PRIMARY" }) {
  if (input.operation === "CREATE_PRIMARY") return input.activePrimaryIds.length ? { allowed: false as const, reason: "PRIMARY_PROFILE_ALREADY_EXISTS" } : { allowed: true as const };
  if (input.operation === "CREATE_ADDITIONAL") return input.activePrimaryIds.length ? { allowed: true as const } : { allowed: false as const, reason: "PRIMARY_PROFILE_REQUIRED" };
  if (!input.targetId || input.targetArchived) return { allowed: false as const, reason: "PRIMARY_PROFILE_TARGET_INVALID" };
  return { allowed: true as const };
}

export function categoryTemplateCompatibility(input: { profileKind: ProfileKind; categoryKind?: ProfileKind | null; templateKind?: ProfileKind | null; templateCategoryMatches?: boolean }) {
  if (input.categoryKind && input.categoryKind !== input.profileKind) return { compatible: false as const, reason: "PROFILE_CATEGORY_INCOMPATIBLE" };
  if (input.templateKind && input.templateKind !== input.profileKind) return { compatible: false as const, reason: "PROFILE_TEMPLATE_INCOMPATIBLE" };
  if (input.templateCategoryMatches === false) return { compatible: false as const, reason: "PROFILE_TEMPLATE_CATEGORY_MISMATCH" };
  return { compatible: true as const };
}

export function defaultModuleKeys(rules: Array<{ key: string; allowed: boolean; enabledByDefault: boolean; required: boolean }>, fallback: string[]) {
  const selected = rules.filter((rule) => rule.allowed && (rule.enabledByDefault || rule.required)).map((rule) => rule.key);
  return selected.length ? selected : fallback;
}

export function idempotentProfileCreationDecision(existing: { userId: string; profileId: string } | null, requestedUserId: string) {
  if (!existing) return { kind: "CREATE" as const };
  if (existing.userId !== requestedUserId) return { kind: "CONFLICT" as const, reason: "PROFILE_CREATION_KEY_CONFLICT" };
  return { kind: "RETURN_EXISTING" as const, profileId: existing.profileId };
}

export function profileModuleDecision(input: { definitionActive: boolean; supportsMultiple: boolean; instanceKey: string; profileHasTemplate: boolean; templateAllows?: boolean; templateRequires?: boolean; enabled: boolean; supportsVisibility: boolean; nonPublicVisibility: boolean }) {
  if (!input.definitionActive) return { allowed: false as const, reason: "PROFILE_MODULE_DEFINITION_UNAVAILABLE" };
  if (!input.supportsMultiple && input.instanceKey !== "default") return { allowed: false as const, reason: "PROFILE_MODULE_MULTIPLE_NOT_SUPPORTED" };
  if (input.profileHasTemplate && !input.templateAllows) return { allowed: false as const, reason: "PROFILE_MODULE_NOT_ALLOWED_BY_TEMPLATE" };
  if (input.templateRequires && !input.enabled) return { allowed: false as const, reason: "PROFILE_MODULE_REQUIRED_BY_TEMPLATE" };
  if (!input.supportsVisibility && input.nonPublicVisibility) return { allowed: false as const, reason: "PROFILE_MODULE_VISIBILITY_UNSUPPORTED" };
  return { allowed: true as const };
}
