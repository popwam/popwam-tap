import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  completionGate,
  ONBOARDING_CREATED_CONTENT_IS_VISIBLE,
  preserveExistingText,
  shouldApplyOnboardingText,
  type CompletionGateInput,
} from "./dynamic-onboarding-finalization-policy";

const valid: CompletionGateInput = {
  authenticatedUserId: "user-1",
  profileUserId: "user-1",
  progressCompleted: false,
  progressRevision: 3,
  requestedRevision: 3,
  progressDefinitionId: "definition-1",
  progressDefinitionVersion: 1,
  definitionId: "definition-1",
  definitionVersion: 1,
  definitionStatus: "PUBLISHED",
  profileKind: "BUSINESS",
  definitionProfileKind: "BUSINESS",
  profileCategoryId: "restaurant",
  definitionCategoryId: "restaurant",
  profileTemplateId: "template-1",
  definitionTemplateId: null,
};

describe("dynamic onboarding finalization gate", () => {
  it("rejects profile ownership and PERSONAL/BUSINESS mismatches", () => {
    expect(completionGate({ ...valid, profileUserId: "user-2" })).toEqual({ kind: "ERROR", error: "ONBOARDING_PROFILE_FORBIDDEN" });
    expect(completionGate({ ...valid, profileKind: "PERSONAL" })).toEqual({ kind: "ERROR", error: "ONBOARDING_PROFILE_DEFINITION_MISMATCH" });
  });

  it("rejects category/template mismatch and stale progress", () => {
    expect(completionGate({ ...valid, profileCategoryId: "clinic" })).toEqual({ kind: "ERROR", error: "ONBOARDING_PROFILE_DEFINITION_MISMATCH" });
    expect(completionGate({ ...valid, definitionTemplateId: "template-2" })).toEqual({ kind: "ERROR", error: "ONBOARDING_PROFILE_DEFINITION_MISMATCH" });
    expect(completionGate({ ...valid, requestedRevision: 2 })).toEqual({ kind: "ERROR", error: "ONBOARDING_PROGRESS_STALE" });
  });

  it("pins exact definition/version and never resumes a draft definition", () => {
    expect(completionGate({ ...valid, progressDefinitionVersion: 2 })).toEqual({ kind: "ERROR", error: "ONBOARDING_DEFINITION_STALE" });
    expect(completionGate({ ...valid, definitionStatus: "DRAFT" })).toEqual({ kind: "ERROR", error: "ONBOARDING_DEFINITION_UNPUBLISHED" });
  });

  it("makes duplicate completion idempotent", () => {
    expect(completionGate({ ...valid, progressCompleted: true })).toEqual({ kind: "IDEMPOTENT" });
    expect(completionGate(valid)).toEqual({ kind: "READY" });
  });

  it("preserves legacy values and keeps newly mapped content private", () => {
    expect(preserveExistingText("Legacy value", "Replacement")).toBe("Legacy value");
    expect(preserveExistingText(null, " New value ")).toBe("New value");
    expect(shouldApplyOnboardingText("Legacy value", null, "Replacement")).toBe(false);
    expect(shouldApplyOnboardingText("Original", "Original", "Intentional edit")).toBe(true);
    expect(shouldApplyOnboardingText("Concurrent edit", "Original", "Intentional edit")).toBe(false);
    expect(ONBOARDING_CREATED_CONTENT_IS_VISIBLE).toBe(false);
  });

  it("keeps mappings and completion inside one Prisma transaction", () => {
    const source = readFileSync(new URL("./dynamic-onboarding.ts", import.meta.url), "utf8");
    const completion = source.slice(source.indexOf("export async function completeDynamicOnboarding"));
    const transactional = source.slice(source.indexOf("async function completeDynamicOnboardingInTransaction"));
    expect(completion).toContain("prisma.$transaction");
    expect(transactional.indexOf("await applyMapping")).toBeGreaterThan(transactional.indexOf("SELECT \"id\" FROM \"OnboardingProgress\""));
    expect(transactional.indexOf("const completedAt")).toBeGreaterThan(transactional.indexOf("await applyMapping"));
  });
});
