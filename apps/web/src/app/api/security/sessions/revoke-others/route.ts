import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { revokeOtherSessions } from "@/lib/security-inventory";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  try {
    const result = await revokeOtherSessions(context, stepUpGrantFromRequest(request));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "SESSION_CONTEXT_UPGRADE_REQUIRED" ? "SESSION_CONTEXT_UPGRADE_REQUIRED" : "STEP_UP_REQUIRED";
    return Response.json({ ok: false, error: code }, { status: code === "STEP_UP_REQUIRED" ? 428 : 409 });
  }
}
