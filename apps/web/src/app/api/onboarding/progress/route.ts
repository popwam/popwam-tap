import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { saveDynamicOnboardingProgress } from "@/lib/dynamic-onboarding";
import { onboardingApiError, onboardingLocale, unexpectedKeys } from "@/lib/dynamic-onboarding-api";
import { parseAnswerPayload } from "@/lib/dynamic-onboarding-policy";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const answers = parseAnswerPayload(body?.answers);
  if (!body || unexpectedKeys(body, ["locale", "revision", "stepKey", "direction", "answers"]) ||
    typeof body.revision !== "number" || !Number.isInteger(body.revision) || typeof body.stepKey !== "string" ||
    !["BACK", "CONTINUE", "STAY"].includes(String(body.direction)) || !answers) {
    return Response.json({ ok: false, error: "ONBOARDING_REQUEST_INVALID" }, { status: 400 });
  }
  try {
    return Response.json({
      ok: true,
      ...(await saveDynamicOnboardingProgress({
        userId: user.id,
        locale: onboardingLocale(body.locale),
        revision: Number(body.revision),
        stepKey: body.stepKey,
        direction: body.direction as "BACK" | "CONTINUE" | "STAY",
        answers,
      })),
    });
  } catch (error) {
    return onboardingApiError(error);
  }
}
