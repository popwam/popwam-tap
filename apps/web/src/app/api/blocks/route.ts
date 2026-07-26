import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { blockUser, listBlockedUsers } from "@/lib/friends-domain";
import { friendReportCategories } from "@/lib/friends-policy";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  try {
    return Response.json({ ok: true, blocks: await listBlockedUsers(auth.user.id, friendsLocale(new URL(request.url).searchParams.get("locale"))) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

export async function POST(request: Request) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const body = await request.json().catch(() => ({}));
  const category = typeof body.category === "string" && friendReportCategories.includes(body.category as never) ? body.category : null;
  try {
    const result = await blockUser(auth.user.id, {
      targetKey: typeof body.targetKey === "string" ? body.targetKey : null,
      profileSlug: typeof body.profileSlug === "string" ? body.profileSlug : null,
      category,
      source: body.source === "NEARBY" ? "NEARBY" : body.source === "REPORT" ? "REPORT" : body.source === "PROFILE" ? "PROFILE" : "FRIENDS",
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return friendsError(error);
  }
}
