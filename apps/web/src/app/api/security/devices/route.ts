import { getCurrentPopSessionContext, unauthorized } from "@/lib/api-auth";
import { projectSecurityInventory } from "@/lib/security-inventory";

export async function GET(request: Request) {
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const { devices } = await projectSecurityInventory(context);
  return Response.json({ ok: true, devices }, { headers: { "cache-control": "no-store" } });
}
