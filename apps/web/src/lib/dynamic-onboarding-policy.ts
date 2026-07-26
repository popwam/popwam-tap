export const APPROVED_ONBOARDING_QUESTION_TYPES = [
  "TEXT", "TEXTAREA", "PHONE", "EMAIL", "URL", "NUMBER", "CURRENCY",
  "BOOLEAN", "SINGLE_SELECT", "MULTI_SELECT", "IMAGE", "LOCATION",
  "TIME", "DAY_HOURS",
] as const;

export type OnboardingQuestionTypeName = typeof APPROVED_ONBOARDING_QUESTION_TYPES[number];
export type OnboardingAnswer = string | number | boolean | string[] | null;
export type OnboardingAnswers = Record<string, OnboardingAnswer>;
export type OnboardingConditionContract = {
  sourceQuestionKey: string;
  operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "IS_TRUE" | "IS_FALSE" | "ANSWERED" | "NOT_ANSWERED";
  expectedValues: string[];
};
export type OnboardingOptionContract = { key: string; label: string };
export type OnboardingQuestionContract = {
  key: string;
  type: OnboardingQuestionTypeName;
  label: string;
  help?: string | null;
  required: boolean;
  mappingKey?: string;
  minLength?: number | null;
  maxLength?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  maxItems?: number | null;
  options: OnboardingOptionContract[];
  conditions: OnboardingConditionContract[];
};
export type OnboardingStepContract = {
  key: string;
  title: string;
  description?: string | null;
  required: boolean;
  moduleKey?: string | null;
  questions: OnboardingQuestionContract[];
};
export type OnboardingDefinitionContract = {
  id: string;
  key: string;
  version: number;
  profileKind: "PERSONAL" | "BUSINESS";
  categoryKey?: string | null;
  templateId?: string | null;
  steps: OnboardingStepContract[];
};

export function isApprovedOnboardingQuestionType(value: string): value is OnboardingQuestionTypeName {
  return (APPROVED_ONBOARDING_QUESTION_TYPES as readonly string[]).includes(value);
}

type DefinitionCandidate = {
  id: string;
  version: number;
  profileKind: "PERSONAL" | "BUSINESS";
  categoryId: string | null;
  templateId: string | null;
  status: "DRAFT" | "PUBLISHED" | "RETIRED";
};

export function resolveDefinitionCandidate(
  candidates: DefinitionCandidate[],
  profile: { profileKind: "PERSONAL" | "BUSINESS"; categoryId: string | null; templateId: string | null },
) {
  const published = candidates.filter((candidate) =>
    candidate.status === "PUBLISHED" && candidate.profileKind === profile.profileKind);
  const newest = (items: DefinitionCandidate[]) =>
    [...items].sort((a, b) => b.version - a.version || a.id.localeCompare(b.id))[0] || null;
  if (profile.templateId) {
    const match = newest(published.filter((candidate) => candidate.templateId === profile.templateId));
    if (match) return match;
  }
  if (profile.categoryId) {
    const match = newest(published.filter((candidate) =>
      candidate.templateId === null && candidate.categoryId === profile.categoryId));
    if (match) return match;
  }
  return newest(published.filter((candidate) =>
    candidate.templateId === null && candidate.categoryId === null));
}

export function resumePinnedDefinition(candidates: DefinitionCandidate[], id: string, version: number) {
  return candidates.find((candidate) =>
    candidate.id === id && candidate.version === version && candidate.status !== "DRAFT") || null;
}

export function onboardingModuleCompatible(input: {
  templateSelected: boolean;
  moduleKey: string;
  moduleAlreadyEnabled: boolean;
  explicitTemplateRule?: { allowed: boolean } | null;
}) {
  if (input.moduleAlreadyEnabled) return true;
  if (!input.templateSelected) return true;
  if (input.explicitTemplateRule) return input.explicitTemplateRule.allowed;
  return ["IDENTITY", "ABOUT", "CONTACT", "LINKS"].includes(input.moduleKey);
}

export function isAnswered(value: OnboardingAnswer | undefined) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const comparable = (value: OnboardingAnswer | undefined) =>
  Array.isArray(value) ? value : [typeof value === "boolean" ? String(value) : String(value ?? "")];

export function conditionMatches(condition: OnboardingConditionContract, answers: OnboardingAnswers) {
  const value = answers[condition.sourceQuestionKey];
  const values = comparable(value);
  switch (condition.operator) {
    case "EQUALS": return values.some((item) => item === condition.expectedValues[0]);
    case "NOT_EQUALS": return values.every((item) => item !== condition.expectedValues[0]);
    case "IN": return values.some((item) => condition.expectedValues.includes(item));
    case "NOT_IN": return values.every((item) => !condition.expectedValues.includes(item));
    case "IS_TRUE": return value === true;
    case "IS_FALSE": return value === false;
    case "ANSWERED": return isAnswered(value);
    case "NOT_ANSWERED": return !isAnswered(value);
  }
}

export function visibleQuestions(step: OnboardingStepContract, answers: OnboardingAnswers) {
  return step.questions.filter((question) =>
    question.conditions.every((condition) => conditionMatches(condition, answers)));
}

export function visibleSteps(definition: OnboardingDefinitionContract, answers: OnboardingAnswers) {
  return definition.steps.filter((step) => visibleQuestions(step, answers).length > 0);
}

export function onboardingProgress(
  definition: OnboardingDefinitionContract,
  answers: OnboardingAnswers,
  currentStepKey: string | null,
) {
  const steps = visibleSteps(definition, answers);
  const index = Math.max(0, steps.findIndex((step) => step.key === currentStepKey));
  return {
    current: steps.length ? index + 1 : 0,
    total: steps.length,
    percent: steps.length ? Math.round(((index + 1) / steps.length) * 100) : 100,
  };
}

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function shapeError(question: OnboardingQuestionContract, value: OnboardingAnswer) {
  const textTypes = new Set(["TEXT", "TEXTAREA", "PHONE", "EMAIL", "URL", "LOCATION", "TIME", "DAY_HOURS"]);
  if (textTypes.has(question.type) && typeof value !== "string") return "INVALID_TYPE";
  if ((question.type === "NUMBER" || question.type === "CURRENCY") && typeof value !== "number") return "INVALID_TYPE";
  if (question.type === "BOOLEAN" && typeof value !== "boolean") return "INVALID_TYPE";
  if (question.type === "SINGLE_SELECT" && typeof value !== "string") return "INVALID_TYPE";
  if ((question.type === "MULTI_SELECT" || question.type === "IMAGE") && !Array.isArray(value)) return "INVALID_TYPE";
  if (typeof value === "string") {
    const length = value.trim().length;
    if (question.minLength !== null && question.minLength !== undefined && length < question.minLength) return "TOO_SHORT";
    if (question.maxLength !== null && question.maxLength !== undefined && length > question.maxLength) return "TOO_LONG";
    if (question.type === "EMAIL" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return "INVALID_EMAIL";
    if (question.type === "PHONE" && !/^\+?[0-9 ()-]{7,32}$/.test(value)) return "INVALID_PHONE";
    if (question.type === "URL" && !safeUrl(value)) return "INVALID_URL";
    if (question.type === "SINGLE_SELECT" && !question.options.some((option) => option.key === value)) return "INVALID_OPTION";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "INVALID_NUMBER";
    if (question.minValue !== null && question.minValue !== undefined && value < question.minValue) return "TOO_SMALL";
    if (question.maxValue !== null && question.maxValue !== undefined && value > question.maxValue) return "TOO_LARGE";
  }
  if (Array.isArray(value)) {
    if (value.some((item) => typeof item !== "string" || item.length > 500)) return "INVALID_TYPE";
    if (question.maxItems !== null && question.maxItems !== undefined && value.length > question.maxItems) return "TOO_MANY";
    if (question.type === "MULTI_SELECT" && value.some((item) => !question.options.some((option) => option.key === item))) return "INVALID_OPTION";
  }
  return null;
}

export function validateAnswerPayload(
  definition: OnboardingDefinitionContract,
  answers: OnboardingAnswers,
  scope: { stepKey?: string; complete?: boolean } = {},
) {
  if (JSON.stringify(answers).length > 32_768) return { _form: "ANSWER_PAYLOAD_TOO_LARGE" };
  const questions = definition.steps.flatMap((step) => step.questions);
  const questionByKey = new Map(questions.map((question) => [question.key, question]));
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    const question = questionByKey.get(key);
    if (!question) {
      errors[key] = "QUESTION_NOT_ALLOWED";
      continue;
    }
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const error = shapeError(question, value);
    if (error) errors[key] = error;
  }
  const requiredQuestions = definition.steps
    .filter((step) => scope.complete || step.key === scope.stepKey)
    .flatMap((step) => visibleQuestions(step, answers))
    .filter((question) => question.required);
  for (const question of requiredQuestions) {
    if (!isAnswered(answers[question.key])) errors[question.key] = "REQUIRED";
  }
  return errors;
}

export function hasValidationErrors(errors: Record<string, string>) {
  return Object.keys(errors).length > 0;
}

export function parseAnswerPayload(value: unknown): OnboardingAnswers | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result: OnboardingAnswers = {};
  for (const [key, answer] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) return null;
    if (answer === null || typeof answer === "string" || typeof answer === "boolean" || typeof answer === "number") {
      result[key] = answer;
    } else if (Array.isArray(answer) && answer.length <= 20 && answer.every((item) => typeof item === "string")) {
      result[key] = answer as string[];
    } else {
      return null;
    }
  }
  return result;
}
