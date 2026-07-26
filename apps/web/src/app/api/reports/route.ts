import { authRequestAllowed } from "@/lib/auth-request-rate-limit";
import { friendsError, friendsLocale, friendsUser } from "@/lib/friends-api";
import { reportUser } from "@/lib/friends-domain";
import { parseReportInput } from "@/lib/friends-policy";

export async function POST(request: Request) {
  const auth = await friendsUser(request, true);
  if (!auth.user) return auth.response!;
  if (!authRequestAllowed(request, "friend-report", 10, 24 * 60 * 60_000)) return friendsError(new Error("REPORT_LIMITED"));
  const body = await request.json().catch(() => ({}));
  const parsed = parseReportInput(body.category, body.details);
  if (!parsed) return Response.json({ ok: false, error: "REPORT_INVALID" }, { status: 400 });
  try {
    const result = await reportUser(auth.user.id, {
      targetKey: typeof body.targetKey === "string" ? body.targetKey : null,
      profileSlug: typeof body.profileSlug === "string" ? body.profileSlug : null,
      category: parsed.category,
      details: parsed.details,
      source: body.source === "NEARBY" ? "NEARBY" : body.source === "PROFILE" ? "PROFILE" : "FRIENDS",
    }, friendsLocale(body.locale));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return friendsError(error);
  }
}
