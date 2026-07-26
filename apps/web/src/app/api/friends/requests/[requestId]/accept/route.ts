import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { respondToFriendRequest } from "@/lib/friends-domain";
import { dispatchFriendNotification } from "@/lib/friends-notifications";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await respondToFriendRequest(auth.user.id, requestId, "ACCEPT", friendsLocale(body.locale));
    if (result.notificationEventId) await dispatchFriendNotification(result.notificationEventId);
    return Response.json({ ok: true, state: result.state, idempotent: result.idempotent });
  } catch (error) {
    return friendsError(error);
  }
}

