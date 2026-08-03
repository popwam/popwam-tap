import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { authenticateDeviceCredential } from "@/lib/mobile-enrollment";

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-device-auth-verify", 12)) return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  try {
    const response = await authenticateDeviceCredential({
      challengeId: typeof body?.challengeId === "string" ? body.challengeId.slice(0, 80) : "",
      proof: {
        challenge: typeof body?.challenge === "string" ? body.challenge : "",
        credentialId: typeof body?.credentialId === "string" ? body.credentialId : "",
        publicKey: typeof body?.publicKey === "string" ? body.publicKey : "",
        signature: typeof body?.signature === "string" ? body.signature : "",
        biometricType: typeof body?.biometricType === "string" ? body.biometricType : "",
      },
      deviceName: typeof body?.deviceName === "string" ? body.deviceName.slice(0, 120) : undefined,
      appVersion: request.headers.get("x-pop-app-version") || undefined,
    });
    return Response.json(response, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const value = error instanceof Error ? error.message : "DEVICE_AUTHENTICATION_FAILED";
    const code = ["AUTH_CHALLENGE_INVALID", "AUTH_CHALLENGE_EXPIRED", "AUTH_CHALLENGE_REPLAYED", "DEVICE_CREDENTIAL_UNAVAILABLE", "DEVICE_BINDING_FAILED"].includes(value) ? value : "DEVICE_AUTHENTICATION_FAILED";
    return Response.json({ ok: false, error: code }, { status: code === "AUTH_CHALLENGE_EXPIRED" ? 410 : 400, headers: { "cache-control": "no-store" } });
  }
}
