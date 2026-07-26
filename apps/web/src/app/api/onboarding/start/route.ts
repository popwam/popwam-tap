import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { startDynamicOnboarding } from "@/lib/dynamic-onboarding";
import { onboardingApiError, onboardingLocale, unexpectedKeys } from "@/lib/dynamic-onboarding-api";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || unexpectedKeys(body, ["locale"])) {
    return Response.json({ ok: false, error: "ONBOARDING_REQUEST_INVALID" }, { status: 400 });
  }
  try {
    return Response.json({ ok: true, ...(await startDynamicOnboarding(user.id, onboardingLocale(body.locale))) });
  } catch (error) {
    return onboardingApiError(error);
  }
}
