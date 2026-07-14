export const ONBOARDING_STEPS = 6;

export function nextOnboardingStep(currentStep: number, completed = false) {
  if (completed) return ONBOARDING_STEPS;
  return Math.min(ONBOARDING_STEPS, Math.max(1, currentStep + 1));
}

export function mergeOnboardingData(current: unknown, update: Record<string, unknown>) {
  return { ...(current && typeof current === "object" && !Array.isArray(current) ? current : {}), ...update };
}

export function activeOnboardingPlatforms<T extends { isActive: boolean; sortOrder: number }>(platforms: T[]) {
  return platforms.filter(platform => platform.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}
