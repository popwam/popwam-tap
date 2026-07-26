import { csrfRejected, getCurrentPopUser, isTrustedPopMutation, unauthorized } from "@/lib/api-auth";
import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { claimScratchActivation } from "@/lib/share-center";

export async function POST(request: Request) {
  const user = await getCurrentPopUser(request);
  if (!user) return unauthorized();
  if (!isTrustedPopMutation(request)) return csrfRejected();
  if (!authRequestAllowed(request, "share-activation-claim", 12, 15 * 60_000)) {
    return Response.json({ ok: false, error: "ACTIVATION_COOLDOWN" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await claimScratchActivation(request, user.id, {
    identifier: String(body.identifier || ""),
    scratchSecret: String(body.scratchSecret || ""),
    profileId: String(body.profileId || ""),
    targetId: String(body.targetId || "profile"),
    locale: body.locale === "ar" ? "ar" : "en",
  });
  return Response.json({ ...result, status: undefined }, { status: result.status, headers: { "cache-control": "no-store" } });
}
