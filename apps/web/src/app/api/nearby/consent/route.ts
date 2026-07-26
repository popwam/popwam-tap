import { acceptNearbyConsent, revokeNearbyConsent } from "@/lib/nearby-domain";
import { nearbyChannel, nearbyError, nearbyLocale, nearbyUser } from "@/lib/nearby-api";

export async function POST(request: Request) {
  const auth = await nearbyUser(request, true);
  if (!auth.user) return auth.response!;
  const body = await request.json().catch(() => ({}));
  try {
    return Response.json({
      ok: true,
      consent: await acceptNearbyConsent(auth.user.id, nearbyLocale(body.locale), nearbyChannel(request)),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return nearbyError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await nearbyUser(request, true);
  if (!auth.user) return auth.response!;
  const locale = nearbyLocale(new URL(request.url).searchParams.get("locale"));
  try {
    return Response.json({ ok: true, ...(await revokeNearbyConsent(auth.user.id, locale)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return nearbyError(error);
  }
}
