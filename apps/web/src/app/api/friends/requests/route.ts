import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { createFriendRequest, listFriendRequests } from "@/lib/friends-domain";
import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { dispatchFriendNotification } from "@/lib/friends-notifications";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  const url = new URL(request.url);
  try {
    const result = await listFriendRequests(auth.user.id, friendsLocale(url.searchParams.get("locale")), url.searchParams.get("cursor"));
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

export async function POST(request: Request) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  if (!authRequestAllowed(request, "friend-request-create", 30, 60 * 60_000)) return friendsError(new Error("FRIEND_REQUEST_LIMITED"));
  const body = await request.json().catch(() => ({}));
  try {
    const result = await createFriendRequest(
      auth.user.id,
      String(body.targetKey || ""),
      body.source === "NEARBY" ? "NEARBY" : body.source === "PROFILE" ? "PROFILE" : "SEARCH",
      friendsLocale(body.locale),
    );
    if (result.notificationEventId) await dispatchFriendNotification(result.notificationEventId);
    return Response.json({ ok: true, state: result.state, idempotent: result.idempotent }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}
