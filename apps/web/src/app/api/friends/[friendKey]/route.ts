import { friendsError, friendsUser } from "@/lib/friends-api";
import { parseFriendPreferencePatch, parseSocialKey } from "@/lib/friends-policy";
import { removeFriend, updateFriendPreference } from "@/lib/friends-domain";

export async function PATCH(request: Request, { params }: { params: Promise<{ friendKey: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const { friendKey } = await params;
  const key = parseSocialKey(friendKey);
  const patch = parseFriendPreferencePatch(await request.json().catch(() => null));
  if (!key || !patch) return Response.json({ ok: false, error: "FRIEND_PREFERENCE_INVALID" }, { status: 400 });
  try {
    const preference = await updateFriendPreference(auth.user.id, key, patch);
    return Response.json({ ok: true, preference });
  } catch (error) {
    return friendsError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ friendKey: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const { friendKey } = await params;
  const key = parseSocialKey(friendKey);
  if (!key) return friendsError(new Error("RELATIONSHIP_UNAVAILABLE"));
  try {
    const result = await removeFriend(auth.user.id, key);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return friendsError(error);
  }
}

