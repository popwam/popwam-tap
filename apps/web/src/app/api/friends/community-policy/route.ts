import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { acceptCommunityPolicy, communityPolicyStatus } from "@/lib/friends-domain";

export async function GET(request: Request) {
  const auth = await friendsUser(request);
  if (!auth.user) return auth.response!;
  try {
    return Response.json({ ok: true, policy: await communityPolicyStatus(auth.user.id, friendsLocale(new URL(request.url).searchParams.get("locale"))) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return friendsError(error);
  }
}

export async function POST(request: Request) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  const body = await request.json().catch(() => ({}));
  const locale = friendsLocale(body.locale);
  try {
    const policy = await acceptCommunityPolicy(auth.user.id, locale, request.headers.get("authorization")?.startsWith("Bearer ") ? "ANDROID" : "WEB");
    return Response.json({ ok: true, policy });
  } catch (error) {
    return friendsError(error);
  }
}

