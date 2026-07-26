import { unauthorized, getCurrentPopUser } from "@/lib/api-auth";
import { onboardingApiError, onboardingLocale } from "@/lib/dynamic-onboarding-api";
import { getCurrentDynamicOnboarding } from "@/lib/dynamic-onboarding";

export async function GET(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  try {
    const locale = onboardingLocale(new URL(request.url).searchParams.get("locale"));
    return Response.json(
      { ok: true, ...(await getCurrentDynamicOnboarding(user.id, locale)) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return onboardingApiError(error);
  }
}
