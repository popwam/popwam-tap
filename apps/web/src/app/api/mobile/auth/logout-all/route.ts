import { getCurrentPopSessionContext, unauthorized } from "@/lib/api-auth";
import { revokeEverySession } from "@/lib/security-inventory";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

/** Android compatibility alias using the same POP bearer and security policy. */
export async function POST(request: Request) {
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  try {
    return Response.json({ ok: true, ...(await revokeEverySession(context, stepUpGrantFromRequest(request))) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
