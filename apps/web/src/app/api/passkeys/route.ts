import { getCurrentPopSessionContext, unauthorized } from "@/lib/api-auth";
import { listSafePasskeys } from "@/lib/security-passkeys";

/** Compatibility alias. The projection uses opaque management IDs and never
 * exposes WebAuthn credential IDs or raw database identifiers. */
export async function GET(request: Request) {
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  return Response.json({ passkeys: await listSafePasskeys(context.user.id) }, { headers: { "cache-control": "no-store" } });
}
