import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { enrollmentErrorResponse, verifyDeviceBinding } from "@/lib/mobile-enrollment";

const safeDeviceCode = (error: unknown) => {
  const code = error instanceof Error ? error.message : "DEVICE_BINDING_FAILED";
  return ["DEVICE_BINDING_CHALLENGE_EXPIRED", "DEVICE_BINDING_CHALLENGE_INVALID", "DEVICE_BINDING_CHALLENGE_REPLAYED", "DEVICE_BINDING_FAILED"].includes(code)
    ? code
    : "DEVICE_BINDING_FAILED";
};

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-enrollment-device-verify", 12)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  }
  const body = await request.json().catch(() => null);
  try {
    const result = await verifyDeviceBinding(request, body);
    return Response.json({ ok: true, idempotent: result.idempotent, ...result.decision }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("ENROLLMENT_") || error.message === "PASSKEY_ENROLLMENT_REQUIRED")) return enrollmentErrorResponse(error);
    return Response.json({ ok: false, error: safeDeviceCode(error) }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

