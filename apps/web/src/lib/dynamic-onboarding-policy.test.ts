import { describe, expect, it } from "vitest";
import {
  hasValidationErrors,
  isApprovedOnboardingQuestionType,
  onboardingModuleCompatible,
  onboardingProgress,
  parseAnswerPayload,
  resolveDefinitionCandidate,
  resumePinnedDefinition,
  type OnboardingDefinitionContract,
  validateAnswerPayload,
  visibleQuestions,
  visibleSteps,
} from "./dynamic-onboarding-policy";

const definition: OnboardingDefinitionContract = {
  id: "def-restaurant-v1",
  key: "restaurant-v1",
  version: 1,
  profileKind: "BUSINESS",
  categoryKey: "restaurant",
  steps: [
    {
      key: "identity",
      title: "Identity",
      required: true,
      questions: [{
        key: "business_name",
        type: "TEXT",
        label: "Business name",
        required: true,
        minLength: 2,
        maxLength: 120,
        options: [],
        conditions: [],
      }],
    },
    {
      key: "branches",
      title: "Branches",
      required: false,
      questions: [
        { key: "has_branches", type: "BOOLEAN", label: "Branches?", required: false, options: [], conditions: [] },
        {
          key: "branch_address",
          type: "LOCATION",
          label: "Address",
          required: true,
          maxLength: 300,
          options: [],
          conditions: [{ sourceQuestionKey: "has_branches", operator: "IS_TRUE", expectedValues: [] }],
        },
      ],
    },
    {
      key: "services",
      title: "Services",
      required: false,
      questions: [{
        key: "services",
        type: "MULTI_SELECT",
        label: "Services",
        required: false,
        maxItems: 2,
        options: [{ key: "delivery", label: "Delivery" }, { key: "catering", label: "Catering" }],
        conditions: [],
      }],
    },
  ],
};

describe("dynamic onboarding definition resolution", () => {
  const candidates = [
    { id: "fallback", version: 1, profileKind: "BUSINESS" as const, categoryId: null, templateId: null, status: "PUBLISHED" as const },
    { id: "category-v1", version: 1, profileKind: "BUSINESS" as const, categoryId: "restaurant", templateId: null, status: "PUBLISHED" as const },
    { id: "category-v2", version: 2, profileKind: "BUSINESS" as const, categoryId: "restaurant", templateId: null, status: "PUBLISHED" as const },
    { id: "template", version: 1, profileKind: "BUSINESS" as const, categoryId: "restaurant", templateId: "premium", status: "PUBLISHED" as const },
    { id: "draft", version: 99, profileKind: "BUSINESS" as const, categoryId: "restaurant", templateId: null, status: "DRAFT" as const },
  ];

  it("uses template, then newest category, then profile-kind fallback", () => {
    expect(resolveDefinitionCandidate(candidates, { profileKind: "BUSINESS", categoryId: "restaurant", templateId: "premium" })?.id).toBe("template");
    expect(resolveDefinitionCandidate(candidates, { profileKind: "BUSINESS", categoryId: "restaurant", templateId: null })?.id).toBe("category-v2");
    expect(resolveDefinitionCandidate(candidates, { profileKind: "BUSINESS", categoryId: "new-category", templateId: null })?.id).toBe("fallback");
  });

  it("assigns published definitions only and keeps a retired pinned version resumable", () => {
    expect(resolveDefinitionCandidate(candidates, { profileKind: "BUSINESS", categoryId: "restaurant", templateId: null })?.id).not.toBe("draft");
    expect(resumePinnedDefinition([
      ...candidates,
      { id: "old", version: 1, profileKind: "BUSINESS", categoryId: null, templateId: null, status: "RETIRED" },
    ], "old", 1)?.id).toBe("old");
    expect(resumePinnedDefinition(candidates, "draft", 99)).toBeNull();
  });
});

describe("bounded branching and validation", () => {
  it("shows a conditional branch only when its approved source is true", () => {
    const branch = definition.steps[1];
    expect(visibleQuestions(branch, { has_branches: false }).map((item) => item.key)).toEqual(["has_branches"]);
    expect(visibleQuestions(branch, { has_branches: true }).map((item) => item.key)).toEqual(["has_branches", "branch_address"]);
  });

  it("requires visible required answers but permits optional skips", () => {
    expect(validateAnswerPayload(definition, { business_name: "POP", has_branches: false }, { complete: true })).toEqual({});
    expect(validateAnswerPayload(definition, { business_name: "POP", has_branches: true }, { complete: true })).toEqual({ branch_address: "REQUIRED" });
  });

  it("rejects unknown keys, invalid allow-list options, and unsafe URLs", () => {
    expect(validateAnswerPayload(definition, { injected_mapping: "Profile.password" })).toEqual({ injected_mapping: "QUESTION_NOT_ALLOWED" });
    expect(validateAnswerPayload(definition, { services: ["not-configured"] })).toEqual({ services: "INVALID_OPTION" });
    const urlDefinition = {
      ...definition,
      steps: [{
        key: "link", title: "Link", required: false,
        questions: [{ key: "url", type: "URL" as const, label: "URL", required: false, options: [], conditions: [] }],
      }],
    };
    expect(validateAnswerPayload(urlDefinition, { url: "javascript:alert(1)" })).toEqual({ url: "INVALID_URL" });
  });

  it("rejects nested answer objects and oversized bounded values", () => {
    expect(parseAnswerPayload({ safe: { nested: true } })).toBeNull();
    expect(parseAnswerPayload({ safe: ["a", 1] })).toBeNull();
    const errors = validateAnswerPayload(definition, { business_name: "x".repeat(121) });
    expect(errors.business_name).toBe("TOO_LONG");
    expect(hasValidationErrors(errors)).toBe(true);
  });
});

describe("shared renderer policy", () => {
  it("calculates progress from currently visible steps", () => {
    expect(visibleSteps(definition, { has_branches: false }).length).toBe(3);
    expect(onboardingProgress(definition, { has_branches: false }, "branches")).toEqual({ current: 2, total: 3, percent: 67 });
  });

  it("has a fixed registry and safely rejects unknown question types", () => {
    expect(isApprovedOnboardingQuestionType("TEXT")).toBe(true);
    expect(isApprovedOnboardingQuestionType("REMOTE_WIDGET")).toBe(false);
  });

  it("enforces template module compatibility with bounded core fallback", () => {
    expect(onboardingModuleCompatible({ templateSelected: true, moduleKey: "SERVICES", moduleAlreadyEnabled: false })).toBe(false);
    expect(onboardingModuleCompatible({ templateSelected: true, moduleKey: "CONTACT", moduleAlreadyEnabled: false })).toBe(true);
    expect(onboardingModuleCompatible({ templateSelected: true, moduleKey: "SERVICES", moduleAlreadyEnabled: false, explicitTemplateRule: { allowed: true } })).toBe(true);
    expect(onboardingModuleCompatible({ templateSelected: false, moduleKey: "SERVICES", moduleAlreadyEnabled: false })).toBe(true);
  });
});
