import { OnboardingError } from "./dynamic-onboarding";

export const onboardingLocale = (value: unknown) => value === "ar" ? "ar" as const : "en" as const;

export function unexpectedKeys(body: Record<string, unknown>, allowed: string[]) {
  const set = new Set(allowed);
  return Object.keys(body).some((key) => !set.has(key));
}

export function onboardingApiError(error: unknown) {
  if (error instanceof OnboardingError) {
    return Response.json(
      { ok: false, error: error.message, fields: error.fields },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    { ok: false, error: "ONBOARDING_REQUEST_FAILED" },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}
