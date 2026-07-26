import { nearbyStatus } from "@/lib/nearby-domain";
import { nearbyError, nearbyLocale, nearbyUser } from "@/lib/nearby-api";

export async function GET(request: Request) {
  const auth = await nearbyUser(request);
  if (!auth.user) return auth.response!;
  try {
    const locale = nearbyLocale(new URL(request.url).searchParams.get("locale"));
    return Response.json({ ok: true, ...(await nearbyStatus(auth.user.id, locale)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return nearbyError(error);
  }
}
