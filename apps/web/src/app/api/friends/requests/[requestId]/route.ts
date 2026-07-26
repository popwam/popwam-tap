import { friendsError, friendsUser } from "@/lib/friends-api";
import { cancelFriendRequest } from "@/lib/friends-domain";

export async function DELETE(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const { requestId } = await params;
  try {
    const result = await cancelFriendRequest(auth.user.id, requestId);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return friendsError(error);
  }
}

