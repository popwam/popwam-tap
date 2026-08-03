import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createEnrollmentPasskeyOptions, enrollmentErrorResponse } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-enrollment-passkey-options", 20)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  }
  try {
    const result = await createEnrollmentPasskeyOptions(request);
    return Response.json(result.completed ? { ok: true, idempotent: true, ...result.decision } : result.options, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}

