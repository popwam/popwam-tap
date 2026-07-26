import { listFriends } from "@/lib/friends-domain";
import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  const url = new URL(request.url);
  try {
    const result = await listFriends(auth.user.id, friendsLocale(url.searchParams.get("locale")), url.searchParams.get("cursor"));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

