import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createDeviceBindingChallenge, enrollmentErrorResponse } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-enrollment-device-options", 20)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  }
  try {
    const result = await createDeviceBindingChallenge(request);
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}

