import { friendsUser } from "@/lib/friends-api";
import { getRelationshipForTarget } from "@/lib/friends-domain";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  const url = new URL(request.url);
  const result = await getRelationshipForTarget(auth.user.id, url.searchParams.get("targetKey"), url.searchParams.get("profile"));
  return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
}

