import { disableNearby, enableNearbyPresence, refreshNearbyPresence } from "@/lib/nearby-domain";
import { nearbyChannel, nearbyError, nearbyLocale, nearbyUser } from "@/lib/nearby-api";
import { parseNearbyPresenceInput } from "@/lib/nearby-policy";

export async function POST(request: Request) {
  const auth = await nearbyUser(request, true);
  if (!auth.user) return auth.response!;
  const body = await request.json().catch(() => null);
  const input = parseNearbyPresenceInput(body);
  if (!input) return nearbyError(new Error("NEARBY_LOCATION_INVALID"));
  const locale = nearbyLocale(new URL(request.url).searchParams.get("locale"));
  try {
    const session = input.action === "ENABLE"
      ? await enableNearbyPresence(auth.user.id, locale, input, nearbyChannel(request))
      : await refreshNearbyPresence(auth.user.id, locale, input);
    return Response.json({ ok: true, session }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return nearbyError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await nearbyUser(request, true);
  if (!auth.user) return auth.response!;
  try {
    return Response.json({ ok: true, ...(await disableNearby(auth.user.id, nearbyChannel(request))) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return nearbyError(error);
  }
}
