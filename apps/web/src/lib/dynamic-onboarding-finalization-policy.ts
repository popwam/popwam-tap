export type CompletionGateInput = {
  authenticatedUserId: string;
  profileUserId: string;
  progressCompleted: boolean;
  progressRevision: number;
  requestedRevision: number;
  progressDefinitionId: string | null;
  progressDefinitionVersion: number | null;
  definitionId: string;
  definitionVersion: number;
  definitionStatus: "DRAFT" | "PUBLISHED" | "RETIRED";
  profileKind: "PERSONAL" | "BUSINESS" | null;
  definitionProfileKind: "PERSONAL" | "BUSINESS";
  profileCategoryId: string | null;
  definitionCategoryId: string | null;
  profileTemplateId: string | null;
  definitionTemplateId: string | null;
};

export function completionGate(input: CompletionGateInput) {
  if (input.authenticatedUserId !== input.profileUserId) return { kind: "ERROR" as const, error: "ONBOARDING_PROFILE_FORBIDDEN" };
  if (input.definitionStatus === "DRAFT") return { kind: "ERROR" as const, error: "ONBOARDING_DEFINITION_UNPUBLISHED" };
  if (input.progressCompleted) return { kind: "IDEMPOTENT" as const };
  if (input.progressRevision !== input.requestedRevision) return { kind: "ERROR" as const, error: "ONBOARDING_PROGRESS_STALE" };
  if (input.progressDefinitionId !== input.definitionId ||
    input.progressDefinitionVersion !== input.definitionVersion) {
    return { kind: "ERROR" as const, error: "ONBOARDING_DEFINITION_STALE" };
  }
  if (input.profileKind !== input.definitionProfileKind ||
    (input.definitionCategoryId !== null && input.profileCategoryId !== input.definitionCategoryId) ||
    (input.definitionTemplateId !== null && input.profileTemplateId !== input.definitionTemplateId)) {
    return { kind: "ERROR" as const, error: "ONBOARDING_PROFILE_DEFINITION_MISMATCH" };
  }
  return { kind: "READY" as const };
}

export function preserveExistingText(existing: string | null | undefined, proposed: string) {
  return existing?.trim() ? existing : proposed.trim();
}

export function shouldApplyOnboardingText(
  existing: string | null | undefined,
  initial: string | null | undefined,
  proposed: string,
) {
  if (!existing?.trim()) return true;
  if (initial === null || initial === undefined) return false;
  return existing.trim() === initial.trim() && proposed.trim() !== initial.trim();
}

export const ONBOARDING_CREATED_CONTENT_IS_VISIBLE = false;
