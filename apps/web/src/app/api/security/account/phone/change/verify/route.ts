import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { verifyPhoneChange } from "@/lib/security-account";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const ok = await verifyPhoneChange(context, String(body.challengeId || ""), String(body.code || "").replace(/\D/g, ""));
  return ok ? Response.json({ ok: true }) : Response.json({ ok: false, error: "OTP_INVALID" }, { status: 400 });
}
