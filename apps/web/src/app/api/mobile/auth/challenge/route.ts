import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createMobileAuthChallenge } from "@/lib/mobile-enrollment";
import { normalizePhone } from "@/lib/phone";

const noStore = { "cache-control": "no-store" };

export async function POST(request: Request) {
  if (!authRequestAllowed(request, "mobile-auth-v2-challenge", 8, 60_000)) {
    return Response.json({ ok: false, error: "AUTH_RATE_LIMITED" }, { status: 429, headers: { ...noStore, "retry-after": "60" } });
  }
  const body = await request.json().catch(() => null) as { phoneE164?: unknown; deviceCredentialId?: unknown; contractVersion?: unknown } | null;
  if (body?.contractVersion !== 2) return Response.json({ ok: false, error: "AUTH_CONTRACT_VERSION_UNSUPPORTED" }, { status: 400, headers: noStore });
  const normalized = normalizePhone(typeof body.phoneE164 === "string" ? body.phoneE164 : "");
  if (!normalized.valid) return Response.json({ ok: false, error: normalized.error }, { status: 400, headers: noStore });
  try {
    const challenge = await createMobileAuthChallenge({
      phoneE164: normalized.e164,
      deviceCredentialId: typeof body.deviceCredentialId === "string" ? body.deviceCredentialId.slice(0, 120) : undefined,
    });
    return Response.json({ ok: true, ...challenge }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "AUTH_CHALLENGE_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}
