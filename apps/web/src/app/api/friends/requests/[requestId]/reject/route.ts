import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { respondToFriendRequest } from "@/lib/friends-domain";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await respondToFriendRequest(auth.user.id, requestId, "REJECT", friendsLocale(body.locale));
    return Response.json({ ok: true, state: result.state, idempotent: result.idempotent });
  } catch (error) {
    return friendsError(error);
  }
}

