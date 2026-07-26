import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { getFriendsSettings, updateFriendsSettings } from "@/lib/friends-domain";
import { parseFriendsSettingsPatch } from "@/lib/friends-policy";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  const locale = friendsLocale(new URL(request.url).searchParams.get("locale"));
  try {
    return Response.json({ ok: true, ...(await getFriendsSettings(auth.user.id, locale)) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

export async function PATCH(request: Request) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const body = await request.json().catch(() => null);
  const patch = parseFriendsSettingsPatch(body);
  if (!patch) return Response.json({ ok: false, error: "FRIENDS_SETTINGS_INVALID" }, { status: 400 });
  try {
    const result = await updateFriendsSettings(auth.user.id, friendsLocale((body as Record<string, unknown>)?.locale), patch);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return friendsError(error);
  }
}

