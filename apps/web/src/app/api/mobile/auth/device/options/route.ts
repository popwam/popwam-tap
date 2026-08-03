import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createDeviceAuthenticationOptions } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-device-auth-options", 20)) return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  const body = await request.json().catch(() => null) as { challengeId?: unknown; credentialId?: unknown } | null;
  try {
    const result = await createDeviceAuthenticationOptions({
      challengeId: typeof body?.challengeId === "string" ? body.challengeId.slice(0, 80) : "",
      credentialId: typeof body?.credentialId === "string" ? body.credentialId.slice(0, 120) : "",
    });
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && ["AUTH_METHOD_NOT_ALLOWED", "DEVICE_CREDENTIAL_UNAVAILABLE"].includes(error.message) ? error.message : "DEVICE_AUTHENTICATION_UNAVAILABLE";
    return Response.json({ ok: false, error: code }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}

