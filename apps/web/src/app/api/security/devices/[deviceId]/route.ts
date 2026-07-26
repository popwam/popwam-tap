import { csrfRejected, getCurrentPopSessionContext, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { renameProjectedDevice } from "@/lib/security-inventory";

export async function PATCH(request: Request, { params }: { params: Promise<{ deviceId: string }> }) {
  if (!isTrustedPopMutation(request)) return csrfRejected();
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { deviceId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const found = await renameProjectedDevice(context, deviceId, String(body.label || ""));
    return found ? Response.json({ ok: true }) : Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  } catch {
    return Response.json({ ok: false, error: "DEVICE_LABEL_INVALID" }, { status: 422 });
  }
}
