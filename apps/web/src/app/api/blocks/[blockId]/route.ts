import { friendsError, friendsUser } from "@/lib/friends-api";
import { unblockUser } from "@/lib/friends-domain";

export async function DELETE(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  try {
    return Response.json({ ok: true, ...(await unblockUser(auth.user.id, (await params).blockId)) });
  } catch (error) {
    return friendsError(error);
  }
}

