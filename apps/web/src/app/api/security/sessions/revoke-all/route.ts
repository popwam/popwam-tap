import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { revokeEverySession } from "@/lib/security-inventory";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  try {
    const result = await revokeEverySession(context, stepUpGrantFromRequest(request));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
