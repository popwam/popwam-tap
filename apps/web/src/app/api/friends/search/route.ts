import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { searchFriends } from "@/lib/friends-domain";
import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  if (!authRequestAllowed(request, "friend-search", 30, 60_000)) return Response.json({ ok: false, error: "SEARCH_RATE_LIMITED" }, { status: 429 });
  const url = new URL(request.url);
  try {
    const result = await searchFriends(auth.user.id, friendsLocale(url.searchParams.get("locale")), url.searchParams.get("q"), url.searchParams.get("cursor"));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

