import { getCurrentPopSessionContext, unauthorized } from "@/lib/api-auth";
import { projectSecurityInventory } from "@/lib/security-inventory";

export async function GET(request: Request) {
  const context = await getCurrentPopSessionContext(request);
  if (!context) return unauthorized();
  const inventory = await projectSecurityInventory(context);
  return Response.json({
    ok: true,
    passkey: { configured: inventory.passkeys.length > 0, count: inventory.passkeys.length },
    devices: { active: inventory.devices.filter(device => device.status === "ACTIVE" || device.status === "CURRENT").length },
    sessions: { active: inventory.sessions.length },
    recovery: { phoneVerified: Boolean(context.user.phoneVerifiedAt) },
    account: {
      name: context.user.name || null,
      email: context.user.email || null,
      phone: context.user.phoneE164 || context.user.phone || null,
      phoneVerified: Boolean(context.user.phoneVerifiedAt),
      locale: context.user.locale || null,
      status: "ACTIVE",
    },
    currentSessionContext: context.bindingHash ? "AVAILABLE" : "UPGRADE_REQUIRED",
  }, { headers: { "cache-control": "no-store" } });
}
