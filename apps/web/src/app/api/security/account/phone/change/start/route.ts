import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { startPhoneChange } from "@/lib/security-account";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const body = await request.json().catch(() => ({}));
  try {
    const result = await startPhoneChange(request, context, {
      phone: String(body.phone || ""),
      countryIso2: typeof body.countryIso2 === "string" ? body.countryIso2 : undefined,
      locale: body.locale === "ar" ? "ar" : "en",
      channel: body.channel === "whatsapp" ? "whatsapp" : body.channel === "sms" ? "sms" : undefined,
    }, stepUpGrantFromRequest(request));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PHONE_CHANGE_UNAVAILABLE";
    return Response.json({ ok: false, error: code }, { status: code === "STEP_UP_REQUIRED" ? 428 : 422 });
  }
}
