import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { removeSafePasskey } from "@/lib/security-passkeys";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

/** Compatibility alias for the Phase H passkey-management endpoint. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { id } = await params;
  try {
    const result = await removeSafePasskey(context, id, stepUpGrantFromRequest(request));
    return result.ok ? Response.json(result) : Response.json(result, { status: result.error === "NOT_FOUND" ? 404 : 409 });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}
