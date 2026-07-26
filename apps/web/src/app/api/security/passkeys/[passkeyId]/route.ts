import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { removeSafePasskey, renameSafePasskey } from "@/lib/security-passkeys";
import { stepUpGrantFromRequest } from "@/lib/security-step-up";

export async function DELETE(request: Request, { params }: { params: Promise<{ passkeyId: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { passkeyId } = await params;
  try {
    const result = await removeSafePasskey(context, passkeyId, stepUpGrantFromRequest(request));
    return result.ok ? Response.json(result) : Response.json(result, { status: result.error === "NOT_FOUND" ? 404 : 409 });
  } catch {
    return Response.json({ ok: false, error: "STEP_UP_REQUIRED" }, { status: 428 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ passkeyId: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { passkeyId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const found = await renameSafePasskey(context, passkeyId, String(body.label || ""));
    return found ? Response.json({ ok: true }) : Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  } catch {
    return Response.json({ ok: false, error: "PASSKEY_LABEL_INVALID" }, { status: 422 });
  }
}
