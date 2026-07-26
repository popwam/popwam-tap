import { isAdminRole } from "@/lib/admin-access";
import { getApiUser } from "@/lib/api-auth";
import { nearbyOperationalStatus } from "@/lib/nearby-domain";

export async function GET() {
  const admin = await getApiUser();
  if (!admin || !isAdminRole(admin.role)) return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  return Response.json({ ok: true, ...(await nearbyOperationalStatus()) }, { headers: { "cache-control": "no-store" } });
}
