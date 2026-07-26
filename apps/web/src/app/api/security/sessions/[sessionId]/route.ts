import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { revokeProjectedSession } from "@/lib/security-inventory";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { sessionId } = await params;
  try {
    const result = await revokeProjectedSession(context, sessionId, stepUpGrantFromRequest(request));
    return result.found
      ? Response.json({ ok: true, current: result.current, fcmCleanup: result.fcmCleanup })
      : Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
