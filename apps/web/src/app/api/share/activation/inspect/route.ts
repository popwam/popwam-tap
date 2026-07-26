import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { inspectScratchActivation } from "@/lib/share-center";

export async function POST(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  if (!authRequestAllowed(request, "share-activation-inspect", 30, 15 * 60_000)) {
    return Response.json({ ok: false, error: "ACTIVATION_COOLDOWN" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await inspectScratchActivation(user.id, String(body.identifier || ""));
  return Response.json(result, { status: result.ok ? 200 : 400, headers: { "cache-control": "no-store" } });
}

