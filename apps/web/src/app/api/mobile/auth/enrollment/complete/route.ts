import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { completeEnrollment, enrollmentErrorResponse } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-enrollment-complete", 10)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  }
  const body = await request.json().catch(() => ({})) as { deviceName?: unknown; idempotencyKey?: unknown };
  try {
    const response = await completeEnrollment(
      request,
      typeof body.idempotencyKey === "string" ? body.idempotencyKey : "",
      typeof body.deviceName === "string" ? body.deviceName.slice(0, 120) : undefined,
      request.headers.get("x-pop-app-version") || undefined,
    );
    return Response.json(response, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}
