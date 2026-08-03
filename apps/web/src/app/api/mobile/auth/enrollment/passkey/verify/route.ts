import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { enrollmentErrorResponse, verifyEnrollmentPasskey } from "@/lib/mobile-enrollment";

const safePasskeyCode = (error: unknown) => {
  const code = error instanceof Error ? error.message : "PASSKEY_VERIFICATION_FAILED";
  return ["PASSKEY_CHALLENGE_INVALID", "PASSKEY_CHALLENGE_REPLAYED", "PASSKEY_VERIFICATION_FAILED"].includes(code)
    ? code
    : "PASSKEY_VERIFICATION_FAILED";
};

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-enrollment-passkey-verify", 12)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  }
  const body = await request.json().catch(() => null);
  try {
    const result = await verifyEnrollmentPasskey(request, body);
    return Response.json({ ok: true, idempotent: result.idempotent, ...result.decision }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ENROLLMENT_")) return enrollmentErrorResponse(error);
    return Response.json({ ok: false, error: safePasskeyCode(error) }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

