import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { revokeEverySession } from "@/lib/security-inventory";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

/** Compatibility alias. Full logout remains distinct from revoke-others and
 * now carries the same purpose-bound assurance requirement. */
export async function POST(request: Request) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  try {
    return Response.json({ ok: true, ...(await revokeEverySession(context, stepUpGrantFromRequest(request))) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
