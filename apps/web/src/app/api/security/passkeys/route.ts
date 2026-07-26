import { getCurrentPopSessionContext, unauthorized } from "@/lib/api-auth";
import { listSafePasskeys } from "@/lib/security-passkeys";

export async function GET(request: Request) {
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  return Response.json({ ok: true, passkeys: await listSafePasskeys(context.user.id) }, { headers: { "cache-control": "no-store" } });
}
