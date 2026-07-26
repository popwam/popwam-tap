import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { parseStepUpMethod, parseStepUpPurpose, verifyOtpStepUp, verifyPasskeyStepUp } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  if (!authRequestAllowed(request, "security-step-up-verify", 30)) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const purpose = parseStepUpPurpose(body.purpose);
  const method = parseStepUpMethod(body.method);
  if (!purpose || !method) return Response.json({ ok: false, error: "STEP_UP_INVALID" }, { status: 400 });
  try {
    const result = method === "PASSKEY"
      ? await verifyPasskeyStepUp(context, purpose, (body.assertion || null) as AuthenticationResponseJSON | null)
      : await verifyOtpStepUp(context, purpose, String(body.challengeId || ""), String(body.code || "").replace(/\D/g, ""));
    return result
      ? Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } })
      : Response.json({ ok: false, error: "STEP_UP_INVALID" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_INVALID" }, { status: 400 });
  }
}
