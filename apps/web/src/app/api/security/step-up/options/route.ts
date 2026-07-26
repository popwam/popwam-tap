import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createPasskeyStepUpOptions, parseStepUpMethod, parseStepUpPurpose, sendOtpStepUp, stepUpOptions } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  if (!authRequestAllowed(request, "security-step-up-options", 20)) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const purpose = parseStepUpPurpose(body.purpose);
  if (!purpose) return Response.json({ ok: false, error: "PURPOSE_INVALID" }, { status: 400 });
  const method = parseStepUpMethod(body.method);
  try {
    if (!method) return Response.json({ ok: true, ...(await stepUpOptions(context, purpose)) }, { headers: { "cache-control": "no-store" } });
    const available = await stepUpOptions(context, purpose);
    if (!available.methods.includes(method)) return Response.json({ ok: false, error: "METHOD_UNAVAILABLE" }, { status: 409 });
    if (method === "PASSKEY") {
      return Response.json({ ok: true, purpose, method, options: await createPasskeyStepUpOptions(context, purpose) }, { headers: { "cache-control": "no-store" } });
    }
    const sent = await sendOtpStepUp(request, context, purpose, body.locale === "ar" ? "ar" : "en", body.channel === "whatsapp" ? "whatsapp" : body.channel === "sms" ? "sms" : undefined);
    return Response.json(sent, { status: sent.ok ? 200 : sent.error === "OTP_COOLDOWN" || sent.error === "OTP_LIMIT_REACHED" ? 429 : 503, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "STEP_UP_UNAVAILABLE";
    return Response.json({ ok: false, error: code }, { status: code === "SESSION_CONTEXT_UPGRADE_REQUIRED" ? 409 : 503 });
  }
}
